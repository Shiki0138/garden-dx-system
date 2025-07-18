"""
Garden 造園業向け統合業務管理システム
見積書・請求書連携サービス - 造園業界標準準拠
Worker1 (見積書) ⇔ Worker3 (請求書) システム統合
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from decimal import Decimal
import logging

from models import Estimate, EstimateItem, Customer, Company
from schemas import EstimateCreate, EstimateUpdate

logger = logging.getLogger(__name__)

class EstimateInvoiceIntegrationService:
    """見積書・請求書統合連携サービス"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def convert_estimate_to_invoice_data(self, estimate_id: int) -> Dict[str, Any]:
        """
        見積書データから請求書データへの変換
        造園業界標準の変換ルールを適用
        
        Args:
            estimate_id: 見積ID
            
        Returns:
            請求書生成用データ辞書
        """
        try:
            # 見積データ取得（関連データ含む）
            estimate = self.db.query(Estimate)\
                              .filter(Estimate.estimate_id == estimate_id)\
                              .first()
            
            if not estimate:
                raise ValueError(f"見積ID {estimate_id} が見つかりません")
            
            # 顧客・会社情報取得
            customer = self.db.query(Customer)\
                             .filter(Customer.customer_id == estimate.customer_id)\
                             .first()
            
            company = self.db.query(Company)\
                            .filter(Company.company_id == estimate.company_id)\
                            .first()
            
            # 見積明細取得
            estimate_items = self.db.query(EstimateItem)\
                                   .filter(EstimateItem.estimate_id == estimate_id)\
                                   .order_by(EstimateItem.sort_order)\
                                   .all()
            
            # 請求書番号生成（見積番号ベース）
            invoice_number = self._generate_invoice_number(estimate.estimate_number)
            
            # 請求書データ構築
            invoice_data = {
                # 基本情報
                "invoice_number": invoice_number,
                "invoice_date": datetime.now().date().isoformat(),
                "due_date": self._calculate_due_date(datetime.now().date()).isoformat(),
                "estimate_id": estimate_id,
                "estimate_number": estimate.estimate_number,
                
                # 顧客情報
                "customer": {
                    "customer_id": customer.customer_id if customer else None,
                    "customer_name": customer.customer_name if customer else "お客様",
                    "address": customer.address if customer else "",
                    "phone": customer.phone if customer else "",
                    "email": customer.email if customer else "",
                },
                
                # 会社情報
                "company": {
                    "company_id": company.company_id if company else None,
                    "company_name": company.company_name if company else "株式会社庭園工房",
                    "address": company.address if company else "",
                    "phone": company.phone if company else "",
                    "email": company.email if company else "",
                    "logo_url": company.logo_url if company else None,
                },
                
                # 工事情報（見積から引継ぎ）
                "project_info": {
                    "project_name": estimate.estimate_name or "造園工事",
                    "site_address": estimate.site_address or "",
                    "work_period": self._generate_work_period_text(estimate),
                    "completion_date": datetime.now().date().isoformat(),  # 実際は工事完了日
                },
                
                # 金額情報（消費税計算含む）
                "amounts": self._calculate_invoice_amounts(estimate),
                
                # 明細情報（造園業界標準フォーマット）
                "items": self._convert_estimate_items_to_invoice(estimate_items),
                
                # 支払条件・振込先（造園業界標準）
                "payment_terms": self._generate_payment_terms(company),
                
                # 特記事項（見積から引継ぎ+請求書追加事項）
                "notes": self._generate_invoice_notes(estimate),
                
                # メタデータ
                "created_from_estimate": True,
                "conversion_date": datetime.now().isoformat(),
                "status": "draft",
            }
            
            return invoice_data
            
        except Exception as e:
            logger.error(f"見積→請求書変換エラー (見積ID: {estimate_id}): {str(e)}")
            raise
    
    def _generate_invoice_number(self, estimate_number: str) -> str:
        """見積番号から請求書番号生成"""
        if estimate_number:
            # 見積番号 "2025-0001" → 請求書番号 "INV-2025-0001"
            return f"INV-{estimate_number}"
        else:
            # フォールバック
            current_year = datetime.now().year
            return f"INV-{current_year}-0001"
    
    def _calculate_due_date(self, invoice_date: date) -> date:
        """支払期限計算（造園業界標準：30日後）"""
        from datetime import timedelta
        return invoice_date + timedelta(days=30)
    
    def _calculate_invoice_amounts(self, estimate: Estimate) -> Dict[str, Any]:
        """請求書金額計算（消費税対応）"""
        subtotal = int(estimate.subtotal_amount or 0)
        adjustment = int(estimate.adjustment_amount or 0)
        subtotal_with_adjustment = subtotal + adjustment
        
        # 消費税計算（造園工事は標準税率10%）
        tax_rate = Decimal('0.10')
        tax_amount = int(subtotal_with_adjustment * tax_rate)
        total_amount = subtotal_with_adjustment + tax_amount
        
        return {
            "subtotal": subtotal,
            "adjustment": adjustment,
            "subtotal_with_adjustment": subtotal_with_adjustment,
            "tax_rate": float(tax_rate),
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "total_amount_text": self._amount_to_japanese_text(total_amount),
        }
    
    def _convert_estimate_items_to_invoice(self, estimate_items: List[EstimateItem]) -> List[Dict[str, Any]]:
        """見積明細から請求書明細への変換"""
        invoice_items = []
        
        for item in estimate_items:
            # 造園業界標準：顧客向け表示項目のみ請求書に含める
            if not item.is_visible_to_customer:
                continue
                
            invoice_item = {
                "item_type": item.item_type,
                "description": item.item_description,
                "specification": item.specification,
                "quantity": float(item.quantity) if item.quantity else 0,
                "unit": item.unit,
                "unit_price": int(item.unit_price) if item.unit_price else 0,
                "line_adjustment": int(item.line_item_adjustment) if item.line_item_adjustment else 0,
                "line_total": int(item.line_total) if item.line_total else 0,
                "level": item.level,
                "sort_order": item.sort_order,
                
                # 請求書特有項目
                "work_completed": True,  # 工事完了フラグ
                "completion_notes": "",  # 完了備考
            }
            
            invoice_items.append(invoice_item)
        
        return invoice_items
    
    def _generate_work_period_text(self, estimate: Estimate) -> str:
        """工事期間テキスト生成"""
        # 実際のプロジェクト情報があればそれを使用
        # ここでは見積情報から推定
        estimate_date = estimate.estimate_date
        if estimate_date:
            # 見積日から1ヶ月後を想定完了日として設定
            from datetime import timedelta
            estimated_completion = estimate_date + timedelta(days=30)
            return f"{estimate_date.strftime('%Y年%m月%d日')} ～ {estimated_completion.strftime('%Y年%m月%d日')}"
        else:
            return "別途協議"
    
    def _generate_payment_terms(self, company: Optional[Company]) -> Dict[str, Any]:
        """支払条件・振込先情報生成（造園業界標準）"""
        # 実際の運用では会社マスタから取得
        default_bank_info = {
            "bank_name": "○○銀行",
            "branch_name": "○○支店",
            "account_type": "普通",
            "account_number": "1234567",
            "account_holder": company.company_name if company else "株式会社庭園工房",
        }
        
        return {
            "payment_deadline": "請求書発行日より30日以内",
            "payment_method": "銀行振込",
            "bank_info": default_bank_info,
            "notes": [
                "振込手数料はお客様のご負担でお願いいたします",
                "工事完了後、速やかに請求書を発行いたします",
                "お支払いが遅れる場合は事前にご連絡ください",
            ]
        }
    
    def _generate_invoice_notes(self, estimate: Estimate) -> List[str]:
        """請求書特記事項生成"""
        notes = []
        
        # 見積書からの引継ぎ
        if estimate.notes:
            notes.append(f"【見積時特記事項】\n{estimate.notes}")
        
        # 請求書標準特記事項（造園業界）
        standard_invoice_notes = [
            "【工事完了のご報告】",
            "この度は貴重なお時間をいただき、工事をご依頼いただきありがとうございました。",
            "ご指定の工事は予定通り完了いたしましたので、ご請求申し上げます。",
            "",
            "【アフターサービスについて】",
            "・植栽の枯れ保証：植栽完了日より1年間（天災・人災除く）",
            "・工事保証：工事完了日より1年間",
            "・メンテナンスのご相談も承っております",
            "",
            "【お問い合わせ】",
            "工事内容やお支払いについてご不明な点がございましたら、",
            "お気軽にお問い合わせください。",
            "",
            "今後ともよろしくお願い申し上げます。",
        ]
        
        notes.extend(standard_invoice_notes)
        return notes
    
    def _amount_to_japanese_text(self, amount: int) -> str:
        """金額を日本語テキストに変換（請求書用）"""
        # 簡易実装：実際はより詳細な日本語数字変換が必要
        units = ["", "万", "億", "兆"]
        
        if amount == 0:
            return "零円"
        
        # 万の位で区切って処理
        parts = []
        unit_index = 0
        
        while amount > 0 and unit_index < len(units):
            part = amount % 10000
            if part > 0:
                parts.append(f"{part:,}{units[unit_index]}")
            amount //= 10000
            unit_index += 1
        
        return "".join(reversed(parts)) + "円"
    
    def validate_estimate_for_invoice_generation(self, estimate_id: int) -> Dict[str, Any]:
        """見積書の請求書生成可能性チェック"""
        try:
            estimate = self.db.query(Estimate)\
                              .filter(Estimate.estimate_id == estimate_id)\
                              .first()
            
            if not estimate:
                return {
                    "valid": False,
                    "errors": ["指定された見積が見つかりません"],
                }
            
            errors = []
            warnings = []
            
            # 基本データチェック
            if not estimate.customer_id:
                errors.append("顧客情報が設定されていません")
            
            if not estimate.estimate_number:
                errors.append("見積番号が設定されていません")
            
            if estimate.total_amount <= 0:
                errors.append("見積金額が0円以下です")
            
            # ステータスチェック
            if estimate.status not in ['承認', '契約済', '完了']:
                warnings.append(f"見積ステータスが '{estimate.status}' です。通常は承認済み見積から請求書を作成します。")
            
            # 明細チェック
            items_count = self.db.query(EstimateItem)\
                                .filter(EstimateItem.estimate_id == estimate_id)\
                                .filter(EstimateItem.item_type == 'item')\
                                .count()
            
            if items_count == 0:
                errors.append("見積明細が登録されていません")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "estimate_info": {
                    "estimate_number": estimate.estimate_number,
                    "customer_name": estimate.customer.customer_name if estimate.customer else None,
                    "total_amount": estimate.total_amount,
                    "status": estimate.status,
                    "items_count": items_count,
                }
            }
            
        except Exception as e:
            logger.error(f"見積書検証エラー: {str(e)}")
            return {
                "valid": False,
                "errors": [f"見積書検証中にエラーが発生しました: {str(e)}"],
            }

# 使用例・テスト用の関数
def test_estimate_invoice_integration(db: Session, estimate_id: int) -> Dict[str, Any]:
    """見積書・請求書連携テスト"""
    service = EstimateInvoiceIntegrationService(db)
    
    # 1. 見積書検証
    validation_result = service.validate_estimate_for_invoice_generation(estimate_id)
    if not validation_result["valid"]:
        return {
            "success": False,
            "step": "validation",
            "result": validation_result,
        }
    
    # 2. データ変換テスト
    try:
        invoice_data = service.convert_estimate_to_invoice_data(estimate_id)
        return {
            "success": True,
            "step": "conversion",
            "validation_result": validation_result,
            "invoice_data": invoice_data,
            "summary": {
                "invoice_number": invoice_data["invoice_number"],
                "customer_name": invoice_data["customer"]["customer_name"],
                "total_amount": invoice_data["amounts"]["total_amount"],
                "items_count": len(invoice_data["items"]),
            }
        }
    except Exception as e:
        return {
            "success": False,
            "step": "conversion",
            "error": str(e),
            "validation_result": validation_result,
        }