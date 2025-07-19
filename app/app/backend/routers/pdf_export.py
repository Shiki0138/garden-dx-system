"""
Garden 造園業向け統合業務管理システム
PDF出力ルーター - 造園業界標準準拠
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from typing import Dict, Any
import logging
from datetime import datetime

from database import get_db
from models import Estimate, EstimateItem, Customer, Company
from services.pdf_generator import GardenEstimatePDFGenerator

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/{estimate_id}/pdf")
async def generate_estimate_pdf(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """
    造園業界標準準拠見積書PDF生成・ダウンロード
    
    Args:
        estimate_id: 見積ID
        
    Returns:
        PDF バイナリレスポンス
    """
    try:
        # 見積データ取得（必要な関連データを含む）
        estimate = db.query(Estimate)\
                    .options(
                        joinedload(Estimate.customer),
                        joinedload(Estimate.company),
                        joinedload(Estimate.items).joinedload(EstimateItem.price_master)
                    )\
                    .filter(Estimate.estimate_id == estimate_id)\
                    .first()
        
        if not estimate:
            raise HTTPException(status_code=404, detail="見積が見つかりません")
        
        # PDF生成用データ構造に変換
        pdf_data = _prepare_pdf_data(estimate)
        
        # PDF生成
        pdf_generator = GardenEstimatePDFGenerator()
        pdf_buffer = pdf_generator.generate_estimate_pdf(pdf_data)
        
        # PDFファイル名生成
        filename = f"見積書_{estimate.estimate_number}_{estimate.customer.customer_name}.pdf"
        
        # HTTPレスポンス
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
                "Content-Type": "application/pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"PDF生成エラー (見積ID: {estimate_id}): {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"PDF生成中にエラーが発生しました: {str(e)}"
        )

@router.get("/{estimate_id}/preview")
async def preview_estimate_data(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """
    見積書PDF生成プレビューデータ取得
    実際のPDF出力前の確認用
    """
    try:
        estimate = db.query(Estimate)\
                    .options(
                        joinedload(Estimate.customer),
                        joinedload(Estimate.company),
                        joinedload(Estimate.items).joinedload(EstimateItem.price_master)
                    )\
                    .filter(Estimate.estimate_id == estimate_id)\
                    .first()
        
        if not estimate:
            raise HTTPException(status_code=404, detail="見積が見つかりません")
        
        # プレビュー用データ準備
        preview_data = _prepare_pdf_data(estimate)
        
        # 追加のプレビュー情報
        preview_data["preview_info"] = {
            "total_items": len([item for item in estimate.items if item.item_type == 'item']),
            "total_categories": len(set([
                item.price_master.category if item.price_master else 'その他'
                for item in estimate.items if item.item_type == 'item'
            ])),
            "has_adjustments": estimate.adjustment_amount != 0,
            "tax_calculation": {
                "subtotal": float(estimate.subtotal_amount or 0),
                "adjustment": float(estimate.adjustment_amount or 0),
                "tax_rate": 0.10,
                "tax_amount": int((estimate.subtotal_amount + estimate.adjustment_amount) * 0.10),
                "total_with_tax": int((estimate.subtotal_amount + estimate.adjustment_amount) * 1.10)
            }
        }
        
        return preview_data
        
    except Exception as e:
        logger.error(f"プレビューデータ取得エラー (見積ID: {estimate_id}): {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"プレビューデータ取得中にエラーが発生しました: {str(e)}"
        )

def _prepare_pdf_data(estimate: Estimate) -> Dict[str, Any]:
    """
    EstimateモデルからPDF生成用データ構造に変換
    
    Args:
        estimate: 見積モデルインスタンス
        
    Returns:
        PDF生成用辞書データ
    """
    # 顧客情報
    customer_data = {
        "customer_name": estimate.customer.customer_name if estimate.customer else "",
        "address": estimate.customer.address if estimate.customer else "",
        "phone": estimate.customer.phone if estimate.customer else "",
        "email": estimate.customer.email if estimate.customer else "",
    }
    
    # 会社情報
    company_data = {
        "company_name": estimate.company.company_name if estimate.company else "",
        "address": estimate.company.address if estimate.company else "",
        "phone": estimate.company.phone if estimate.company else "",
        "email": estimate.company.email if estimate.company else "",
        "logo_url": estimate.company.logo_url if estimate.company else None,
    }
    
    # 見積明細情報（階層構造保持）
    items_data = []
    for item in sorted(estimate.items, key=lambda x: x.sort_order):
        item_dict = {
            "item_id": item.item_id,
            "item_type": item.item_type,
            "item_description": item.item_description,
            "specification": item.specification,
            "quantity": float(item.quantity) if item.quantity else 0,
            "unit": item.unit,
            "purchase_price": int(item.purchase_price) if item.purchase_price else 0,
            "markup_rate": float(item.markup_rate) if item.markup_rate else 0,
            "unit_price": int(item.unit_price) if item.unit_price else 0,
            "line_item_adjustment": int(item.line_item_adjustment) if item.line_item_adjustment else 0,
            "line_total": int(item.line_total) if item.line_total else 0,
            "line_cost": int(item.line_cost) if item.line_cost else 0,
            "level": item.level,
            "sort_order": item.sort_order,
            "is_visible_to_customer": item.is_visible_to_customer,
            "category": item.price_master.category if item.price_master else "その他",
            "sub_category": item.price_master.sub_category if item.price_master else None,
        }
        items_data.append(item_dict)
    
    # 見積基本情報
    pdf_data = {
        "estimate_id": estimate.estimate_id,
        "estimate_number": estimate.estimate_number,
        "estimate_name": estimate.estimate_name,
        "site_address": estimate.site_address,
        "estimate_date": estimate.estimate_date.isoformat() if estimate.estimate_date else None,
        "valid_until": estimate.valid_until.isoformat() if estimate.valid_until else None,
        "status": estimate.status,
        
        # 金額情報
        "subtotal_amount": int(estimate.subtotal_amount or 0),
        "adjustment_amount": int(estimate.adjustment_amount or 0),
        "adjustment_rate": float(estimate.adjustment_rate or 0),
        "total_amount": int(estimate.total_amount or 0),
        "total_cost": int(estimate.total_cost or 0),
        "gross_profit": int(estimate.gross_profit or 0),
        "gross_profit_rate": float(estimate.gross_profit_rate or 0),
        
        # 備考・条件
        "notes": estimate.notes,
        "terms_and_conditions": estimate.terms_and_conditions,
        
        # 関連データ
        "customer": customer_data,
        "company": company_data,
        "items": items_data,
        
        # PDF生成日時
        "generated_at": datetime.now().isoformat(),
    }
    
    return pdf_data

@router.post("/{estimate_id}/email-pdf")
async def email_estimate_pdf(
    estimate_id: int,
    email_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    見積書PDF生成・メール送信
    ※ 現在の仕様ではメール機能は未実装のため、将来拡張用
    """
    # 現在は実装しないが、将来的にメール送信機能を追加する場合の準備
    raise HTTPException(
        status_code=501,
        detail="メール送信機能は現在未実装です"
    )

# 便利関数：複数見積の一括PDF生成（将来拡張用）
@router.post("/bulk-pdf")
async def generate_bulk_estimates_pdf(
    estimate_ids: list[int],
    db: Session = Depends(get_db)
):
    """
    複数見積書の一括PDF生成
    ※ 将来的な機能拡張用
    """
    raise HTTPException(
        status_code=501,
        detail="一括PDF生成機能は今後実装予定です"
    )