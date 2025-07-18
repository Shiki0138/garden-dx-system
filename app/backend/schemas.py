"""
Garden 造園業向け統合業務管理システム
Pydantic スキーマ定義
API入出力データ検証
"""

from pydantic import BaseModel, validator, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal

# =============================================================================
# 基本スキーマ
# =============================================================================

class CompanyBase(BaseModel):
    company_name: str = Field(..., description="会社名")
    address: Optional[str] = Field(None, description="住所")
    phone: Optional[str] = Field(None, description="電話番号")
    email: Optional[str] = Field(None, description="メールアドレス")

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    company_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# =============================================================================
# 顧客関連スキーマ
# =============================================================================

class CustomerBase(BaseModel):
    customer_name: str = Field(..., description="顧客名")
    customer_type: str = Field(default="個人", description="顧客種別")
    postal_code: Optional[str] = Field(None, description="郵便番号")
    address: Optional[str] = Field(None, description="住所")
    phone: Optional[str] = Field(None, description="電話番号")
    email: Optional[str] = Field(None, description="メールアドレス")
    notes: Optional[str] = Field(None, description="備考")

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    customer_id: int
    company_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# =============================================================================
# 単価マスタ関連スキーマ
# =============================================================================

class PriceMasterBase(BaseModel):
    category: str = Field(..., description="大カテゴリ")
    sub_category: Optional[str] = Field(None, description="中カテゴリ")
    item_name: str = Field(..., description="品目名")
    unit: str = Field(..., description="単位")
    purchase_price: int = Field(..., description="仕入単価")
    default_markup_rate: float = Field(default=1.300, description="標準掛率")
    notes: Optional[str] = Field(None, description="備考")

class PriceMasterCreate(PriceMasterBase):
    pass

class PriceMasterUpdate(BaseModel):
    category: Optional[str] = None
    sub_category: Optional[str] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[int] = None
    default_markup_rate: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class PriceMaster(PriceMasterBase):
    item_id: int
    company_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class PriceMasterSearch(BaseModel):
    category: Optional[str] = None
    sub_category: Optional[str] = None
    search_keyword: Optional[str] = None
    is_active: bool = True

# =============================================================================
# 見積明細関連スキーマ
# =============================================================================

class EstimateItemBase(BaseModel):
    item_description: str = Field(..., description="品目・摘要")
    specification: Optional[str] = Field(None, description="仕様")
    quantity: Optional[float] = Field(None, description="数量")
    unit: Optional[str] = Field(None, description="単位")
    purchase_price: Optional[int] = Field(None, description="仕入単価")
    markup_rate: Optional[float] = Field(None, description="掛率")
    unit_price: Optional[int] = Field(None, description="提出単価")
    line_item_adjustment: int = Field(default=0, description="明細調整額")
    level: int = Field(default=0, description="階層レベル")
    sort_order: int = Field(..., description="表示順")
    item_type: str = Field(default="item", description="項目種別")
    is_free_entry: bool = Field(default=False, description="自由入力フラグ")
    is_visible_to_customer: bool = Field(default=True, description="顧客表示フラグ")

class EstimateItemCreate(EstimateItemBase):
    price_master_item_id: Optional[int] = Field(None, description="単価マスタ品目ID")
    parent_item_id: Optional[int] = Field(None, description="親項目ID")

class EstimateItemUpdate(BaseModel):
    item_description: Optional[str] = None
    specification: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purchase_price: Optional[int] = None
    markup_rate: Optional[float] = None
    unit_price: Optional[int] = None
    line_item_adjustment: Optional[int] = None
    level: Optional[int] = None
    sort_order: Optional[int] = None
    item_type: Optional[str] = None
    is_visible_to_customer: Optional[bool] = None

class EstimateItem(EstimateItemBase):
    item_id: int
    estimate_id: int
    price_master_item_id: Optional[int] = None
    parent_item_id: Optional[int] = None
    line_total: Optional[int] = None
    line_cost: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# =============================================================================
# 見積関連スキーマ
# =============================================================================

class EstimateBase(BaseModel):
    estimate_number: str = Field(..., description="見積番号")
    estimate_name: str = Field(..., description="見積名")
    site_address: Optional[str] = Field(None, description="現場住所")
    estimate_date: date = Field(..., description="見積日")
    valid_until: Optional[date] = Field(None, description="見積有効期限")
    notes: Optional[str] = Field(None, description="備考")
    terms_and_conditions: Optional[str] = Field(None, description="約款・注意事項")

class EstimateCreate(EstimateBase):
    customer_id: int = Field(..., description="顧客ID")

class EstimateUpdate(BaseModel):
    estimate_name: Optional[str] = None
    site_address: Optional[str] = None
    estimate_date: Optional[date] = None
    valid_until: Optional[date] = None
    adjustment_amount: Optional[int] = None
    adjustment_rate: Optional[float] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    status: Optional[str] = None

class Estimate(EstimateBase):
    estimate_id: int
    company_id: int
    customer_id: int
    status: str
    subtotal_amount: int
    adjustment_amount: int
    adjustment_rate: float
    total_amount: int
    total_cost: int
    gross_profit: int
    gross_profit_rate: float
    created_at: datetime
    updated_at: datetime
    
    # リレーション
    items: List[EstimateItem] = []
    customer: Optional[Customer] = None
    
    class Config:
        from_attributes = True

# =============================================================================
# 分析・レポート関連スキーマ
# =============================================================================

class ProfitabilityAnalysis(BaseModel):
    """収益性分析レスポンス"""
    total_cost: int = Field(..., description="総原価")
    total_revenue: int = Field(..., description="総売上（小計）")
    gross_profit: int = Field(..., description="粗利額")
    gross_profit_rate: float = Field(..., description="粗利率")
    adjusted_total: int = Field(..., description="調整後合計")
    final_profit: int = Field(..., description="最終利益")
    final_profit_rate: float = Field(..., description="最終利益率")
    
    # 項目別分析
    category_breakdown: Optional[Dict[str, Dict[str, Any]]] = Field(None, description="カテゴリ別内訳")

class EstimateSearchParams(BaseModel):
    status: Optional[str] = None
    customer_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search_keyword: Optional[str] = None
    
class BulkItemOperation(BaseModel):
    """一括操作用スキーマ"""
    operation: str = Field(..., description="操作種別（reorder/delete/update）")
    item_ids: List[int] = Field(..., description="対象明細ID一覧")
    new_sort_orders: Optional[List[int]] = Field(None, description="新しい表示順（reorder時）")

class CategoryStats(BaseModel):
    """カテゴリ統計情報"""
    category: str
    sub_category: Optional[str]
    item_count: int
    avg_markup_rate: float
    min_price: int
    max_price: int