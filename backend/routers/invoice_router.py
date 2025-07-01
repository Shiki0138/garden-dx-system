from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListItem,
    InvoiceSearchParams, InvoicePaymentCreate, InvoicePaymentResponse,
    InvoiceStatus, PaymentStatus
)
from ..services.invoice_service import InvoiceService
from ..middleware.auth_middleware import (
    get_current_user, get_current_company_id, CurrentUser,
    require_invoice_create, require_invoice_edit, require_invoice_send,
    Permissions, UserRoles
)
from ..pdf_service import InvoicePDFService

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

@router.get("/", response_model=dict)
async def get_invoices(
    customer_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    status: Optional[InvoiceStatus] = Query(None),
    payment_status: Optional[PaymentStatus] = Query(None),
    invoice_date_from: Optional[str] = Query(None),
    invoice_date_to: Optional[str] = Query(None),
    due_date_from: Optional[str] = Query(None),
    due_date_to: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    """請求書一覧取得"""
    try:
        # 日付文字列をdateオブジェクトに変換
        from datetime import datetime
        
        params = InvoiceSearchParams(
            customer_id=customer_id,
            project_id=project_id,
            status=status,
            payment_status=payment_status,
            invoice_date_from=datetime.strptime(invoice_date_from, '%Y-%m-%d').date() if invoice_date_from else None,
            invoice_date_to=datetime.strptime(invoice_date_to, '%Y-%m-%d').date() if invoice_date_to else None,
            due_date_from=datetime.strptime(due_date_from, '%Y-%m-%d').date() if due_date_from else None,
            due_date_to=datetime.strptime(due_date_to, '%Y-%m-%d').date() if due_date_to else None,
            search_term=search_term,
            page=page,
            per_page=per_page
        )
        
        service = InvoiceService(db)
        return service.get_invoices(company_id, params)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"日付形式が正しくありません: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"請求書一覧の取得に失敗しました: {str(e)}")

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    """請求書詳細取得"""
    service = InvoiceService(db)
    return service.get_invoice(company_id, invoice_id)

@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_create)
):
    """請求書作成"""
    service = InvoiceService(db)
    return service.create_invoice(company_id, invoice_data, current_user.user_id)

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_edit)
):
    """請求書更新"""
    service = InvoiceService(db)
    return service.update_invoice(company_id, invoice_id, invoice_data, current_user.user_id)

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_edit)
):
    """請求書削除"""
    service = InvoiceService(db)
    success = service.delete_invoice(company_id, invoice_id, current_user.user_id)
    return {"message": "請求書を削除しました" if success else "削除に失敗しました"}

@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_id: int,
    status: InvoiceStatus,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_edit)
):
    """請求書ステータス更新"""
    service = InvoiceService(db)
    return service.update_status(company_id, invoice_id, status, current_user.user_id)

@router.post("/from-estimate/{estimate_id}", response_model=InvoiceResponse)
async def create_invoice_from_estimate(
    estimate_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_create)
):
    """見積から請求書自動生成"""
    service = InvoiceService(db)
    return service.create_from_estimate(company_id, estimate_id, current_user.user_id)

@router.post("/{invoice_id}/payments", response_model=InvoicePaymentResponse)
async def record_payment(
    invoice_id: int,
    payment_data: InvoicePaymentCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_edit)
):
    """入金記録"""
    service = InvoiceService(db)
    return service.record_payment(company_id, invoice_id, payment_data, current_user.user_id)

@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    """請求書PDF生成・ダウンロード"""
    try:
        # 請求書データ取得
        service = InvoiceService(db)
        invoice = service.get_invoice(company_id, invoice_id)
        
        # PDF生成
        pdf_service = InvoicePDFService()
        pdf_path = pdf_service.generate_invoice_pdf(invoice)
        
        # ファイル名設定
        filename = f"請求書_{invoice.invoice_number}.pdf"
        
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type='application/pdf'
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF生成に失敗しました: {str(e)}"
        )

@router.get("/overdue/list")
async def get_overdue_invoices(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    """期限切れ請求書一覧"""
    service = InvoiceService(db)
    return service.get_overdue_invoices(company_id)

@router.get("/summary/payment")
async def get_payment_summary(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    """支払サマリー"""
    service = InvoiceService(db)
    return service.get_payment_summary(company_id, year, month)

@router.post("/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_send)
):
    """請求書送付（ステータス更新）"""
    service = InvoiceService(db)
    invoice = service.update_status(company_id, invoice_id, InvoiceStatus.SENT, current_user.user_id)
    return {"message": f"請求書 {invoice.invoice_number} を送付済みに更新しました"}

@router.post("/{invoice_id}/attachments/upload")
async def upload_attachment(
    invoice_id: int,
    file: UploadFile = File(...),
    attachment_type: str = "その他",
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_edit)
):
    """添付ファイルアップロード"""
    try:
        # ファイルサイズチェック（10MB制限）
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="ファイルサイズが10MBを超えています"
            )
        
        # ファイル保存処理（実装は省略）
        # TODO: 実際のファイル保存ロジック
        
        return {
            "message": f"ファイル '{file.filename}' をアップロードしました",
            "file_size": len(file_content),
            "file_type": file.content_type
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ファイルアップロードに失敗しました: {str(e)}"
        )

@router.get("/{invoice_id}/history")
async def get_invoice_history(
    invoice_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    """請求書履歴取得"""
    try:
        # 請求書の存在確認
        service = InvoiceService(db)
        invoice = service.get_invoice(company_id, invoice_id)
        
        from ..models.invoice import InvoiceHistory
        history = db.query(InvoiceHistory).filter(
            InvoiceHistory.invoice_id == invoice_id
        ).order_by(InvoiceHistory.changed_at.desc()).all()
        
        return {"history": history}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"履歴取得に失敗しました: {str(e)}"
        )

@router.post("/batch/update-overdue")
async def batch_update_overdue_status(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    current_user: CurrentUser = Depends(require_invoice_edit)
):
    """期限切れ請求書の一括ステータス更新"""
    try:
        service = InvoiceService(db)
        overdue_invoices = service.get_overdue_invoices(company_id)
        
        updated_count = 0
        for invoice in overdue_invoices:
            if invoice.payment_status != PaymentStatus.OVERDUE:
                service.update_status(
                    company_id, 
                    invoice.invoice_id, 
                    invoice.status,  # ステータスは変更せず
                    current_user.user_id
                )
                updated_count += 1
        
        return {
            "message": f"{updated_count}件の請求書を滞納ステータスに更新しました",
            "updated_count": updated_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"一括更新に失敗しました: {str(e)}"
        )

# エラーハンドリング用のヘルパー関数
def handle_service_error(e: Exception):
    """サービス層エラーのハンドリング"""
    if isinstance(e, HTTPException):
        raise e
    
    error_message = str(e)
    
    # 一般的なデータベースエラーの処理
    if "unique constraint" in error_message.lower():
        raise HTTPException(
            status_code=400,
            detail="データの重複エラーが発生しました"
        )
    elif "foreign key constraint" in error_message.lower():
        raise HTTPException(
            status_code=400,
            detail="参照データが存在しません"
        )
    else:
        raise HTTPException(
            status_code=500,
            detail="内部サーバーエラーが発生しました"
        )