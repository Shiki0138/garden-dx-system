"""
単価マスター管理サービス
バージョンアップ: カテゴリ階層・価格計算エンジン・履歴管理
"""

from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, text
from datetime import datetime, date
import pandas as pd
import io
import json
from decimal import Decimal

from ..database.database import get_db
from ..models.models import PriceMaster, PriceCategory, PriceHistory, SeasonalPricing, Supplier, ItemSupplier


class PriceMasterService:
    """単価マスター管理サービスクラス"""
    
    def __init__(self, db: Session, company_id: int):
        self.db = db
        self.company_id = company_id
    
    # ======================================
    # カテゴリ階層管理
    # ======================================
    
    def get_category_tree(self) -> List[Dict[str, Any]]:
        """カテゴリ階層ツリー取得"""
        try:
            # ルートカテゴリ取得
            root_categories = self.db.query(PriceCategory).filter(
                and_(
                    PriceCategory.company_id == self.company_id,
                    PriceCategory.parent_category_id.is_(None),
                    PriceCategory.is_active == True
                )
            ).order_by(PriceCategory.sort_order, PriceCategory.category_name).all()
            
            tree = []
            for root in root_categories:
                tree.append(self._build_category_node(root))
            
            return tree
        except Exception as e:
            raise Exception(f"カテゴリツリー取得エラー: {str(e)}")
    
    def _build_category_node(self, category: PriceCategory) -> Dict[str, Any]:
        """カテゴリノード構築（再帰）"""
        node = {
            "category_id": category.category_id,
            "category_code": category.category_code,
            "category_name": category.category_name,
            "category_name_kana": category.category_name_kana,
            "level_depth": category.level_depth,
            "sort_order": category.sort_order,
            "icon_name": category.icon_name,
            "color_code": category.color_code,
            "is_leaf_category": category.is_leaf_category,
            "children": []
        }
        
        # 子カテゴリ取得
        children = self.db.query(PriceCategory).filter(
            and_(
                PriceCategory.company_id == self.company_id,
                PriceCategory.parent_category_id == category.category_id,
                PriceCategory.is_active == True
            )
        ).order_by(PriceCategory.sort_order, PriceCategory.category_name).all()
        
        for child in children:
            node["children"].append(self._build_category_node(child))
        
        return node
    
    def create_category(self, category_data: Dict[str, Any]) -> Dict[str, Any]:
        """カテゴリ作成"""
        try:
            # レベル深度自動計算
            level_depth = 1
            if category_data.get("parent_category_id"):
                parent = self.db.query(PriceCategory).filter(
                    PriceCategory.category_id == category_data["parent_category_id"]
                ).first()
                if parent:
                    level_depth = parent.level_depth + 1
            
            new_category = PriceCategory(
                company_id=self.company_id,
                parent_category_id=category_data.get("parent_category_id"),
                category_code=category_data["category_code"],
                category_name=category_data["category_name"],
                category_name_kana=category_data.get("category_name_kana", ""),
                category_description=category_data.get("category_description"),
                level_depth=level_depth,
                sort_order=category_data.get("sort_order", 0),
                icon_name=category_data.get("icon_name", "category"),
                color_code=category_data.get("color_code", "#4CAF50"),
                is_leaf_category=category_data.get("is_leaf_category", True)
            )
            
            self.db.add(new_category)
            self.db.commit()
            self.db.refresh(new_category)
            
            return {
                "category_id": new_category.category_id,
                "category_code": new_category.category_code,
                "category_name": new_category.category_name,
                "level_depth": new_category.level_depth,
                "message": "カテゴリを作成しました"
            }
        except Exception as e:
            self.db.rollback()
            raise Exception(f"カテゴリ作成エラー: {str(e)}")
    
    # ======================================
    # 単価マスター検索・管理
    # ======================================
    
    def search_price_items(self, 
                          search_text: Optional[str] = None,
                          category_id: Optional[int] = None,
                          supplier_id: Optional[int] = None,
                          price_range: Optional[Dict[str, float]] = None,
                          is_active: bool = True,
                          sort_by: str = "item_name",
                          sort_order: str = "asc",
                          page: int = 1,
                          per_page: int = 50) -> Dict[str, Any]:
        """単価マスター検索"""
        try:
            query = self.db.query(PriceMaster).filter(
                and_(
                    PriceMaster.company_id == self.company_id,
                    PriceMaster.is_active == is_active
                )
            )
            
            # テキスト検索
            if search_text:
                search_terms = search_text.split()
                for term in search_terms:
                    query = query.filter(
                        or_(
                            PriceMaster.item_name.ilike(f"%{term}%"),
                            PriceMaster.item_code.ilike(f"%{term}%"),
                            PriceMaster.category.ilike(f"%{term}%"),
                            PriceMaster.supplier_name.ilike(f"%{term}%")
                        )
                    )
            
            # カテゴリフィルター
            if category_id:
                query = query.filter(PriceMaster.category_id == category_id)
            
            # 仕入先フィルター
            if supplier_id:
                query = query.join(ItemSupplier).filter(
                    ItemSupplier.supplier_id == supplier_id
                )
            
            # 価格範囲フィルター
            if price_range:
                if price_range.get("min"):
                    query = query.filter(PriceMaster.final_price >= price_range["min"])
                if price_range.get("max"):
                    query = query.filter(PriceMaster.final_price <= price_range["max"])
            
            # ソート
            sort_column = getattr(PriceMaster, sort_by, PriceMaster.item_name)
            if sort_order == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
            
            # ページネーション
            total_count = query.count()
            offset = (page - 1) * per_page
            items = query.offset(offset).limit(per_page).all()
            
            # 結果変換
            result_items = []
            for item in items:
                result_items.append({
                    "item_id": item.item_id,
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "category": item.category,
                    "standard_unit": item.standard_unit,
                    "purchase_price": float(item.purchase_price or 0),
                    "markup_rate": float(item.markup_rate or 1.3),
                    "adjustment_amount": float(item.adjustment_amount or 0),
                    "final_price": float(item.final_price or 0),
                    "standard_price": float(item.standard_price or 0),
                    "supplier_name": item.supplier_name,
                    "price_calculation_method": item.price_calculation_method,
                    "seasonal_factor": float(item.seasonal_factor or 1.0),
                    "quality_grade": item.quality_grade,
                    "updated_at": item.updated_at.isoformat() if item.updated_at else None
                })
            
            return {
                "items": result_items,
                "total_count": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_count + per_page - 1) // per_page
            }
        except Exception as e:
            raise Exception(f"単価マスター検索エラー: {str(e)}")
    
    def get_price_item(self, item_id: int) -> Dict[str, Any]:
        """単価マスター詳細取得"""
        try:
            item = self.db.query(PriceMaster).filter(
                and_(
                    PriceMaster.item_id == item_id,
                    PriceMaster.company_id == self.company_id
                )
            ).first()
            
            if not item:
                raise Exception("単価マスターが見つかりません")
            
            # 仕入先情報取得
            suppliers_info = self.db.query(ItemSupplier).join(Supplier).filter(
                ItemSupplier.item_id == item_id
            ).all()
            
            suppliers = []
            for supplier_info in suppliers_info:
                suppliers.append({
                    "supplier_id": supplier_info.supplier.supplier_id,
                    "supplier_name": supplier_info.supplier.supplier_name,
                    "supplier_price": float(supplier_info.supplier_price or 0),
                    "minimum_order_quantity": float(supplier_info.minimum_order_quantity or 1),
                    "delivery_days": supplier_info.delivery_days,
                    "is_primary_supplier": supplier_info.is_primary_supplier
                })
            
            # 価格履歴取得（最新5件）
            price_history = self.db.query(PriceHistory).filter(
                PriceHistory.item_id == item_id
            ).order_by(desc(PriceHistory.created_at)).limit(5).all()
            
            history = []
            for h in price_history:
                history.append({
                    "change_type": h.change_type,
                    "previous_final_price": float(h.previous_final_price or 0),
                    "new_final_price": float(h.new_final_price or 0),
                    "change_reason": h.change_reason,
                    "effective_date": h.effective_date.isoformat() if h.effective_date else None,
                    "created_at": h.created_at.isoformat() if h.created_at else None
                })
            
            return {
                "item_id": item.item_id,
                "item_code": item.item_code,
                "item_name": item.item_name,
                "category_id": item.category_id,
                "category": item.category,
                "standard_unit": item.standard_unit,
                "purchase_price": float(item.purchase_price or 0),
                "markup_rate": float(item.markup_rate or 1.3),
                "adjustment_amount": float(item.adjustment_amount or 0),
                "final_price": float(item.final_price or 0),
                "standard_price": float(item.standard_price or 0),
                "cost_price": float(item.cost_price or 0),
                "price_calculation_method": item.price_calculation_method,
                "min_order_quantity": float(item.min_order_quantity or 1),
                "unit_weight": float(item.unit_weight or 0),
                "lead_time_days": item.lead_time_days,
                "seasonal_factor": float(item.seasonal_factor or 1.0),
                "quality_grade": item.quality_grade,
                "specification_notes": item.specification_notes,
                "maintenance_notes": item.maintenance_notes,
                "suppliers": suppliers,
                "price_history": history,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None
            }
        except Exception as e:
            raise Exception(f"単価マスター詳細取得エラー: {str(e)}")
    
    # ======================================
    # 価格計算エンジン
    # ======================================
    
    def calculate_price(self, 
                       purchase_price: float = 0,
                       markup_rate: float = 1.3,
                       adjustment_amount: float = 0,
                       calculation_method: str = "markup",
                       category_id: Optional[int] = None,
                       item_id: Optional[int] = None) -> Dict[str, Any]:
        """価格計算実行"""
        try:
            # 季節係数取得
            current_month = datetime.now().month
            seasonal_factor = 1.0
            
            if category_id or item_id:
                seasonal_query = self.db.query(SeasonalPricing).filter(
                    and_(
                        SeasonalPricing.company_id == self.company_id,
                        SeasonalPricing.start_month <= current_month,
                        SeasonalPricing.end_month >= current_month,
                        SeasonalPricing.is_active == True
                    )
                )
                
                if item_id:
                    seasonal_query = seasonal_query.filter(SeasonalPricing.item_id == item_id)
                elif category_id:
                    seasonal_query = seasonal_query.filter(SeasonalPricing.category_id == category_id)
                
                seasonal_pricing = seasonal_query.first()
                if seasonal_pricing:
                    seasonal_factor = float(seasonal_pricing.price_factor)
            
            # 計算方法による価格計算
            calculated_price = 0
            
            if calculation_method == "markup":
                calculated_price = (purchase_price * markup_rate + adjustment_amount) * seasonal_factor
            elif calculation_method == "fixed":
                calculated_price = (purchase_price + adjustment_amount) * seasonal_factor
            elif calculation_method == "cost_plus":
                calculated_price = (purchase_price + adjustment_amount) * seasonal_factor
            elif calculation_method == "market_based":
                calculated_price = (purchase_price * 1.1 + adjustment_amount) * seasonal_factor
            else:
                calculated_price = purchase_price * seasonal_factor
            
            # 円単位に丸める
            final_price = round(calculated_price)
            
            return {
                "purchase_price": purchase_price,
                "markup_rate": markup_rate,
                "adjustment_amount": adjustment_amount,
                "seasonal_factor": seasonal_factor,
                "calculated_price": calculated_price,
                "final_price": final_price,
                "calculation_method": calculation_method,
                "calculation_details": {
                    "base_price": purchase_price * markup_rate if calculation_method == "markup" else purchase_price,
                    "adjustment": adjustment_amount,
                    "seasonal_adjustment": (calculated_price / seasonal_factor) if seasonal_factor != 1.0 else calculated_price,
                    "current_month": current_month
                }
            }
        except Exception as e:
            raise Exception(f"価格計算エラー: {str(e)}")
    
    def update_price_item(self, item_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """単価マスター更新"""
        try:
            item = self.db.query(PriceMaster).filter(
                and_(
                    PriceMaster.item_id == item_id,
                    PriceMaster.company_id == self.company_id
                )
            ).first()
            
            if not item:
                raise Exception("単価マスターが見つかりません")
            
            # 更新前の値を保存（履歴記録用）
            old_values = {
                "purchase_price": item.purchase_price,
                "markup_rate": item.markup_rate,
                "adjustment_amount": item.adjustment_amount,
                "final_price": item.final_price
            }
            
            # 更新実行
            for key, value in update_data.items():
                if hasattr(item, key):
                    setattr(item, key, value)
            
            # 価格再計算（トリガーで自動実行される）
            self.db.commit()
            self.db.refresh(item)
            
            return {
                "item_id": item.item_id,
                "item_name": item.item_name,
                "old_final_price": float(old_values["final_price"] or 0),
                "new_final_price": float(item.final_price or 0),
                "updated_fields": list(update_data.keys()),
                "message": "単価マスターを更新しました"
            }
        except Exception as e:
            self.db.rollback()
            raise Exception(f"単価マスター更新エラー: {str(e)}")
    
    # ======================================
    # インポート・エクスポート機能
    # ======================================
    
    def export_price_master(self, format_type: str = "excel") -> bytes:
        """単価マスターエクスポート"""
        try:
            # データ取得
            items = self.db.query(PriceMaster).filter(
                and_(
                    PriceMaster.company_id == self.company_id,
                    PriceMaster.is_active == True
                )
            ).order_by(PriceMaster.category, PriceMaster.item_name).all()
            
            # DataFrame作成
            data = []
            for item in items:
                data.append({
                    "項目コード": item.item_code,
                    "項目名": item.item_name,
                    "カテゴリ": item.category,
                    "単位": item.standard_unit,
                    "仕入額": float(item.purchase_price or 0),
                    "掛け率": float(item.markup_rate or 1.3),
                    "調整額": float(item.adjustment_amount or 0),
                    "最終価格": float(item.final_price or 0),
                    "標準価格": float(item.standard_price or 0),
                    "計算方法": item.price_calculation_method,
                    "品質グレード": item.quality_grade,
                    "仕入先": item.supplier_name,
                    "リードタイム": item.lead_time_days,
                    "備考": item.notes
                })
            
            df = pd.DataFrame(data)
            
            if format_type == "excel":
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, sheet_name='単価マスター', index=False)
                    
                    # ワークシート取得して書式設定
                    worksheet = writer.sheets['単価マスター']
                    
                    # 列幅自動調整
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        adjusted_width = (max_length + 2) * 1.2
                        worksheet.column_dimensions[column_letter].width = adjusted_width
                
                return output.getvalue()
            
            elif format_type == "csv":
                output = io.StringIO()
                df.to_csv(output, index=False, encoding='utf-8-sig')
                return output.getvalue().encode('utf-8-sig')
            
            else:
                raise Exception("サポートされていないフォーマットです")
                
        except Exception as e:
            raise Exception(f"エクスポートエラー: {str(e)}")
    
    def import_price_master(self, file_content: bytes, file_type: str = "excel") -> Dict[str, Any]:
        """単価マスターインポート"""
        try:
            # ファイル読み込み
            if file_type == "excel":
                df = pd.read_excel(io.BytesIO(file_content), sheet_name=0)
            elif file_type == "csv":
                df = pd.read_csv(io.StringIO(file_content.decode('utf-8-sig')))
            else:
                raise Exception("サポートされていないファイル形式です")
            
            # 必須カラムチェック
            required_columns = ["項目コード", "項目名", "単位", "仕入額", "掛け率"]
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise Exception(f"必須カラムが不足しています: {', '.join(missing_columns)}")
            
            # データ処理
            success_count = 0
            error_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # データ取得・変換
                    item_code = str(row["項目コード"]).strip()
                    item_name = str(row["項目名"]).strip()
                    
                    # 既存データチェック
                    existing_item = self.db.query(PriceMaster).filter(
                        and_(
                            PriceMaster.company_id == self.company_id,
                            PriceMaster.item_code == item_code
                        )
                    ).first()
                    
                    # データ準備
                    item_data = {
                        "item_code": item_code,
                        "item_name": item_name,
                        "standard_unit": str(row["単位"]).strip(),
                        "purchase_price": float(row["仕入額"]) if pd.notna(row["仕入額"]) else 0,
                        "markup_rate": float(row["掛け率"]) if pd.notna(row["掛け率"]) else 1.3,
                        "adjustment_amount": float(row.get("調整額", 0)) if pd.notna(row.get("調整額", 0)) else 0,
                        "category": str(row.get("カテゴリ", "")).strip() or "その他",
                        "supplier_name": str(row.get("仕入先", "")).strip() or None,
                        "quality_grade": str(row.get("品質グレード", "A")).strip(),
                        "notes": str(row.get("備考", "")).strip() or None,
                        "price_calculation_method": "markup"
                    }
                    
                    if existing_item:
                        # 更新
                        for key, value in item_data.items():
                            setattr(existing_item, key, value)
                    else:
                        # 新規作成
                        new_item = PriceMaster(
                            company_id=self.company_id,
                            **item_data
                        )
                        self.db.add(new_item)
                    
                    success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    errors.append(f"行{index + 2}: {str(e)}")
            
            if success_count > 0:
                self.db.commit()
            
            return {
                "success_count": success_count,
                "error_count": error_count,
                "errors": errors,
                "message": f"インポート完了: 成功{success_count}件、エラー{error_count}件"
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"インポートエラー: {str(e)}")
    
    # ======================================
    # 価格履歴・分析
    # ======================================
    
    def get_price_history(self, item_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """価格履歴取得"""
        try:
            history = self.db.query(PriceHistory).filter(
                PriceHistory.item_id == item_id
            ).order_by(desc(PriceHistory.created_at)).limit(limit).all()
            
            result = []
            for h in history:
                result.append({
                    "history_id": h.history_id,
                    "change_type": h.change_type,
                    "change_reason": h.change_reason,
                    "effective_date": h.effective_date.isoformat() if h.effective_date else None,
                    "previous_final_price": float(h.previous_final_price or 0),
                    "new_final_price": float(h.new_final_price or 0),
                    "price_change_amount": float((h.new_final_price or 0) - (h.previous_final_price or 0)),
                    "price_change_rate": float(((h.new_final_price or 0) - (h.previous_final_price or 0)) / (h.previous_final_price or 1) * 100),
                    "created_at": h.created_at.isoformat() if h.created_at else None
                })
            
            return result
        except Exception as e:
            raise Exception(f"価格履歴取得エラー: {str(e)}")
    
    def bulk_price_update(self, 
                         category_id: Optional[int] = None,
                         markup_rate_adjustment: Optional[float] = None,
                         price_adjustment: Optional[float] = None,
                         adjustment_type: str = "percentage") -> Dict[str, Any]:
        """一括価格更新"""
        try:
            query = self.db.query(PriceMaster).filter(
                and_(
                    PriceMaster.company_id == self.company_id,
                    PriceMaster.is_active == True
                )
            )
            
            if category_id:
                query = query.filter(PriceMaster.category_id == category_id)
            
            items = query.all()
            updated_count = 0
            
            for item in items:
                old_final_price = item.final_price
                
                if markup_rate_adjustment:
                    if adjustment_type == "percentage":
                        item.markup_rate = float(item.markup_rate or 1.3) * (1 + markup_rate_adjustment / 100)
                    else:
                        item.markup_rate = float(item.markup_rate or 1.3) + markup_rate_adjustment
                
                if price_adjustment:
                    if adjustment_type == "percentage":
                        item.adjustment_amount = float(item.adjustment_amount or 0) + (float(item.final_price or 0) * price_adjustment / 100)
                    else:
                        item.adjustment_amount = float(item.adjustment_amount or 0) + price_adjustment
                
                updated_count += 1
            
            self.db.commit()
            
            return {
                "updated_count": updated_count,
                "category_id": category_id,
                "markup_rate_adjustment": markup_rate_adjustment,
                "price_adjustment": price_adjustment,
                "adjustment_type": adjustment_type,
                "message": f"{updated_count}件の単価を一括更新しました"
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"一括更新エラー: {str(e)}")