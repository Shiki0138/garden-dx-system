"""
単価マスター管理API
バージョンアップ: カテゴリ階層・価格計算・インポート/エクスポート
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import io

from ..database.database import get_db
from ..services.price_master_service import PriceMasterService
from ..auth.auth_service import get_current_user
from ..models.models import User

router = APIRouter(prefix="/api/price-master", tags=["単価マスター"])

# ===== Request/Response Models =====

class CategoryCreateRequest(BaseModel):
    parent_category_id: Optional[int] = None
    category_code: str = Field(..., min_length=1, max_length=20)
    category_name: str = Field(..., min_length=1, max_length=100)
    category_name_kana: Optional[str] = None
    category_description: Optional[str] = None
    sort_order: int = 0
    icon_name: str = "category"
    color_code: str = "#4CAF50"
    is_leaf_category: bool = True

class PriceItemUpdateRequest(BaseModel):
    item_name: Optional[str] = None
    category_id: Optional[int] = None
    category: Optional[str] = None
    standard_unit: Optional[str] = None
    purchase_price: Optional[float] = None
    markup_rate: Optional[float] = None
    adjustment_amount: Optional[float] = None
    standard_price: Optional[float] = None
    price_calculation_method: Optional[str] = None
    min_order_quantity: Optional[float] = None
    unit_weight: Optional[float] = None
    lead_time_days: Optional[int] = None
    quality_grade: Optional[str] = None
    specification_notes: Optional[str] = None
    maintenance_notes: Optional[str] = None
    supplier_name: Optional[str] = None
    notes: Optional[str] = None

class PriceCalculationRequest(BaseModel):
    purchase_price: float = 0
    markup_rate: float = 1.3
    adjustment_amount: float = 0
    calculation_method: str = "markup"
    category_id: Optional[int] = None
    item_id: Optional[int] = None

class BulkUpdateRequest(BaseModel):
    category_id: Optional[int] = None
    markup_rate_adjustment: Optional[float] = None
    price_adjustment: Optional[float] = None
    adjustment_type: str = "percentage"

class PriceSearchResponse(BaseModel):
    items: List[Dict[str, Any]]
    total_count: int
    page: int
    per_page: int
    total_pages: int

# ===== Helper Functions =====

def get_price_service(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> PriceMasterService:
    """単価マスターサービス取得"""
    return PriceMasterService(db, current_user.company_id)

# ===== Category Management APIs =====

@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_categories(
    service: PriceMasterService = Depends(get_price_service)
):
    """カテゴリ階層ツリー取得"""
    try:
        return service.get_category_tree()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories", response_model=Dict[str, Any])
async def create_category(
    request: CategoryCreateRequest,
    service: PriceMasterService = Depends(get_price_service)
):
    """カテゴリ作成"""
    try:
        return service.create_category(request.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== Price Item Management APIs =====

@router.get("/items", response_model=PriceSearchResponse)
async def search_price_items(
    search_text: Optional[str] = Query(None, description="検索テキスト"),
    category_id: Optional[int] = Query(None, description="カテゴリID"),
    supplier_id: Optional[int] = Query(None, description="仕入先ID"),
    price_min: Optional[float] = Query(None, description="価格範囲（最小）"),
    price_max: Optional[float] = Query(None, description="価格範囲（最大）"),
    quality_grade: Optional[str] = Query(None, description="品質グレード"),
    is_active: bool = Query(True, description="有効フラグ"),
    sort_by: str = Query("item_name", description="ソート項目"),
    sort_order: str = Query("asc", description="ソート順序"),
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(25, ge=1, le=100, description="1ページあたりの件数"),
    service: PriceMasterService = Depends(get_price_service)
):
    """単価マスター検索"""
    try:
        price_range = {}
        if price_min is not None:
            price_range["min"] = price_min
        if price_max is not None:
            price_range["max"] = price_max
        
        return service.search_price_items(
            search_text=search_text,
            category_id=category_id,
            supplier_id=supplier_id,
            price_range=price_range if price_range else None,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items/{item_id}", response_model=Dict[str, Any])
async def get_price_item(
    item_id: int,
    service: PriceMasterService = Depends(get_price_service)
):
    """単価マスター詳細取得"""
    try:
        return service.get_price_item(item_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/items/{item_id}", response_model=Dict[str, Any])
async def update_price_item(
    item_id: int,
    request: PriceItemUpdateRequest,
    service: PriceMasterService = Depends(get_price_service)
):
    """単価マスター更新"""
    try:
        # Noneでない値のみ更新対象とする
        update_data = {k: v for k, v in request.dict().items() if v is not None}
        return service.update_price_item(item_id, update_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== Price Calculation APIs =====

@router.post("/calculate-price", response_model=Dict[str, Any])
async def calculate_price(
    request: PriceCalculationRequest,
    service: PriceMasterService = Depends(get_price_service)
):
    """価格計算実行"""
    try:
        return service.calculate_price(
            purchase_price=request.purchase_price,
            markup_rate=request.markup_rate,
            adjustment_amount=request.adjustment_amount,
            calculation_method=request.calculation_method,
            category_id=request.category_id,
            item_id=request.item_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-update", response_model=Dict[str, Any])
async def bulk_price_update(
    request: BulkUpdateRequest,
    service: PriceMasterService = Depends(get_price_service)
):
    """一括価格更新"""
    try:
        return service.bulk_price_update(
            category_id=request.category_id,
            markup_rate_adjustment=request.markup_rate_adjustment,
            price_adjustment=request.price_adjustment,
            adjustment_type=request.adjustment_type
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== Import/Export APIs =====

@router.get("/export")
async def export_price_master(
    format_type: str = Query("excel", description="エクスポート形式（excel/csv）"),
    service: PriceMasterService = Depends(get_price_service)
):
    """単価マスターエクスポート"""
    try:
        if format_type not in ["excel", "csv"]:
            raise HTTPException(status_code=400, detail="サポートされていないフォーマットです")
        
        file_content = service.export_price_master(format_type)
        
        if format_type == "excel":
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"単価マスター_{datetime.now().strftime('%Y%m%d')}.xlsx"
        else:
            media_type = "text/csv"
            filename = f"単価マスター_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import", response_model=Dict[str, Any])
async def import_price_master(
    file: UploadFile = File(..., description="インポートファイル（Excel/CSV）"),
    service: PriceMasterService = Depends(get_price_service)
):
    """単価マスターインポート"""
    try:
        # ファイル形式判定
        file_type = "excel" if file.filename.endswith(('.xlsx', '.xls')) else "csv"
        
        # ファイル読み込み
        content = await file.read()
        
        return service.import_price_master(content, file_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== Price History APIs =====

@router.get("/items/{item_id}/history", response_model=List[Dict[str, Any]])
async def get_price_history(
    item_id: int,
    limit: int = Query(20, ge=1, le=100, description="取得件数"),
    service: PriceMasterService = Depends(get_price_service)
):
    """価格履歴取得"""
    try:
        return service.get_price_history(item_id, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== Analytics APIs =====

@router.get("/analytics/category-summary", response_model=List[Dict[str, Any]])
async def get_category_summary(
    service: PriceMasterService = Depends(get_price_service)
):
    """カテゴリ別サマリー取得"""
    try:
        # カテゴリ別の統計情報を取得
        db = service.db
        company_id = service.company_id
        
        query = """
        SELECT 
            pc.category_name,
            pc.color_code,
            COUNT(pm.item_id) as item_count,
            AVG(pm.final_price) as avg_price,
            MIN(pm.final_price) as min_price,
            MAX(pm.final_price) as max_price,
            SUM(CASE WHEN pm.quality_grade = 'S' THEN 1 ELSE 0 END) as grade_s_count,
            SUM(CASE WHEN pm.quality_grade = 'A' THEN 1 ELSE 0 END) as grade_a_count,
            SUM(CASE WHEN pm.quality_grade = 'B' THEN 1 ELSE 0 END) as grade_b_count,
            SUM(CASE WHEN pm.quality_grade = 'C' THEN 1 ELSE 0 END) as grade_c_count
        FROM price_categories pc
        LEFT JOIN price_master pm ON pc.category_id = pm.category_id AND pm.is_active = true
        WHERE pc.company_id = :company_id AND pc.is_active = true
        GROUP BY pc.category_id, pc.category_name, pc.color_code
        ORDER BY pc.sort_order, pc.category_name
        """
        
        result = db.execute(text(query), {"company_id": company_id}).fetchall()
        
        summary = []
        for row in result:
            summary.append({
                "category_name": row.category_name,
                "color_code": row.color_code,
                "item_count": row.item_count,
                "avg_price": float(row.avg_price or 0),
                "min_price": float(row.min_price or 0),
                "max_price": float(row.max_price or 0),
                "quality_distribution": {
                    "S": row.grade_s_count,
                    "A": row.grade_a_count,
                    "B": row.grade_b_count,
                    "C": row.grade_c_count
                }
            })
        
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/price-trends", response_model=Dict[str, Any])
async def get_price_trends(
    category_id: Optional[int] = Query(None, description="カテゴリID"),
    days: int = Query(30, ge=7, le=365, description="分析期間（日数）"),
    service: PriceMasterService = Depends(get_price_service)
):
    """価格トレンド分析"""
    try:
        db = service.db
        company_id = service.company_id
        
        # 価格履歴から傾向分析
        query = """
        SELECT 
            DATE(ph.effective_date) as date,
            AVG(ph.new_final_price) as avg_price,
            COUNT(*) as change_count,
            AVG(ph.new_final_price - ph.previous_final_price) as avg_change
        FROM price_history ph
        JOIN price_master pm ON ph.item_id = pm.item_id
        WHERE ph.company_id = :company_id 
        AND ph.effective_date >= CURRENT_DATE - INTERVAL :days DAY
        """ + (f" AND pm.category_id = :category_id" if category_id else "") + """
        GROUP BY DATE(ph.effective_date)
        ORDER BY date
        """
        
        params = {"company_id": company_id, "days": days}
        if category_id:
            params["category_id"] = category_id
        
        result = db.execute(text(query), params).fetchall()
        
        trends = []
        for row in result:
            trends.append({
                "date": row.date.isoformat(),
                "avg_price": float(row.avg_price),
                "change_count": row.change_count,
                "avg_change": float(row.avg_change or 0)
            })
        
        return {
            "trends": trends,
            "analysis_period_days": days,
            "category_id": category_id,
            "total_changes": sum(t["change_count"] for t in trends)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== Utility APIs =====

@router.get("/suppliers", response_model=List[Dict[str, Any]])
async def get_suppliers(
    service: PriceMasterService = Depends(get_price_service)
):
    """仕入先一覧取得"""
    try:
        db = service.db
        company_id = service.company_id
        
        query = """
        SELECT 
            supplier_id,
            supplier_name,
            supplier_code,
            contact_person,
            phone,
            email,
            speciality_categories,
            quality_rating,
            reliability_rating,
            price_competitiveness
        FROM suppliers
        WHERE company_id = :company_id AND is_active = true
        ORDER BY supplier_name
        """
        
        result = db.execute(text(query), {"company_id": company_id}).fetchall()
        
        suppliers = []
        for row in result:
            suppliers.append({
                "supplier_id": row.supplier_id,
                "supplier_name": row.supplier_name,
                "supplier_code": row.supplier_code,
                "contact_person": row.contact_person,
                "phone": row.phone,
                "email": row.email,
                "speciality_categories": row.speciality_categories,
                "quality_rating": row.quality_rating,
                "reliability_rating": row.reliability_rating,
                "price_competitiveness": row.price_competitiveness
            })
        
        return suppliers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/item-codes", response_model=List[str])
async def get_item_code_templates():
    """項目コードテンプレート取得"""
    try:
        templates = [
            "P001-001",  # 植栽工事 - 高木 - 001
            "P002-001",  # 植栽工事 - 中木 - 001
            "P003-001",  # 植栽工事 - 低木 - 001
            "P004-001",  # 植栽工事 - 芝・グランドカバー - 001
            "E001-001",  # 土工事 - 掘削 - 001
            "E002-001",  # 土工事 - 埋戻・整地 - 001
            "E003-001",  # 土工事 - 土壌改良 - 001
            "S001-001",  # 石工事 - 石積・擁壁 - 001
            "S002-001",  # 石工事 - 石張・舗装 - 001
            "S003-001",  # 石工事 - 飛石・敷石 - 001
            "W001-001",  # 給排水工事 - 001
            "F001-001",  # 施設工事 - 001
        ]
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from datetime import datetime
from sqlalchemy import text