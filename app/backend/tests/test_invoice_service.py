import pytest
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ..models.invoice import (
    Invoice, InvoiceItem, InvoiceCreate, InvoiceUpdate,
    InvoiceStatus, PaymentStatus, InvoiceItemCreate
)
from ..services.invoice_service import InvoiceService

class TestInvoiceService:
    """請求書サービステストクラス"""

    def setup_method(self):
        """テスト前の初期化"""
        self.mock_db = Mock(spec=Session)
        self.service = InvoiceService(self.mock_db)
        self.company_id = 1
        self.user_id = 1

    def test_create_invoice_success(self):
        """請求書作成成功テスト"""
        # テストデータ準備
        invoice_data = InvoiceCreate(
            invoice_number="INV-2024-001",
            invoice_date=date.today(),
            due_date=date.today().replace(day=28),
            customer_id=1,
            project_id=1,
            items=[
                InvoiceItemCreate(
                    item_name="植栽工事",
                    quantity=Decimal("10"),
                    unit_price=Decimal("5000"),
                    amount=Decimal("50000")
                )
            ]
        )

        # モック設定
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        self.mock_db.flush = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        self.mock_db.add = Mock()

        # 作成された請求書をモック
        mock_invoice = Mock()
        mock_invoice.invoice_id = 1
        mock_invoice.invoice_number = "INV-2024-001"
        self.mock_db.add.return_value = mock_invoice

        # テスト実行
        result = self.service.create_invoice(self.company_id, invoice_data, self.user_id)

        # 検証
        self.mock_db.add.assert_called()
        self.mock_db.commit.assert_called_once()
        assert self.mock_db.flush.called

    def test_create_invoice_duplicate_number(self):
        """請求書番号重複エラーテスト"""
        # テストデータ準備
        invoice_data = InvoiceCreate(
            invoice_number="INV-2024-001",
            invoice_date=date.today(),
            due_date=date.today().replace(day=28),
            items=[]
        )

        # 既存請求書をモック（重複）
        existing_invoice = Mock()
        existing_invoice.invoice_number = "INV-2024-001"
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_invoice

        # テスト実行・検証
        with pytest.raises(HTTPException) as exc_info:
            self.service.create_invoice(self.company_id, invoice_data, self.user_id)
        
        assert exc_info.value.status_code == 400
        assert "既に使用されています" in str(exc_info.value.detail)

    def test_get_invoice_success(self):
        """請求書取得成功テスト"""
        # モック請求書
        mock_invoice = Mock()
        mock_invoice.invoice_id = 1
        mock_invoice.company_id = self.company_id
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice

        # テスト実行
        result = self.service.get_invoice(self.company_id, 1)

        # 検証
        assert result == mock_invoice

    def test_get_invoice_not_found(self):
        """請求書が見つからない場合のテスト"""
        # モック設定（見つからない）
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        # テスト実行・検証
        with pytest.raises(HTTPException) as exc_info:
            self.service.get_invoice(self.company_id, 999)
        
        assert exc_info.value.status_code == 404
        assert "見つかりません" in str(exc_info.value.detail)

    def test_update_invoice_success(self):
        """請求書更新成功テスト"""
        # 既存請求書をモック
        mock_invoice = Mock()
        mock_invoice.invoice_id = 1
        mock_invoice.company_id = self.company_id
        mock_invoice.payment_status = PaymentStatus.UNPAID
        mock_invoice.invoice_number = "INV-2024-001"
        mock_invoice.tax_rate = Decimal("0.10")

        # モック設定
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()

        # 更新データ
        update_data = InvoiceUpdate(
            notes="更新されたメモ",
            items=[
                InvoiceItemCreate(
                    item_name="更新された項目",
                    quantity=Decimal("5"),
                    unit_price=Decimal("10000"),
                    amount=Decimal("50000")
                )
            ]
        )

        # テスト実行
        result = self.service.update_invoice(self.company_id, 1, update_data, self.user_id)

        # 検証
        self.mock_db.commit.assert_called_once()
        assert hasattr(mock_invoice, 'notes')

    def test_update_paid_invoice_fails(self):
        """支払済み請求書の更新失敗テスト"""
        # 支払済み請求書をモック
        mock_invoice = Mock()
        mock_invoice.payment_status = PaymentStatus.PAID
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice

        # 更新データ
        update_data = InvoiceUpdate(notes="更新")

        # テスト実行・検証
        with pytest.raises(HTTPException) as exc_info:
            self.service.update_invoice(self.company_id, 1, update_data, self.user_id)
        
        assert exc_info.value.status_code == 400
        assert "支払済み" in str(exc_info.value.detail)

    def test_delete_invoice_success(self):
        """請求書削除成功テスト"""
        # 下書き状態の請求書をモック
        mock_invoice = Mock()
        mock_invoice.status = InvoiceStatus.DRAFT
        mock_invoice.invoice_number = "INV-2024-001"
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice
        self.mock_db.commit = Mock()
        self.mock_db.delete = Mock()

        # テスト実行
        result = self.service.delete_invoice(self.company_id, 1, self.user_id)

        # 検証
        assert result is True
        self.mock_db.delete.assert_called_once_with(mock_invoice)
        self.mock_db.commit.assert_called_once()

    def test_delete_sent_invoice_fails(self):
        """送付済み請求書の削除失敗テスト"""
        # 送付済み請求書をモック
        mock_invoice = Mock()
        mock_invoice.status = InvoiceStatus.SENT
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice

        # テスト実行・検証
        with pytest.raises(HTTPException) as exc_info:
            self.service.delete_invoice(self.company_id, 1, self.user_id)
        
        assert exc_info.value.status_code == 400
        assert "送付済み" in str(exc_info.value.detail)

    def test_update_status_success(self):
        """ステータス更新成功テスト"""
        # 請求書をモック
        mock_invoice = Mock()
        mock_invoice.status = InvoiceStatus.DRAFT
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()

        # テスト実行
        result = self.service.update_status(
            self.company_id, 1, InvoiceStatus.SENT, self.user_id
        )

        # 検証
        assert mock_invoice.status == InvoiceStatus.SENT
        self.mock_db.commit.assert_called_once()

    def test_record_payment_success(self):
        """入金記録成功テスト"""
        from ..models.invoice import InvoicePaymentCreate

        # 請求書をモック
        mock_invoice = Mock()
        mock_invoice.total_amount = Decimal("100000")
        mock_invoice.paid_amount = Decimal("0")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        self.mock_db.add = Mock()

        # 入金データ
        payment_data = InvoicePaymentCreate(
            payment_amount=Decimal("50000"),
            payment_date=date.today(),
            payment_method="銀行振込"
        )

        # テスト実行
        result = self.service.record_payment(self.company_id, 1, payment_data, self.user_id)

        # 検証
        assert mock_invoice.paid_amount == Decimal("50000")
        assert mock_invoice.payment_status == PaymentStatus.PARTIAL
        self.mock_db.add.assert_called()
        self.mock_db.commit.assert_called_once()

    def test_record_payment_full_amount(self):
        """全額支払い記録テスト"""
        from ..models.invoice import InvoicePaymentCreate

        # 請求書をモック
        mock_invoice = Mock()
        mock_invoice.total_amount = Decimal("100000")
        mock_invoice.paid_amount = Decimal("0")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        self.mock_db.add = Mock()

        # 全額入金データ
        payment_data = InvoicePaymentCreate(
            payment_amount=Decimal("100000"),
            payment_date=date.today(),
            payment_method="銀行振込"
        )

        # テスト実行
        result = self.service.record_payment(self.company_id, 1, payment_data, self.user_id)

        # 検証
        assert mock_invoice.paid_amount == Decimal("100000")
        assert mock_invoice.payment_status == PaymentStatus.PAID
        assert mock_invoice.paid_date == date.today()

    def test_record_payment_exceed_amount(self):
        """入金額超過エラーテスト"""
        from ..models.invoice import InvoicePaymentCreate

        # 請求書をモック
        mock_invoice = Mock()
        mock_invoice.total_amount = Decimal("100000")
        mock_invoice.paid_amount = Decimal("80000")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_invoice

        # 超過する入金データ
        payment_data = InvoicePaymentCreate(
            payment_amount=Decimal("30000"),  # 残高20000を超過
            payment_date=date.today(),
            payment_method="銀行振込"
        )

        # テスト実行・検証
        with pytest.raises(HTTPException) as exc_info:
            self.service.record_payment(self.company_id, 1, payment_data, self.user_id)
        
        assert exc_info.value.status_code == 400
        assert "残高を超えています" in str(exc_info.value.detail)

    @patch('..services.invoice_service.generate_invoice_number')
    def test_create_from_estimate_success(self, mock_generate_number):
        """見積からの請求書生成成功テスト"""
        # モック設定
        mock_generate_number.return_value = "INV-2024-001"
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        self.mock_db.flush = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        self.mock_db.add = Mock()

        # テスト実行
        result = self.service.create_from_estimate(self.company_id, 1, self.user_id)

        # 検証
        self.mock_db.add.assert_called()
        self.mock_db.commit.assert_called_once()

    def test_get_payment_summary(self):
        """支払サマリー取得テスト"""
        # モック請求書リスト
        mock_invoices = [
            Mock(
                total_amount=Decimal("100000"),
                paid_amount=Decimal("100000"),
                status=InvoiceStatus.SENT,
                payment_status=PaymentStatus.PAID
            ),
            Mock(
                total_amount=Decimal("50000"),
                paid_amount=Decimal("0"),
                status=InvoiceStatus.SENT,
                payment_status=PaymentStatus.UNPAID
            )
        ]

        self.mock_db.query.return_value.filter.return_value.all.return_value = mock_invoices

        # テスト実行
        result = self.service.get_payment_summary(self.company_id)

        # 検証
        assert result['total_invoices'] == 2
        assert result['total_amount'] == Decimal("150000")
        assert result['paid_amount'] == Decimal("100000")
        assert result['outstanding_amount'] == Decimal("50000")

    def test_calculate_invoice_totals(self):
        """請求書合計計算テスト"""
        from ..models.invoice import calculate_invoice_totals

        # テスト明細
        items = [
            InvoiceItemCreate(
                item_name="項目1",
                quantity=Decimal("10"),
                unit_price=Decimal("1000"),
                amount=Decimal("10000")
            ),
            InvoiceItemCreate(
                item_name="項目2",
                quantity=Decimal("5"),
                unit_price=Decimal("2000"),
                amount=Decimal("10000")
            )
        ]

        # テスト実行
        totals = calculate_invoice_totals(items, Decimal("0.10"))

        # 検証
        assert totals['subtotal'] == Decimal("20000")
        assert totals['tax_amount'] == Decimal("2000")
        assert totals['total_amount'] == Decimal("22000")

    def test_generate_invoice_number(self):
        """請求書番号生成テスト"""
        from ..models.invoice import generate_invoice_number

        # 最後の請求書をモック
        mock_last_invoice = Mock()
        mock_last_invoice.invoice_number = "INV-202406-002"
        
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_last_invoice

        # テスト実行
        with patch('..models.invoice.datetime') as mock_datetime:
            mock_datetime.now.return_value.date.return_value.strftime.return_value = "202406"
            result = generate_invoice_number(self.mock_db, self.company_id)

        # 検証（連番が増加している）
        assert "INV-202406-003" == result

    def test_rollback_on_error(self):
        """エラー時のロールバックテスト"""
        # データベースエラーをシミュレート
        self.mock_db.commit.side_effect = Exception("Database error")
        self.mock_db.rollback = Mock()

        invoice_data = InvoiceCreate(
            invoice_number="INV-2024-001",
            invoice_date=date.today(),
            due_date=date.today().replace(day=28),
            items=[]
        )

        # 重複チェックでNoneを返す（正常パス）
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        # テスト実行・検証
        with pytest.raises(HTTPException):
            self.service.create_invoice(self.company_id, invoice_data, self.user_id)

        # ロールバックが呼ばれることを確認
        self.mock_db.rollback.assert_called_once()