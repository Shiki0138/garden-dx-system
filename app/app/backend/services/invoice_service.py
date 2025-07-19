from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from fastapi import HTTPException, status

from ..models.invoice import (
    Invoice, InvoiceItem, InvoiceHistory, InvoicePayment,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListItem,
    InvoiceSearchParams, InvoicePaymentCreate,
    InvoiceStatus, PaymentStatus,
    calculate_invoice_totals, generate_invoice_number, check_overdue_invoices
)

class InvoiceService:
    """請求書サービスクラス"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_invoices(self, company_id: int, params: InvoiceSearchParams) -> Dict[str, Any]:
        """請求書一覧取得"""
        query = self.db.query(Invoice).filter(Invoice.company_id == company_id)
        
        # フィルタリング
        if params.customer_id:
            query = query.filter(Invoice.customer_id == params.customer_id)
        
        if params.project_id:
            query = query.filter(Invoice.project_id == params.project_id)
        
        if params.status:
            query = query.filter(Invoice.status == params.status)
        
        if params.payment_status:
            query = query.filter(Invoice.payment_status == params.payment_status)
        
        if params.invoice_date_from:
            query = query.filter(Invoice.invoice_date >= params.invoice_date_from)
        
        if params.invoice_date_to:
            query = query.filter(Invoice.invoice_date <= params.invoice_date_to)
        
        if params.due_date_from:
            query = query.filter(Invoice.due_date >= params.due_date_from)
        
        if params.due_date_to:
            query = query.filter(Invoice.due_date <= params.due_date_to)
        
        if params.search_term:
            search_filter = or_(
                Invoice.invoice_number.ilike(f'%{params.search_term}%'),
                # 顧客名での検索（JOINが必要）
            )
            query = query.filter(search_filter)
        
        # 総件数
        total = query.count()
        
        # ページネーション
        offset = (params.page - 1) * params.per_page
        invoices = query.order_by(desc(Invoice.created_at)).offset(offset).limit(params.per_page).all()
        
        return {
            'items': invoices,
            'total': total,
            'page': params.page,
            'per_page': params.per_page,
            'pages': (total + params.per_page - 1) // params.per_page
        }
    
    def get_invoice(self, company_id: int, invoice_id: int) -> Invoice:
        """請求書詳細取得"""
        invoice = self.db.query(Invoice).filter(
            and_(Invoice.invoice_id == invoice_id, Invoice.company_id == company_id)
        ).first()
        
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="請求書が見つかりません"
            )
        
        return invoice
    
    def create_invoice(self, company_id: int, invoice_data: InvoiceCreate, user_id: Optional[int] = None) -> Invoice:
        """請求書作成"""
        try:
            # 請求書番号の自動生成（指定されていない場合）
            if not invoice_data.invoice_number:
                invoice_data.invoice_number = generate_invoice_number(self.db, company_id)
            
            # 請求書番号の重複チェック
            existing = self.db.query(Invoice).filter(
                and_(
                    Invoice.company_id == company_id,
                    Invoice.invoice_number == invoice_data.invoice_number
                )
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"請求書番号 '{invoice_data.invoice_number}' は既に使用されています"
                )
            
            # 合計金額の計算
            totals = calculate_invoice_totals(invoice_data.items, invoice_data.tax_rate)
            
            # 請求書作成
            db_invoice = Invoice(
                company_id=company_id,
                **invoice_data.dict(exclude={'items'}),
                **totals,
                created_by=user_id,
                updated_by=user_id
            )
            
            self.db.add(db_invoice)
            self.db.flush()  # invoice_idを取得するため
            
            # 明細作成
            for i, item_data in enumerate(invoice_data.items):
                db_item = InvoiceItem(
                    invoice_id=db_invoice.invoice_id,
                    **item_data.dict(),
                    sort_order=i
                )
                self.db.add(db_item)
            
            # 履歴記録
            self._add_history(
                db_invoice.invoice_id,
                "作成",
                f"請求書 {db_invoice.invoice_number} を作成しました",
                user_id
            )
            
            self.db.commit()
            self.db.refresh(db_invoice)
            
            return db_invoice
            
        except Exception as e:
            self.db.rollback()
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"請求書の作成に失敗しました: {str(e)}"
            )
    
    def update_invoice(self, company_id: int, invoice_id: int, invoice_data: InvoiceUpdate, user_id: Optional[int] = None) -> Invoice:
        """請求書更新"""
        try:
            # 既存請求書の取得
            db_invoice = self.get_invoice(company_id, invoice_id)
            
            # 支払済みの場合は編集不可
            if db_invoice.payment_status == PaymentStatus.PAID:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="支払済みの請求書は編集できません"
                )
            
            # 請求書番号の重複チェック（変更時）
            if invoice_data.invoice_number and invoice_data.invoice_number != db_invoice.invoice_number:
                existing = self.db.query(Invoice).filter(
                    and_(
                        Invoice.company_id == company_id,
                        Invoice.invoice_number == invoice_data.invoice_number,
                        Invoice.invoice_id != invoice_id
                    )
                ).first()
                
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"請求書番号 '{invoice_data.invoice_number}' は既に使用されています"
                    )
            
            # 基本情報更新
            update_data = invoice_data.dict(exclude={'items'}, exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_invoice, field, value)
            
            # 明細更新（既存削除→新規作成）
            if invoice_data.items is not None:
                # 既存明細削除
                self.db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
                
                # 新しい明細作成
                for i, item_data in enumerate(invoice_data.items):
                    db_item = InvoiceItem(
                        invoice_id=invoice_id,
                        **item_data.dict(),
                        sort_order=i
                    )
                    self.db.add(db_item)
                
                # 合計金額再計算
                totals = calculate_invoice_totals(invoice_data.items, db_invoice.tax_rate)
                for field, value in totals.items():
                    setattr(db_invoice, field, value)
            
            db_invoice.updated_by = user_id
            
            # 履歴記録
            self._add_history(
                invoice_id,
                "更新",
                f"請求書 {db_invoice.invoice_number} を更新しました",
                user_id
            )
            
            self.db.commit()
            self.db.refresh(db_invoice)
            
            return db_invoice
            
        except Exception as e:
            self.db.rollback()
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"請求書の更新に失敗しました: {str(e)}"
            )
    
    def delete_invoice(self, company_id: int, invoice_id: int, user_id: Optional[int] = None) -> bool:
        """請求書削除"""
        try:
            db_invoice = self.get_invoice(company_id, invoice_id)
            
            # 送付済みまたは支払済みの場合は削除不可
            if db_invoice.status != InvoiceStatus.DRAFT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="送付済みの請求書は削除できません"
                )
            
            # 履歴記録
            self._add_history(
                invoice_id,
                "削除",
                f"請求書 {db_invoice.invoice_number} を削除しました",
                user_id
            )
            
            self.db.delete(db_invoice)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"請求書の削除に失敗しました: {str(e)}"
            )
    
    def update_status(self, company_id: int, invoice_id: int, new_status: InvoiceStatus, user_id: Optional[int] = None) -> Invoice:
        """請求書ステータス更新"""
        try:
            db_invoice = self.get_invoice(company_id, invoice_id)
            old_status = db_invoice.status
            
            db_invoice.status = new_status
            db_invoice.updated_by = user_id
            
            # 履歴記録
            self._add_history(
                invoice_id,
                "ステータス変更",
                f"ステータスを '{old_status}' から '{new_status}' に変更しました",
                user_id
            )
            
            self.db.commit()
            self.db.refresh(db_invoice)
            
            return db_invoice
            
        except Exception as e:
            self.db.rollback()
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"ステータスの更新に失敗しました: {str(e)}"
            )
    
    def record_payment(self, company_id: int, invoice_id: int, payment_data: InvoicePaymentCreate, user_id: Optional[int] = None) -> InvoicePayment:
        """入金記録"""
        try:
            db_invoice = self.get_invoice(company_id, invoice_id)
            
            # 残高チェック
            outstanding = db_invoice.total_amount - (db_invoice.paid_amount or Decimal('0'))
            if payment_data.payment_amount > outstanding:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"入金額が残高を超えています。残高: {outstanding}円"
                )
            
            # 入金記録作成
            db_payment = InvoicePayment(
                invoice_id=invoice_id,
                **payment_data.dict(),
                recorded_by=user_id
            )
            self.db.add(db_payment)
            
            # 請求書の支払情報更新
            new_paid_amount = (db_invoice.paid_amount or Decimal('0')) + payment_data.payment_amount
            db_invoice.paid_amount = new_paid_amount
            
            # 支払ステータス更新
            if new_paid_amount >= db_invoice.total_amount:
                db_invoice.payment_status = PaymentStatus.PAID
                db_invoice.paid_date = payment_data.payment_date
            elif new_paid_amount > 0:
                db_invoice.payment_status = PaymentStatus.PARTIAL
            
            db_invoice.updated_by = user_id
            
            # 履歴記録
            self._add_history(
                invoice_id,
                "入金記録",
                f"{payment_data.payment_amount}円の入金を記録しました（{payment_data.payment_method}）",
                user_id
            )
            
            self.db.commit()
            self.db.refresh(db_payment)
            
            return db_payment
            
        except Exception as e:
            self.db.rollback()
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"入金記録に失敗しました: {str(e)}"
            )
    
    def create_from_estimate(self, company_id: int, estimate_id: int, user_id: Optional[int] = None) -> Invoice:
        """見積から請求書自動生成"""
        try:
            # 見積情報取得（TODO: 見積サービスから取得）
            # estimate = estimate_service.get_estimate(company_id, estimate_id)
            
            # 仮の見積データ（実際は見積サービスから取得）
            estimate_data = {
                'project_id': 1,
                'customer_id': 1,
                'estimate_number': 'EST-2024-001',
                'items': [
                    {
                        'category': '植栽工事',
                        'item_name': 'マツ H3.0 植栽工事',
                        'quantity': Decimal('10'),
                        'unit': '本',
                        'unit_price': Decimal('45000'),
                        'amount': Decimal('450000')
                    }
                ]
            }
            
            # 請求書データ作成
            invoice_data = InvoiceCreate(
                project_id=estimate_data['project_id'],
                customer_id=estimate_data['customer_id'],
                estimate_id=estimate_id,
                invoice_number=generate_invoice_number(self.db, company_id),
                invoice_date=date.today(),
                due_date=date.today().replace(day=28),  # 月末支払い
                items=estimate_data['items']
            )
            
            return self.create_invoice(company_id, invoice_data, user_id)
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"見積からの請求書生成に失敗しました: {str(e)}"
            )
    
    def get_overdue_invoices(self, company_id: int) -> List[Invoice]:
        """期限切れ請求書取得"""
        return check_overdue_invoices(self.db, company_id)
    
    def get_payment_summary(self, company_id: int, year: Optional[int] = None, month: Optional[int] = None) -> Dict[str, Any]:
        """支払サマリー取得"""
        query = self.db.query(Invoice).filter(Invoice.company_id == company_id)
        
        if year:
            query = query.filter(Invoice.invoice_date >= date(year, 1, 1))
            query = query.filter(Invoice.invoice_date <= date(year, 12, 31))
        
        if month:
            query = query.filter(Invoice.invoice_date >= date(year or date.today().year, month, 1))
            next_month = month + 1 if month < 12 else 1
            next_year = year if month < 12 else (year or date.today().year) + 1
            query = query.filter(Invoice.invoice_date < date(next_year, next_month, 1))
        
        invoices = query.all()
        
        total_amount = sum(inv.total_amount for inv in invoices)
        paid_amount = sum(inv.paid_amount or Decimal('0') for inv in invoices)
        outstanding_amount = total_amount - paid_amount
        
        status_summary = {}
        payment_summary = {}
        
        for invoice in invoices:
            # ステータス別集計
            status = invoice.status
            if status not in status_summary:
                status_summary[status] = {'count': 0, 'amount': Decimal('0')}
            status_summary[status]['count'] += 1
            status_summary[status]['amount'] += invoice.total_amount
            
            # 支払状況別集計
            payment_status = invoice.payment_status
            if payment_status not in payment_summary:
                payment_summary[payment_status] = {'count': 0, 'amount': Decimal('0')}
            payment_summary[payment_status]['count'] += 1
            payment_summary[payment_status]['amount'] += invoice.total_amount
        
        return {
            'total_invoices': len(invoices),
            'total_amount': total_amount,
            'paid_amount': paid_amount,
            'outstanding_amount': outstanding_amount,
            'status_summary': status_summary,
            'payment_summary': payment_summary
        }
    
    def _add_history(self, invoice_id: int, action: str, summary: str, user_id: Optional[int] = None):
        """履歴記録"""
        history = InvoiceHistory(
            invoice_id=invoice_id,
            action=action,
            change_summary=summary,
            changed_by=user_id
        )
        self.db.add(history)