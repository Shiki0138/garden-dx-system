"""
Garden 造園業向け統合業務管理システム
SQLAlchemyモデル定義
仕様書準拠のマルチテナント対応データベース設計
"""

from sqlalchemy import Column, Integer, String, DateTime, Decimal, Boolean, Text, ForeignKey, Date, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class Company(Base):
    """会社マスタ（マルチテナント対応）"""
    __tablename__ = "companies"
    
    company_id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    logo_url = Column(String(500))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # リレーション
    customers = relationship("Customer", back_populates="company")
    price_masters = relationship("PriceMaster", back_populates="company")
    estimates = relationship("Estimate", back_populates="company")

class Customer(Base):
    """顧客マスタ"""
    __tablename__ = "customers"
    
    customer_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_type = Column(String(50), default="個人")  # 個人/法人
    postal_code = Column(String(10))
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # リレーション
    company = relationship("Company", back_populates="customers")
    estimates = relationship("Estimate", back_populates="customer")
    
    # インデックス
    __table_args__ = (
        Index('idx_customers_company', 'company_id'),
        Index('idx_customers_name', 'customer_name'),
    )

class PriceMaster(Base):
    """単価マスタ（階層構造対応）"""
    __tablename__ = "price_master"
    
    item_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    category = Column(String(100), nullable=False)  # 大カテゴリ
    sub_category = Column(String(100))  # 中カテゴリ
    item_name = Column(String(255), nullable=False)  # 品目名
    unit = Column(String(20), nullable=False)  # 単位
    purchase_price = Column(Decimal(10, 0), nullable=False)  # 仕入単価
    default_markup_rate = Column(Decimal(5, 3), nullable=False, default=1.300)  # 標準掛率
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # リレーション
    company = relationship("Company", back_populates="price_masters")
    estimate_items = relationship("EstimateItem", back_populates="price_master")
    
    # インデックス
    __table_args__ = (
        Index('idx_price_master_company', 'company_id'),
        Index('idx_price_master_category', 'category', 'sub_category'),
        Index('idx_price_master_search', 'item_name', 'category'),
    )

class Estimate(Base):
    """見積テーブル"""
    __tablename__ = "estimates"
    
    estimate_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    estimate_number = Column(String(50), nullable=False)  # 見積番号
    estimate_name = Column(String(255), nullable=False)  # 見積名
    site_address = Column(Text)  # 現場住所
    status = Column(String(50), default="作成中")  # 作成中/提出済/承認/失注/キャンセル
    estimate_date = Column(Date, nullable=False)
    valid_until = Column(Date)  # 見積有効期限
    
    # 金額計算項目
    subtotal_amount = Column(Decimal(12, 0), default=0)  # 小計
    adjustment_amount = Column(Decimal(12, 0), default=0)  # 調整額
    adjustment_rate = Column(Decimal(5, 3), default=0)  # 調整率
    total_amount = Column(Decimal(12, 0), default=0)  # 最終見積金額
    total_cost = Column(Decimal(12, 0), default=0)  # 総原価
    gross_profit = Column(Decimal(12, 0), default=0)  # 粗利額
    gross_profit_rate = Column(Decimal(5, 3), default=0)  # 粗利率
    
    # 備考・条件
    notes = Column(Text)
    terms_and_conditions = Column(Text)  # 約款・注意事項
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # リレーション
    company = relationship("Company", back_populates="estimates")
    customer = relationship("Customer", back_populates="estimates")
    items = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    history = relationship("EstimateHistory", back_populates="estimate")
    
    # インデックス
    __table_args__ = (
        Index('idx_estimates_company', 'company_id'),
        Index('idx_estimates_customer', 'customer_id'),
        Index('idx_estimates_number', 'estimate_number'),
        Index('idx_estimates_status', 'status'),
        Index('unique_estimate_number', 'company_id', 'estimate_number', unique=True),
    )

class EstimateItem(Base):
    """見積明細テーブル（階層構造対応）"""
    __tablename__ = "estimate_items"
    
    item_id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.estimate_id", ondelete="CASCADE"), nullable=False)
    price_master_item_id = Column(Integer, ForeignKey("price_master.item_id"), nullable=True)  # NULL可（自由入力）
    
    # 階層構造
    parent_item_id = Column(Integer, ForeignKey("estimate_items.item_id"), nullable=True)
    level = Column(Integer, default=0)  # 階層レベル
    sort_order = Column(Integer, nullable=False, default=0)  # 表示順
    item_type = Column(String(20), default="item")  # header/item/subtotal
    
    # 品目情報
    item_description = Column(String(255), nullable=False)  # 品目・摘要
    specification = Column(Text)  # 仕様
    quantity = Column(Decimal(10, 2), default=0)  # 数量
    unit = Column(String(20))  # 単位
    
    # 価格情報
    purchase_price = Column(Decimal(10, 0), default=0)  # 仕入単価
    markup_rate = Column(Decimal(5, 3), default=1.300)  # 掛率
    unit_price = Column(Decimal(10, 0), default=0)  # 提出単価
    line_item_adjustment = Column(Decimal(10, 0), default=0)  # 明細調整額
    line_total = Column(Decimal(12, 0), default=0)  # 行合計
    line_cost = Column(Decimal(12, 0), default=0)  # 行原価
    
    # フラグ
    is_free_entry = Column(Boolean, default=False)  # 自由入力項目か
    is_visible_to_customer = Column(Boolean, default=True)  # 顧客向け表示
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # リレーション
    estimate = relationship("Estimate", back_populates="items")
    price_master = relationship("PriceMaster", back_populates="estimate_items")
    parent = relationship("EstimateItem", remote_side=[item_id])
    children = relationship("EstimateItem")
    
    # インデックス
    __table_args__ = (
        Index('idx_estimate_items_estimate', 'estimate_id'),
        Index('idx_estimate_items_sort', 'estimate_id', 'sort_order'),
        Index('idx_estimate_items_hierarchy', 'parent_item_id', 'level'),
    )

class EstimateHistory(Base):
    """見積履歴テーブル（変更追跡用）"""
    __tablename__ = "estimate_history"
    
    history_id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.estimate_id"), nullable=False)
    change_type = Column(String(50), nullable=False)  # created/updated/submitted/approved
    change_description = Column(Text)
    changed_by = Column(Integer)  # ユーザーID（将来の拡張用）
    old_values = Column(Text)  # JSON形式で変更前の値
    new_values = Column(Text)  # JSON形式で変更後の値
    created_at = Column(DateTime, default=func.now())
    
    # リレーション
    estimate = relationship("Estimate", back_populates="history")