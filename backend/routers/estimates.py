"""
Garden 造園業向け統合業務管理システム
見積エンジン API ルーター
仕様書準拠の見積管理機能
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import Estimate, EstimateItem, PriceMaster, Customer
from schemas import (
    Estimate as EstimateSchema,
    EstimateCreate,
    EstimateUpdate,
    EstimateItem as EstimateItemSchema,
    EstimateItemCreate,
    EstimateItemUpdate,
    ProfitabilityAnalysis,
    EstimateSearchParams,
    BulkItemOperation
)

router = APIRouter()

# =============================================================================
# 見積管理エンドポイント
# =============================================================================

@router.get("/", response_model=List[EstimateSchema])
async def get_estimates(
    status: Optional[str] = Query(None, description="ステータス絞り込み"),
    customer_id: Optional[int] = Query(None, description="顧客ID絞り込み"),
    date_from: Optional[date] = Query(None, description="見積日From"),
    date_to: Optional[date] = Query(None, description="見積日To"),
    search_keyword: Optional[str] = Query(None, description="検索キーワード"),
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数"),
    db: Session = Depends(get_db)
):
    """
    見積一覧取得
    - 各種条件での絞り込み検索対応
    - ページネーション対応
    """
    query = db.query(Estimate).options(
        joinedload(Estimate.customer),
        joinedload(Estimate.items)
    )
    
    # フィルタ条件
    if status:
        query = query.filter(Estimate.status == status)
    if customer_id:
        query = query.filter(Estimate.customer_id == customer_id)
    if date_from:
        query = query.filter(Estimate.estimate_date >= date_from)
    if date_to:
        query = query.filter(Estimate.estimate_date <= date_to)
    if search_keyword:
        query = query.filter(
            or_(
                Estimate.estimate_name.contains(search_keyword),
                Estimate.estimate_number.contains(search_keyword),
                Estimate.site_address.contains(search_keyword)
            )
        )
    
    # ソートとページネーション
    estimates = query.order_by(desc(Estimate.created_at))\
                    .offset(skip)\
                    .limit(limit)\
                    .all()
    
    return estimates

@router.get("/{estimate_id}", response_model=EstimateSchema)
async def get_estimate(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """見積詳細取得"""
    estimate = db.query(Estimate).options(
        joinedload(Estimate.customer),
        joinedload(Estimate.items).joinedload(EstimateItem.price_master)
    ).filter(Estimate.estimate_id == estimate_id).first()
    
    if not estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された見積が見つかりません"
        )
    
    return estimate

@router.post("/", response_model=EstimateSchema, status_code=status.HTTP_201_CREATED)
async def create_estimate(
    estimate_data: EstimateCreate,
    db: Session = Depends(get_db)
):
    """
    見積新規作成
    - 見積番号の自動生成
    - 初期ステータス設定
    """
    # 顧客存在チェック
    customer = db.query(Customer).filter(Customer.customer_id == estimate_data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された顧客が見つかりません"
        )
    
    # 見積番号の自動生成（年度-連番形式）
    current_year = datetime.now().year
    max_number = db.query(func.max(Estimate.estimate_number))\
                   .filter(Estimate.estimate_number.like(f"{current_year}-%"))\
                   .scalar()
    
    if max_number:
        last_seq = int(max_number.split('-')[1])
        new_seq = last_seq + 1
    else:
        new_seq = 1
    
    estimate_number = f"{current_year}-{new_seq:04d}"
    
    # 見積作成
    db_estimate = Estimate(
        **estimate_data.dict(),
        company_id=1,  # TODO: JWT認証から取得
        estimate_number=estimate_number,
        status="作成中"
    )
    
    db.add(db_estimate)
    db.commit()
    db.refresh(db_estimate)
    
    return db_estimate

@router.put("/{estimate_id}", response_model=EstimateSchema)
async def update_estimate(
    estimate_id: int,
    estimate_update: EstimateUpdate,
    db: Session = Depends(get_db)
):
    """見積更新"""
    db_estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
    if not db_estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された見積が見つかりません"
        )
    
    # 更新処理
    update_data = estimate_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_estimate, field, value)
    
    db_estimate.updated_at = datetime.now()
    
    # 金額再計算（調整額が変更された場合）
    if 'adjustment_amount' in update_data or 'adjustment_rate' in update_data:
        _recalculate_estimate_totals(db_estimate, db)
    
    db.commit()
    db.refresh(db_estimate)
    
    return db_estimate

@router.delete("/{estimate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_estimate(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """見積削除"""
    db_estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
    if not db_estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された見積が見つかりません"
        )
    
    db.delete(db_estimate)
    db.commit()

# =============================================================================
# 見積明細管理エンドポイント
# =============================================================================

@router.get("/{estimate_id}/items", response_model=List[EstimateItemSchema])
async def get_estimate_items(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """見積明細一覧取得（階層構造保持）"""
    items = db.query(EstimateItem)\
              .filter(EstimateItem.estimate_id == estimate_id)\
              .order_by(EstimateItem.sort_order)\
              .all()
    
    return items

@router.post("/{estimate_id}/items", response_model=EstimateItemSchema, status_code=status.HTTP_201_CREATED)
async def add_estimate_item(
    estimate_id: int,
    item_data: EstimateItemCreate,
    db: Session = Depends(get_db)
):
    """
    見積明細追加
    - 単価マスタからの自動補完
    - 金額計算
    """
    # 見積存在チェック
    estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
    if not estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された見積が見つかりません"
        )
    
    # 単価マスタからの情報補完
    if item_data.price_master_item_id:
        master_item = db.query(PriceMaster)\
                        .filter(PriceMaster.item_id == item_data.price_master_item_id)\
                        .first()
        if master_item:
            # マスタ情報で未入力項目を補完
            if not item_data.unit:
                item_data.unit = master_item.unit
            if not item_data.purchase_price:
                item_data.purchase_price = int(master_item.purchase_price)
            if not item_data.markup_rate:
                item_data.markup_rate = float(master_item.default_markup_rate)
            if not item_data.unit_price:
                item_data.unit_price = int(master_item.purchase_price * master_item.default_markup_rate)
    
    # 明細金額計算
    line_total = 0
    line_cost = 0
    
    if item_data.quantity and item_data.unit_price:
        line_total = int(item_data.quantity * item_data.unit_price) + item_data.line_item_adjustment
    
    if item_data.quantity and item_data.purchase_price:
        line_cost = int(item_data.quantity * item_data.purchase_price)
    
    # 明細作成
    db_item = EstimateItem(
        **item_data.dict(),
        estimate_id=estimate_id,
        line_total=line_total,
        line_cost=line_cost
    )
    
    db.add(db_item)
    db.commit()
    
    # 見積合計再計算
    _recalculate_estimate_totals(estimate, db)
    
    db.refresh(db_item)
    return db_item

@router.put("/{estimate_id}/items/{item_id}", response_model=EstimateItemSchema)
async def update_estimate_item(
    estimate_id: int,
    item_id: int,
    item_update: EstimateItemUpdate,
    db: Session = Depends(get_db)
):
    """見積明細更新"""
    db_item = db.query(EstimateItem)\
                .filter(
                    and_(
                        EstimateItem.estimate_id == estimate_id,
                        EstimateItem.item_id == item_id
                    )
                ).first()
    
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された明細が見つかりません"
        )
    
    # 更新処理
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    # 金額再計算
    if db_item.quantity and db_item.unit_price:
        db_item.line_total = int(db_item.quantity * db_item.unit_price) + db_item.line_item_adjustment
    
    if db_item.quantity and db_item.purchase_price:
        db_item.line_cost = int(db_item.quantity * db_item.purchase_price)
    
    db_item.updated_at = datetime.now()
    db.commit()
    
    # 見積合計再計算
    estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
    _recalculate_estimate_totals(estimate, db)
    
    db.refresh(db_item)
    return db_item

@router.delete("/{estimate_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_estimate_item(
    estimate_id: int,
    item_id: int,
    db: Session = Depends(get_db)
):
    """見積明細削除"""
    db_item = db.query(EstimateItem)\
                .filter(
                    and_(
                        EstimateItem.estimate_id == estimate_id,
                        EstimateItem.item_id == item_id
                    )
                ).first()
    
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された明細が見つかりません"
        )
    
    db.delete(db_item)
    db.commit()
    
    # 見積合計再計算
    estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
    _recalculate_estimate_totals(estimate, db)

@router.post("/{estimate_id}/items/bulk", status_code=status.HTTP_200_OK)
async def bulk_items_operation(
    estimate_id: int,
    operation: BulkItemOperation,
    db: Session = Depends(get_db)
):
    """
    明細一括操作
    - ドラッグ&ドロップによる並び順変更
    - 一括削除
    """
    if operation.operation == "reorder" and operation.new_sort_orders:
        # 並び順更新
        for item_id, new_order in zip(operation.item_ids, operation.new_sort_orders):
            db.query(EstimateItem)\
              .filter(
                  and_(
                      EstimateItem.estimate_id == estimate_id,
                      EstimateItem.item_id == item_id
                  )
              ).update({"sort_order": new_order})
        
        db.commit()
        return {"message": "並び順を更新しました"}
    
    elif operation.operation == "delete":
        # 一括削除
        db.query(EstimateItem)\
          .filter(
              and_(
                  EstimateItem.estimate_id == estimate_id,
                  EstimateItem.item_id.in_(operation.item_ids)
              )
          ).delete(synchronize_session=False)
        
        db.commit()
        
        # 見積合計再計算
        estimate = db.query(Estimate).filter(Estimate.estimate_id == estimate_id).first()
        _recalculate_estimate_totals(estimate, db)
        
        return {"message": f"{len(operation.item_ids)}件の明細を削除しました"}
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不正な操作です"
        )

# =============================================================================
# 収益性分析エンドポイント
# =============================================================================

@router.get("/{estimate_id}/profitability", response_model=ProfitabilityAnalysis)
async def get_profitability_analysis(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """
    収益性分析
    - リアルタイム利益率計算
    - カテゴリ別内訳分析
    """
    estimate = db.query(Estimate)\
                 .options(joinedload(Estimate.items).joinedload(EstimateItem.price_master))\
                 .filter(Estimate.estimate_id == estimate_id)\
                 .first()
    
    if not estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された見積が見つかりません"
        )
    
    # カテゴリ別分析
    category_breakdown = {}
    for item in estimate.items:
        if item.item_type == "item" and item.price_master:
            category = item.price_master.category
            if category not in category_breakdown:
                category_breakdown[category] = {
                    "total_cost": 0,
                    "total_revenue": 0,
                    "item_count": 0
                }
            
            category_breakdown[category]["total_cost"] += item.line_cost or 0
            category_breakdown[category]["total_revenue"] += item.line_total or 0
            category_breakdown[category]["item_count"] += 1
    
    # カテゴリ別利益率計算
    for category, data in category_breakdown.items():
        if data["total_revenue"] > 0:
            data["profit_rate"] = (data["total_revenue"] - data["total_cost"]) / data["total_revenue"]
        else:
            data["profit_rate"] = 0.0
    
    final_profit_rate = 0.0
    if estimate.total_amount > 0:
        final_profit_rate = (estimate.total_amount - estimate.total_cost) / estimate.total_amount
    
    return ProfitabilityAnalysis(
        total_cost=estimate.total_cost,
        total_revenue=estimate.subtotal_amount,
        gross_profit=estimate.gross_profit,
        gross_profit_rate=float(estimate.gross_profit_rate),
        adjusted_total=estimate.total_amount,
        final_profit=estimate.total_amount - estimate.total_cost,
        final_profit_rate=final_profit_rate,
        category_breakdown=category_breakdown
    )

# =============================================================================
# ヘルパー関数
# =============================================================================

def _recalculate_estimate_totals(estimate: Estimate, db: Session):
    """
    見積合計金額再計算
    - 小計、総原価、粗利計算
    - 調整額考慮
    """
    items = db.query(EstimateItem)\
              .filter(EstimateItem.estimate_id == estimate.estimate_id)\
              .all()
    
    subtotal = sum(item.line_total or 0 for item in items if item.item_type == "item")
    total_cost = sum(item.line_cost or 0 for item in items if item.item_type == "item")
    
    estimate.subtotal_amount = subtotal
    estimate.total_cost = total_cost
    estimate.total_amount = subtotal + estimate.adjustment_amount
    estimate.gross_profit = estimate.total_amount - total_cost
    
    if estimate.total_amount > 0:
        estimate.gross_profit_rate = estimate.gross_profit / estimate.total_amount
    else:
        estimate.gross_profit_rate = 0.0
    
    estimate.updated_at = datetime.now()
    db.commit()