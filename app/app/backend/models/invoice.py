from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from enum import Enum

from sqlalchemy import Column, Integer, String, Text, DECIMAL, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship, Session
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field, validator

Base = declarative_base()

class InvoiceStatus(str, Enum):
    """請求書ステータス"""
    DRAFT = "未送付"
    SENT = "送付済"
    CONFIRMED = "確認済"
    CANCELLED = "キャンセル"

class PaymentStatus(str, Enum):
    """支払ステータス"""
    UNPAID = "未払い"
    PAID = "支払済"
    PARTIAL = "一部支払"
    OVERDUE = "滞納"

class PaymentMethod(str, Enum):
    """支払方法"""
    BANK_TRANSFER = "銀行振込"
    CASH = "現金"
    CHECK = "小切手"
    CREDIT_CARD = "クレジットカード"
    OTHER = "その他"

# ====================
# SQLAlchemy Models
# ====================

class Invoice(Base):
    """請求書モデル"""
    __tablename__ = "invoices"

    invoice_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    estimate_id = Column(Integer, ForeignKey("estimates.estimate_id"), nullable=True)
    
    # 請求書基本情報
    invoice_number = Column(String(50), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    
    # 金額情報
    subtotal = Column(DECIMAL(12, 0), nullable=False, default=0)
    tax_rate = Column(DECIMAL(5, 3), nullable=False, default=0.10)
    tax_amount = Column(DECIMAL(12, 0), nullable=False, default=0)
    total_amount = Column(DECIMAL(12, 0), nullable=False, default=0)
    
    # ステータス管理
    status = Column(String(50), nullable=False, default=InvoiceStatus.DRAFT)
    payment_status = Column(String(50), nullable=False, default=PaymentStatus.UNPAID)
    
    # 支払情報
    paid_amount = Column(DECIMAL(12, 0), default=0)
    paid_date = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=True)
    
    # その他
    notes = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)
    
    # システム管理
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # リレーションシップ
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    history = relationship("InvoiceHistory", back_populates="invoice")
    payments = relationship("InvoicePayment", back_populates="invoice")
    attachments = relationship("InvoiceAttachment", back_populates="invoice")
    
    # 制約
    __table_args__ = (
        CheckConstraint(status.in_([s.value for s in InvoiceStatus]), name="check_invoice_status"),
        CheckConstraint(payment_status.in_([s.value for s in PaymentStatus]), name="check_payment_status"),
    )

class InvoiceItem(Base):
    """請求書明細モデル"""
    __tablename__ = "invoice_items"

    item_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=False)
    
    # 品目情報
    category = Column(String(100), nullable=True)
    sub_category = Column(String(100), nullable=True)
    item_name = Column(String(255), nullable=False)
    item_description = Column(Text, nullable=True)
    
    # 数量・単価
    quantity = Column(DECIMAL(10, 2), nullable=False, default=0)
    unit = Column(String(20), nullable=True)
    unit_price = Column(DECIMAL(10, 0), nullable=False, default=0)
    amount = Column(DECIMAL(12, 0), nullable=False, default=0)
    
    # 表示順序・階層
    sort_order = Column(Integer, default=0)
    level = Column(Integer, default=1)
    is_header = Column(Boolean, default=False)
    
    # 備考
    notes = Column(Text, nullable=True)
    
    # システム管理
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーションシップ
    invoice = relationship("Invoice", back_populates="items")

class InvoiceHistory(Base):
    """請求書履歴モデル"""
    __tablename__ = "invoice_history"

    history_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=False)
    
    # 変更情報
    action = Column(String(50), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    old_payment_status = Column(String(50), nullable=True)
    new_payment_status = Column(String(50), nullable=True)
    
    # 変更詳細
    change_summary = Column(Text, nullable=True)
    change_details = Column(Text, nullable=True)  # JSON文字列
    
    # システム管理
    changed_at = Column(DateTime, default=datetime.utcnow)
    changed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # 備考
    notes = Column(Text, nullable=True)
    
    # リレーションシップ
    invoice = relationship("Invoice", back_populates="history")

class InvoicePayment(Base):
    """入金管理モデル"""
    __tablename__ = "invoice_payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=False)
    
    # 入金情報
    payment_amount = Column(DECIMAL(12, 0), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String(50), nullable=False, default=PaymentMethod.BANK_TRANSFER)
    
    # 振込情報
    bank_name = Column(String(100), nullable=True)
    account_info = Column(String(100), nullable=True)
    transaction_id = Column(String(100), nullable=True)
    
    # 備考
    notes = Column(Text, nullable=True)
    
    # システム管理
    recorded_at = Column(DateTime, default=datetime.utcnow)
    recorded_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # リレーションシップ
    invoice = relationship("Invoice", back_populates="payments")

class InvoiceAttachment(Base):
    """請求書添付ファイルモデル"""
    __tablename__ = "invoice_attachments"

    attachment_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=False)
    
    # ファイル情報
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(50), nullable=True)
    mime_type = Column(String(100), nullable=True)
    
    # 分類
    attachment_type = Column(String(50), nullable=False, default="その他")
    
    # 説明
    description = Column(Text, nullable=True)
    
    # システム管理
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # リレーションシップ
    invoice = relationship("Invoice", back_populates="attachments")

# ====================
# Pydantic Schemas
# ====================

class InvoiceItemBase(BaseModel):
    """請求書明細ベーススキーマ"""
    category: Optional[str] = None
    sub_category: Optional[str] = None
    item_name: str
    item_description: Optional[str] = None
    quantity: Decimal = Field(default=Decimal('0'), ge=0)
    unit: Optional[str] = None
    unit_price: Decimal = Field(default=Decimal('0'), ge=0)
    amount: Decimal = Field(default=Decimal('0'), ge=0)
    sort_order: int = 0
    level: int = 1
    is_header: bool = False
    notes: Optional[str] = None

    @validator('amount', always=True)
    def calculate_amount(cls, v, values):
        """金額の自動計算"""
        quantity = values.get('quantity', Decimal('0'))
        unit_price = values.get('unit_price', Decimal('0'))
        return quantity * unit_price

class InvoiceItemCreate(InvoiceItemBase):
    """請求書明細作成スキーマ"""
    pass

class InvoiceItemUpdate(InvoiceItemBase):
    """請求書明細更新スキーマ"""
    item_name: Optional[str] = None

class InvoiceItemResponse(InvoiceItemBase):
    """請求書明細レスポンススキーマ"""
    item_id: int
    invoice_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    """請求書ベーススキーマ"""
    project_id: Optional[int] = None
    customer_id: Optional[int] = None
    estimate_id: Optional[int] = None
    invoice_number: str = Field(..., max_length=50)
    invoice_date: date
    due_date: date
    tax_rate: Decimal = Field(default=Decimal('0.10'), ge=0, le=1)
    status: InvoiceStatus = InvoiceStatus.DRAFT
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None

    @validator('invoice_number')
    def validate_invoice_number(cls, v):
        """請求書番号のバリデーション"""
        if not v or len(v.strip()) == 0:
            raise ValueError('請求書番号は必須です')
        return v.strip()

    @validator('due_date')
    def validate_due_date(cls, v, values):
        """支払期限のバリデーション"""
        invoice_date = values.get('invoice_date')
        if invoice_date and v < invoice_date:
            raise ValueError('支払期限は請求日以降の日付を設定してください')
        return v

class InvoiceCreate(InvoiceBase):
    """請求書作成スキーマ"""
    items: List[InvoiceItemCreate] = []

class InvoiceUpdate(InvoiceBase):
    """請求書更新スキーマ"""
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    items: Optional[List[InvoiceItemCreate]] = None

class InvoiceResponse(InvoiceBase):
    """請求書レスポンススキーマ"""
    invoice_id: int
    company_id: int
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Optional[Decimal] = None
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True

class InvoiceListItem(BaseModel):
    """請求書一覧アイテムスキーマ"""
    invoice_id: int
    invoice_number: str
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    invoice_date: date
    due_date: date
    total_amount: Decimal
    status: InvoiceStatus
    payment_status: PaymentStatus
    outstanding_amount: Decimal

    class Config:
        from_attributes = True

class InvoicePaymentCreate(BaseModel):
    """入金記録作成スキーマ"""
    payment_amount: Decimal = Field(..., gt=0)
    payment_date: date
    payment_method: PaymentMethod = PaymentMethod.BANK_TRANSFER
    bank_name: Optional[str] = None
    account_info: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

class InvoicePaymentResponse(InvoicePaymentCreate):
    """入金記録レスポンススキーマ"""
    payment_id: int
    invoice_id: int
    recorded_at: datetime
    recorded_by: Optional[int] = None

    class Config:
        from_attributes = True

class InvoiceSearchParams(BaseModel):
    """請求書検索パラメータ"""
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    status: Optional[InvoiceStatus] = None
    payment_status: Optional[PaymentStatus] = None
    invoice_date_from: Optional[date] = None
    invoice_date_to: Optional[date] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    search_term: Optional[str] = None  # 請求書番号、顧客名での検索
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)

# ====================
# 業務ロジック関数
# ====================

def calculate_invoice_totals(items: List[InvoiceItemCreate], tax_rate: Decimal = Decimal('0.10')) -> Dict[str, Decimal]:
    """請求書合計金額の計算"""
    subtotal = sum(item.amount for item in items)
    tax_amount = (subtotal * tax_rate).quantize(Decimal('0'))
    total_amount = subtotal + tax_amount
    
    return {
        'subtotal': subtotal,
        'tax_amount': tax_amount,
        'total_amount': total_amount
    }

def generate_invoice_number(db: Session, company_id: int) -> str:
    """請求書番号の自動生成"""
    today = datetime.now().date()
    year_month = today.strftime('%Y%m')
    
    # 当月の最大連番を取得
    last_invoice = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.invoice_number.like(f'INV-{year_month}-%')
    ).order_by(Invoice.invoice_number.desc()).first()
    
    if last_invoice:
        # 最後の番号から連番を取得
        last_number = int(last_invoice.invoice_number.split('-')[-1])
        sequence = last_number + 1
    else:
        sequence = 1
    
    return f'INV-{year_month}-{sequence:03d}'

def check_overdue_invoices(db: Session, company_id: int) -> List[Invoice]:
    """期限切れ請求書の確認"""
    today = datetime.now().date()
    
    overdue_invoices = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.payment_status == PaymentStatus.UNPAID,
        Invoice.due_date < today
    ).all()
    
    # ステータスを自動更新
    for invoice in overdue_invoices:
        invoice.payment_status = PaymentStatus.OVERDUE
    
    db.commit()
    return overdue_invoices