"""
造園業向け統合業務管理システム Garden DX
FastAPI バックエンドメイン
"""

from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import os
from dotenv import load_dotenv

# 認証・権限管理サービス
from services.auth_service import (
    get_current_user_dependency, 
    require_permission, 
    require_owner_role,
    apply_estimate_permissions,
    get_user_accessible_features,
    PermissionChecker,
    User
)

# 設定管理API
from api.settings import router as settings_router

load_dotenv()

# FastAPIアプリケーション初期化
app = FastAPI(
    title="Garden DX - 造園業向け統合業務管理システム",
    description="史上最強の造園業向けDXシステム",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベース設定
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/garden_dx")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# セキュリティ
security = HTTPBearer()

# データベース依存関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =============================================================================
# Pydanticモデル（API用）
# =============================================================================

class CompanyBase(BaseModel):
    company_name: str
    postal_code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    company_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PriceMasterBase(BaseModel):
    category: str
    sub_category: Optional[str] = None
    item_name: str
    item_code: Optional[str] = None
    unit: str
    purchase_price: int
    default_markup_rate: float = 1.3
    notes: Optional[str] = None

class PriceMasterCreate(PriceMasterBase):
    pass

class PriceMaster(PriceMasterBase):
    item_id: int
    company_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class EstimateItemBase(BaseModel):
    item_description: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purchase_price: Optional[int] = None
    markup_rate: Optional[float] = None
    unit_price: Optional[int] = None
    line_item_adjustment: int = 0
    level: int = 0
    sort_order: int
    item_type: str = "item"
    is_free_entry: bool = False

class EstimateItemCreate(EstimateItemBase):
    price_master_item_id: Optional[int] = None
    parent_item_id: Optional[int] = None

class EstimateItem(EstimateItemBase):
    item_id: int
    estimate_id: int
    price_master_item_id: Optional[int] = None
    parent_item_id: Optional[int] = None
    line_total: Optional[int] = None
    line_cost: Optional[int] = None
    
    class Config:
        from_attributes = True

class EstimateBase(BaseModel):
    estimate_number: str
    estimate_date: date
    valid_until: Optional[date] = None
    notes: Optional[str] = None

class EstimateCreate(EstimateBase):
    customer_id: int
    project_id: Optional[int] = None

class Estimate(EstimateBase):
    estimate_id: int
    company_id: int
    customer_id: int
    project_id: Optional[int] = None
    status: str
    subtotal: int = 0
    adjustment_amount: int = 0
    total_amount: int = 0
    total_cost: int = 0
    gross_profit: int = 0
    gross_margin_rate: Optional[float] = None
    created_at: datetime
    items: List[EstimateItem] = []
    
    class Config:
        from_attributes = True

class EstimateUpdate(BaseModel):
    adjustment_amount: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class ProfitabilityAnalysis(BaseModel):
    """収益性分析レスポンス"""
    total_cost: int
    total_revenue: int
    gross_profit: int
    gross_margin_rate: float
    adjusted_total: int
    final_profit: int
    final_margin_rate: float

# =============================================================================
# APIエンドポイント
# =============================================================================

@app.get("/")
async def root():
    return {"message": "Garden DX API - 造園業向け統合業務管理システム"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# 単価マスタ関連API
@app.get("/api/price-master", response_model=List[PriceMaster])
async def get_price_master(
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """単価マスタ取得（階層検索・キーワード検索対応）"""
    query = db.query(PriceMaster).filter(PriceMaster.is_active == True)
    
    if category:
        query = query.filter(PriceMaster.category == category)
    if sub_category:
        query = query.filter(PriceMaster.sub_category == sub_category)
    if search:
        query = query.filter(
            PriceMaster.item_name.contains(search) | 
            PriceMaster.item_code.contains(search)
        )
    
    return query.order_by(PriceMaster.category, PriceMaster.sub_category, PriceMaster.item_name).all()

@app.get("/api/price-master/categories")
async def get_categories(db: Session = Depends(get_db)):
    """カテゴリ階層取得"""
    result = db.query(
        PriceMaster.category,
        PriceMaster.sub_category
    ).filter(PriceMaster.is_active == True).distinct().all()
    
    categories = {}
    for category, sub_category in result:
        if category not in categories:
            categories[category] = []
        if sub_category and sub_category not in categories[category]:
            categories[category].append(sub_category)
    
    return categories

@app.post("/api/price-master", response_model=PriceMaster)
async def create_price_master(
    item: PriceMasterCreate,
    db: Session = Depends(get_db)
):
    """単価マスタ登録"""
    db_item = PriceMaster(**item.dict(), company_id=1)  # TODO: JWT認証から取得
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# 見積関連API
@app.get("/api/estimates", response_model=List[Estimate])
async def get_estimates(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    current_user: User = Depends(require_permission("estimates", "view")),
    db: Session = Depends(get_db)
):
    """見積一覧取得（権限チェック付き）"""
    query = db.query(Estimate).filter(Estimate.company_id == current_user.company_id)
    
    if status:
        query = query.filter(Estimate.status == status)
    if customer_id:
        query = query.filter(Estimate.customer_id == customer_id)
    
    estimates = query.order_by(Estimate.created_at.desc()).all()
    
    # 権限に基づく表示制御
    filtered_estimates = []
    for estimate in estimates:
        estimate_dict = estimate.__dict__.copy()
        # 権限フィルタリング適用
        filtered_data = apply_estimate_permissions(current_user, estimate_dict)
        filtered_estimates.append(filtered_data)
    
    return filtered_estimates

@app.get("/api/estimates/{estimate_id}")
async def get_estimate(
    estimate_id: int, 
    current_user: User = Depends(require_permission("estimates", "view")),
    db: Session = Depends(get_db)
):
    """見積詳細取得（権限フィルタリング付き）"""
    estimate = db.query(Estimate).filter(
        Estimate.estimate_id == estimate_id,
        Estimate.company_id == current_user.company_id
    ).first()
    
    if not estimate:
        raise HTTPException(status_code=404, detail="見積が見つかりません")
    
    # 権限に基づく詳細データフィルタリング
    estimate_dict = estimate.__dict__.copy()
    
    # 明細データも取得してフィルタリング
    items = db.query(EstimateItem).filter(EstimateItem.estimate_id == estimate_id).all()
    estimate_dict["items"] = [item.__dict__.copy() for item in items]
    
    # 権限フィルタリング適用
    filtered_data = apply_estimate_permissions(current_user, estimate_dict)
    
    return filtered_data

@app.post("/api/estimates", response_model=Estimate)
async def create_estimate(
    estimate: EstimateCreate,
    current_user: User = Depends(require_permission("estimates", "create")),
    db: Session = Depends(get_db)
):
    """見積新規作成（権限チェック付き）"""
    db_estimate = Estimate(
        **estimate.dict(),
        company_id=current_user.company_id,
        status="draft"
    )
    db.add(db_estimate)
    db.commit()
    db.refresh(db_estimate)
    return db_estimate

@app.put("/api/estimates/{estimate_id}")
async def update_estimate(
    estimate_id: int,
    estimate_update: EstimateUpdate,
    current_user: User = Depends(require_permission("estimates", "edit")),
    db: Session = Depends(get_db)
):
    """見積更新（権限チェック付き）"""
    db_estimate = db.query(Estimate).filter(
        Estimate.estimate_id == estimate_id,
        Estimate.company_id == current_user.company_id
    ).first()
    
    if not db_estimate:
        raise HTTPException(status_code=404, detail="見積が見つかりません")
    
    # 調整金額の変更は経営者のみ
    if "adjustment_amount" in estimate_update.dict(exclude_unset=True):
        if not PermissionChecker.has_permission(current_user, "estimates", "adjust_total"):
            raise HTTPException(
                status_code=403, 
                detail="調整金額の変更は経営者権限が必要です"
            )
    
    for field, value in estimate_update.dict(exclude_unset=True).items():
        setattr(db_estimate, field, value)
    
    # 金額再計算
    _recalculate_estimate_totals(db_estimate, db)
    
    db.commit()
    db.refresh(db_estimate)
    
    # レスポンスも権限フィルタリング
    estimate_dict = db_estimate.__dict__.copy()
    filtered_data = apply_estimate_permissions(current_user, estimate_dict)
    
    return filtered_data

# 見積明細関連API
@app.post("/api/estimates/{estimate_id}/items", response_model=EstimateItem)
async def add_estimate_item(
    estimate_id: int,
    item: EstimateItemCreate,
    db: Session = Depends(get_db)
):
    """見積明細追加"""
    # 単価マスタから情報取得
    if item.price_master_item_id:
        master_item = db.query(PriceMaster).filter(
            PriceMaster.item_id == item.price_master_item_id
        ).first()
        if master_item:
            item.unit = master_item.unit
            item.purchase_price = master_item.purchase_price
            item.markup_rate = master_item.default_markup_rate
            item.unit_price = int(master_item.purchase_price * master_item.default_markup_rate)
    
    # 明細計算
    line_total = 0
    line_cost = 0
    if item.quantity and item.unit_price:
        line_total = int(item.quantity * item.unit_price) + item.line_item_adjustment
    if item.quantity and item.purchase_price:
        line_cost = int(item.quantity * item.purchase_price)
    
    db_item = EstimateItem(
        **item.dict(),
        estimate_id=estimate_id,
        line_total=line_total,
        line_cost=line_cost
    )
    db.add(db_item)
    db.commit()
    
    # 見積合計再計算
    estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
    _recalculate_estimate_totals(estimate, db)
    
    db.refresh(db_item)
    return db_item

@app.get("/api/estimates/{estimate_id}/profitability")
async def get_profitability_analysis(
    estimate_id: int, 
    current_user: User = Depends(require_owner_role()),
    db: Session = Depends(get_db)
):
    """収益性分析（経営者のみ）"""
    estimate = db.query(Estimate).filter(
        Estimate.estimate_id == estimate_id,
        Estimate.company_id == current_user.company_id
    ).first()
    
    if not estimate:
        raise HTTPException(status_code=404, detail="見積が見つかりません")
    
    return ProfitabilityAnalysis(
        total_cost=estimate.total_cost,
        total_revenue=estimate.subtotal,
        gross_profit=estimate.gross_profit,
        gross_margin_rate=estimate.gross_margin_rate or 0.0,
        adjusted_total=estimate.total_amount,
        final_profit=estimate.total_amount - estimate.total_cost,
        final_margin_rate=(estimate.total_amount - estimate.total_cost) / estimate.total_amount if estimate.total_amount > 0 else 0.0
    )

# PDF出力関連API
@app.get("/api/estimates/{estimate_id}/pdf")
async def generate_estimate_pdf(
    estimate_id: int, 
    current_user: User = Depends(require_permission("estimates", "pdf_generate")),
    db: Session = Depends(get_db)
):
    """造園業界標準準拠見積書PDF生成・ダウンロード（権限チェック付き）"""
    from services.pdf_generator import GardenEstimatePDFGenerator
    from fastapi import Response
    
    try:
        # 見積データ取得（会社IDでフィルタ）
        estimate = db.query(Estimate).filter(
            Estimate.estimate_id == estimate_id,
            Estimate.company_id == current_user.company_id
        ).first()
        
        if not estimate:
            raise HTTPException(status_code=404, detail="見積が見つかりません")
        
        # PDF生成用データ準備
        pdf_data = {
            "estimate_id": estimate.estimate_id,
            "estimate_number": estimate.estimate_number,
            "estimate_name": "造園工事見積書",  # デフォルト値
            "site_address": "",
            "estimate_date": estimate.estimate_date.isoformat() if estimate.estimate_date else None,
            "valid_until": estimate.valid_until,
            "subtotal_amount": estimate.subtotal,
            "adjustment_amount": estimate.adjustment_amount,
            "total_amount": estimate.total_amount,
            "total_cost": estimate.total_cost,
            "gross_profit": estimate.gross_profit,
            "notes": estimate.notes,
            "customer": {
                "customer_name": "お客様",  # 実際のデータから取得する場合は要修正
                "address": "",
                "phone": "",
            },
            "company": {
                "company_name": "株式会社庭園工房",
                "address": "東京都渋谷区xxx-xxx",
                "phone": "03-1234-5678",
                "email": "info@garden-kobo.co.jp",
            },
            "items": []  # 実際の明細データが必要
        }
        
        # PDF生成
        pdf_generator = GardenEstimatePDFGenerator()
        pdf_buffer = pdf_generator.generate_estimate_pdf(pdf_data)
        
        # PDFレスポンス
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=estimate_{estimate_id}.pdf",
                "Content-Type": "application/pdf"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成エラー: {str(e)}")

# 見積書・請求書連携API
@app.post("/api/estimates/{estimate_id}/create-invoice")
async def create_invoice_from_estimate(estimate_id: int, db: Session = Depends(get_db)):
    """見積書から請求書データ生成（worker3連携）"""
    from services.estimate_invoice_integration import EstimateInvoiceIntegrationService
    
    try:
        service = EstimateInvoiceIntegrationService(db)
        
        # 見積書検証
        validation = service.validate_estimate_for_invoice_generation(estimate_id)
        if not validation["valid"]:
            raise HTTPException(
                status_code=400, 
                detail=f"請求書生成不可: {', '.join(validation['errors'])}"
            )
        
        # 請求書データ生成
        invoice_data = service.convert_estimate_to_invoice_data(estimate_id)
        
        return {
            "success": True,
            "invoice_data": invoice_data,
            "validation_result": validation,
            "message": "請求書データが正常に生成されました"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"請求書生成エラー: {str(e)}")

@app.get("/api/estimates/{estimate_id}/invoice-preview")
async def preview_invoice_from_estimate(estimate_id: int, db: Session = Depends(get_db)):
    """見積書からの請求書生成プレビュー"""
    from services.estimate_invoice_integration import test_estimate_invoice_integration
    
    try:
        result = test_estimate_invoice_integration(db, estimate_id)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"請求書プレビューエラー: {str(e)}")

# =============================================================================
# 認証・権限管理API
# =============================================================================

@app.get("/api/auth/user-features")
async def get_user_features(current_user: User = Depends(get_current_user_dependency)):
    """現在ユーザーのアクセス可能機能取得"""
    features = get_user_accessible_features(current_user)
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "company_id": current_user.company_id,
        "role": current_user.role,
        "features": features
    }

@app.get("/api/auth/check-permission/{resource}/{action}")
async def check_permission(
    resource: str,
    action: str,
    current_user: User = Depends(get_current_user_dependency)
):
    """特定リソース・アクションの権限チェック"""
    has_permission = PermissionChecker.has_permission(current_user, resource, action)
    return {
        "user_id": current_user.user_id,
        "resource": resource,
        "action": action,
        "has_permission": has_permission,
        "role": current_user.role
    }

@app.get("/api/auth/permission-matrix")
async def get_permission_matrix(current_user: User = Depends(require_owner_role())):
    """権限マトリックス取得（経営者のみ）"""
    from services.auth_service import GARDEN_PERMISSIONS
    return {
        "permissions": GARDEN_PERMISSIONS,
        "current_user": {
            "role": current_user.role,
            "permissions": GARDEN_PERMISSIONS.get(current_user.role, {})
        }
    }

# =============================================================================
# ヘルパー関数
# =============================================================================

def _recalculate_estimate_totals(estimate: Estimate, db: Session):
    """見積合計金額再計算"""
    items = db.query(EstimateItem).filter(EstimateItem.estimate_id == estimate.estimate_id).all()
    
    subtotal = sum(item.line_total or 0 for item in items if item.item_type == "item")
    total_cost = sum(item.line_cost or 0 for item in items if item.item_type == "item")
    
    estimate.subtotal = subtotal
    estimate.total_cost = total_cost
    estimate.total_amount = subtotal + estimate.adjustment_amount
    estimate.gross_profit = estimate.total_amount - total_cost
    estimate.gross_margin_rate = estimate.gross_profit / estimate.total_amount if estimate.total_amount > 0 else 0.0

# テスト用認証なしエンドポイント
@app.get("/api/demo/estimates")
async def get_demo_estimates():
    """デモ用見積データ（認証なし）"""
    return [
        {
            "estimate_id": 1,
            "estimate_number": "EST-2025-001",
            "estimate_date": "2025-07-01",
            "valid_until": "2025-07-31",
            "customer_name": "テスト造園株式会社",
            "project_name": "庭園リフォーム工事",
            "total_amount": 250000,
            "status": "draft",
            "notes": "デモ用見積データです"
        },
        {
            "estimate_id": 2,
            "estimate_number": "EST-2025-002", 
            "estimate_date": "2025-07-01",
            "valid_until": "2025-08-01",
            "customer_name": "ABC造園設計",
            "project_name": "商業施設緑化工事",
            "total_amount": 580000,
            "status": "approved",
            "notes": "大型プロジェクト"
        }
    ]

@app.get("/api/demo/price-master")
async def get_demo_price_master():
    """デモ用単価マスタ（認証なし）"""
    return [
        {
            "item_id": 1,
            "category": "植栽工事",
            "sub_category": "高木",
            "item_name": "クロマツ H3.0m",
            "unit": "本",
            "purchase_price": 20000,
            "default_markup_rate": 1.3,
            "unit_price": 26000
        },
        {
            "item_id": 2,
            "category": "植栽工事", 
            "sub_category": "低木",
            "item_name": "ヒラドツツジ",
            "unit": "本",
            "purchase_price": 1500,
            "default_markup_rate": 1.4,
            "unit_price": 2100
        },
        {
            "item_id": 3,
            "category": "土工事",
            "sub_category": "土壌改良",
            "item_name": "客土・土壌改良",
            "unit": "m3",
            "purchase_price": 5000,
            "default_markup_rate": 1.2,
            "unit_price": 6000
        },
        {
            "item_id": 4,
            "category": "外構工事",
            "sub_category": "石材",
            "item_name": "御影石縁石",
            "unit": "m",
            "purchase_price": 8000,
            "default_markup_rate": 1.25,
            "unit_price": 10000
        }
    ]

@app.post("/api/demo/estimates/{estimate_id}/pdf")
async def generate_demo_pdf(estimate_id: int):
    """デモ用PDF生成（認証なし）"""
    return {
        "message": "デモPDF生成成功",
        "estimate_id": estimate_id,
        "pdf_url": f"/demo/pdf/estimate_{estimate_id}.pdf",
        "generated_at": "2025-07-01T10:30:00Z"
    }

# =============================================================================
# ルーター登録
# =============================================================================

# 設定管理APIルーター登録
app.include_router(settings_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)