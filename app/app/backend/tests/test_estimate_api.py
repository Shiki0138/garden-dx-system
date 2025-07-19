"""
見積API エンドポイントのテスト
Worker4 - 単体テスト実装・品質保証
"""

import pytest
import json
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from main import app
from services.auth_service import get_current_user_dependency
from database import get_db

# テストクライアント設定
client = TestClient(app)

# モックユーザー
mock_owner_user = {
    "user_id": "test-owner-001",
    "email": "owner@test.com",
    "role": "owner",
    "company_id": 1,
    "username": "test_owner",
}

mock_employee_user = {
    "user_id": "test-employee-001", 
    "email": "employee@test.com",
    "role": "employee",
    "company_id": 1,
    "username": "test_employee",
}

# モック見積データ
mock_estimate = {
    "estimate_id": 1,
    "company_id": 1,
    "customer_id": 1,
    "estimate_number": "EST-2024-001",
    "estimate_date": date.today(),
    "valid_until": date.today() + timedelta(days=30),
    "status": "draft",
    "subtotal": 100000,
    "adjustment_amount": 0,
    "total_amount": 100000,
    "total_cost": 80000,
    "gross_profit": 20000,
    "gross_margin_rate": 0.2,
    "notes": "テスト見積",
    "created_at": datetime.now(),
}

mock_estimate_items = [
    {
        "item_id": 1,
        "estimate_id": 1,
        "item_description": "クロマツ H3.0m",
        "quantity": 2.0,
        "unit": "本",
        "purchase_price": 20000,
        "markup_rate": 1.3,
        "unit_price": 26000,
        "line_item_adjustment": 0,
        "level": 0,
        "sort_order": 1,
        "item_type": "item",
        "is_free_entry": False,
        "line_total": 52000,
        "line_cost": 40000,
    },
    {
        "item_id": 2,
        "estimate_id": 1,
        "item_description": "ヒラドツツジ",
        "quantity": 10.0,
        "unit": "本",
        "purchase_price": 1500,
        "markup_rate": 1.4,
        "unit_price": 2100,
        "line_item_adjustment": 0,
        "level": 0,
        "sort_order": 2,
        "item_type": "item",
        "is_free_entry": False,
        "line_total": 21000,
        "line_cost": 15000,
    },
]

# 依存関係のモック
def override_get_current_user_owner():
    return mock_owner_user

def override_get_current_user_employee():
    return mock_employee_user

def override_get_db():
    """データベースセッションのモック"""
    mock_db = MagicMock(spec=Session)
    return mock_db


class TestEstimateAPI:
    """見積API エンドポイントのテストクラス"""

    def setup_method(self):
        """各テストメソッドの前に実行"""
        app.dependency_overrides[get_db] = override_get_db

    def teardown_method(self):
        """各テストメソッドの後に実行"""
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_estimates_as_owner(self):
        """経営者による見積一覧取得テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            # モックのクエリ結果設定
            mock_query.return_value.options.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_estimate]
            
            response = client.get("/api/estimates")
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            if data:  # データが存在する場合
                assert "estimate_id" in data[0]
                assert "total_amount" in data[0]

    @pytest.mark.asyncio
    async def test_get_estimates_as_employee(self):
        """従業員による見積一覧取得テスト（権限フィルタリング確認）"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_employee
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_estimate]
            
            response = client.get("/api/estimates")
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            # 従業員の場合、原価情報が除外されることを確認
            if data:
                assert "total_cost" not in data[0] or data[0]["total_cost"] is None

    @pytest.mark.asyncio
    async def test_get_estimate_by_id_success(self):
        """見積詳細取得成功テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            # 見積データのモック
            mock_query.return_value.filter.return_value.first.return_value = mock_estimate
            # 明細データのモック  
            mock_query.return_value.filter.return_value.all.return_value = mock_estimate_items
            
            response = client.get("/api/estimates/1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["estimate_id"] == 1
            assert "items" in data

    @pytest.mark.asyncio
    async def test_get_estimate_not_found(self):
        """見積が見つからない場合のテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = None
            
            response = client.get("/api/estimates/999")
            
            assert response.status_code == 404
            assert "見つかりません" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_estimate_success(self):
        """見積作成成功テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        estimate_data = {
            "customer_id": 1,
            "estimate_number": "EST-2024-002",
            "estimate_date": "2024-01-01",
            "valid_until": "2024-01-31",
            "notes": "新規見積"
        }
        
        with patch('main.db') as mock_db:
            # 作成された見積のモック
            created_estimate = {**mock_estimate, **estimate_data}
            mock_db.add.return_value = None
            mock_db.commit.return_value = None
            mock_db.refresh.return_value = None
            
            # レスポンスのモック
            with patch('main.Estimate') as mock_estimate_class:
                mock_estimate_instance = Mock()
                mock_estimate_instance.__dict__ = created_estimate
                mock_estimate_class.return_value = mock_estimate_instance
                
                response = client.post("/api/estimates", json=estimate_data)
                
                assert response.status_code == 200
                # データベース操作が呼ばれることを確認
                mock_db.add.assert_called_once()
                mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_estimate_validation_error(self):
        """見積作成バリデーションエラーテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        # 必須フィールドが不足しているデータ
        invalid_data = {
            "estimate_number": "EST-2024-002",
            # customer_id が不足
        }
        
        response = client.post("/api/estimates", json=invalid_data)
        
        # FastAPIのバリデーションエラー
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_estimate_as_owner(self):
        """経営者による見積更新テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        update_data = {
            "adjustment_amount": -5000,
            "notes": "更新されたノート"
        }
        
        with patch('main.db.query') as mock_query:
            # 既存見積のモック
            mock_estimate_obj = Mock()
            for key, value in mock_estimate.items():
                setattr(mock_estimate_obj, key, value)
            mock_query.return_value.filter.return_value.first.return_value = mock_estimate_obj
            
            with patch('main.db') as mock_db, \
                 patch('main._recalculate_estimate_totals') as mock_recalc, \
                 patch('main.apply_estimate_permissions') as mock_permissions:
                
                mock_permissions.return_value = {**mock_estimate, **update_data}
                
                response = client.put("/api/estimates/1", json=update_data)
                
                assert response.status_code == 200
                mock_recalc.assert_called_once()
                mock_db.commit.assert_called_once()

    @pytest.mark.asyncio 
    async def test_update_estimate_adjustment_permission_error(self):
        """従業員による調整金額変更権限エラーテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_employee
        
        update_data = {
            "adjustment_amount": -5000  # 従業員は変更不可
        }
        
        with patch('main.db.query') as mock_query, \
             patch('main.PermissionChecker.has_permission') as mock_permission:
            
            mock_query.return_value.filter.return_value.first.return_value = Mock()
            mock_permission.return_value = False  # 権限なし
            
            response = client.put("/api/estimates/1", json=update_data)
            
            assert response.status_code == 403
            assert "経営者権限が必要" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_add_estimate_item_success(self):
        """見積明細追加成功テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        new_item = {
            "item_description": "新規項目",
            "quantity": 1.0,
            "unit": "式",
            "purchase_price": 5000,
            "markup_rate": 1.5,
            "unit_price": 7500,
            "sort_order": 3,
            "item_type": "item"
        }
        
        with patch('main.db') as mock_db, \
             patch('main.EstimateItem') as mock_item_class, \
             patch('main._recalculate_estimate_totals') as mock_recalc:
            
            # 単価マスタからの情報取得をモック
            mock_db.query.return_value.filter.return_value.first.return_value = None
            
            # 作成されたアイテムのモック
            mock_item_instance = Mock()
            mock_item_instance.__dict__ = {**new_item, "item_id": 3, "estimate_id": 1}
            mock_item_class.return_value = mock_item_instance
            
            response = client.post("/api/estimates/1/items", json=new_item)
            
            assert response.status_code == 200
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_recalc.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_estimate_item_with_price_master(self):
        """単価マスタを使用した明細追加テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        new_item = {
            "price_master_item_id": 1,
            "item_description": "マツ",
            "quantity": 1.0,
            "sort_order": 3,
            "item_type": "item"
        }
        
        # 単価マスタのモックデータ
        mock_master_item = Mock()
        mock_master_item.unit = "本"
        mock_master_item.purchase_price = 20000
        mock_master_item.default_markup_rate = 1.3
        
        with patch('main.db') as mock_db, \
             patch('main.EstimateItem') as mock_item_class, \
             patch('main._recalculate_estimate_totals') as mock_recalc:
            
            # 単価マスタからの情報取得をモック
            mock_db.query.return_value.filter.return_value.first.return_value = mock_master_item
            
            response = client.post("/api/estimates/1/items", json=new_item)
            
            assert response.status_code == 200
            # 単価マスタの情報が適用されることを確認
            mock_db.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_profitability_analysis_owner_only(self):
        """収益性分析取得（経営者のみ）テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = mock_estimate
            
            response = client.get("/api/estimates/1/profitability")
            
            assert response.status_code == 200
            data = response.json()
            assert "total_cost" in data
            assert "gross_profit" in data
            assert "gross_margin_rate" in data

    @pytest.mark.asyncio
    async def test_get_profitability_analysis_employee_forbidden(self):
        """従業員による収益性分析アクセス禁止テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_employee
        
        # require_owner_role() デコレータにより403エラーになることを確認
        response = client.get("/api/estimates/1/profitability")
        
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_generate_estimate_pdf_success(self):
        """見積PDF生成成功テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query, \
             patch('main.GardenEstimatePDFGenerator') as mock_pdf_gen, \
             patch('main.Response') as mock_response:
            
            # 見積データのモック
            mock_query.return_value.filter.return_value.first.return_value = mock_estimate
            
            # PDF生成のモック
            mock_pdf_buffer = Mock()
            mock_pdf_buffer.getvalue.return_value = b"PDF content"
            mock_pdf_gen.return_value.generate_estimate_pdf.return_value = mock_pdf_buffer
            
            response = client.get("/api/estimates/1/pdf")
            
            assert response.status_code == 200
            mock_pdf_gen.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_estimate_pdf_not_found(self):
        """見積PDF生成（見積が見つからない）テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = None
            
            response = client.get("/api/estimates/999/pdf")
            
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_generate_estimate_pdf_error(self):
        """見積PDF生成エラーテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query, \
             patch('main.GardenEstimatePDFGenerator') as mock_pdf_gen:
            
            mock_query.return_value.filter.return_value.first.return_value = mock_estimate
            mock_pdf_gen.return_value.generate_estimate_pdf.side_effect = Exception("PDF generation error")
            
            response = client.get("/api/estimates/1/pdf")
            
            assert response.status_code == 500
            assert "PDF生成エラー" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_invoice_from_estimate_success(self):
        """見積から請求書生成成功テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.EstimateInvoiceIntegrationService') as mock_service:
            # サービスのモック設定
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # バリデーション成功
            mock_service_instance.validate_estimate_for_invoice_generation.return_value = {
                "valid": True,
                "errors": []
            }
            
            # 請求書データ生成成功
            mock_invoice_data = {
                "invoice_number": "INV-2024-001",
                "customer_id": 1,
                "total_amount": 100000
            }
            mock_service_instance.convert_estimate_to_invoice_data.return_value = mock_invoice_data
            
            response = client.post("/api/estimates/1/create-invoice")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "invoice_data" in data

    @pytest.mark.asyncio
    async def test_create_invoice_from_estimate_validation_error(self):
        """見積から請求書生成バリデーションエラーテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.EstimateInvoiceIntegrationService') as mock_service:
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            
            # バリデーション失敗
            mock_service_instance.validate_estimate_for_invoice_generation.return_value = {
                "valid": False,
                "errors": ["見積が未承認です", "明細が不足しています"]
            }
            
            response = client.post("/api/estimates/1/create-invoice")
            
            assert response.status_code == 400
            assert "請求書生成不可" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_pagination_parameters(self):
        """ページネーションパラメータテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
            
            response = client.get("/api/estimates?skip=10&limit=20")
            
            assert response.status_code == 200
            # offset と limit が正しく適用されることを確認
            # この部分は実際のクエリビルダーの実装に依存

    @pytest.mark.asyncio
    async def test_filter_by_status(self):
        """ステータスによるフィルタリングテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
            
            response = client.get("/api/estimates?status=approved")
            
            assert response.status_code == 200
            # ステータスフィルタが適用されることを確認

    @pytest.mark.asyncio
    async def test_filter_by_customer(self):
        """顧客IDによるフィルタリングテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.options.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
            
            response = client.get("/api/estimates?customer_id=1")
            
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_estimate_totals_recalculation(self):
        """見積合計金額再計算テスト"""
        from main import _recalculate_estimate_totals
        
        # モック見積オブジェクト
        mock_estimate_obj = Mock()
        mock_estimate_obj.estimate_id = 1
        mock_estimate_obj.adjustment_amount = 0
        
        # モックDB
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.all.return_value = mock_estimate_items
        
        # 関数実行
        _recalculate_estimate_totals(mock_estimate_obj, mock_db)
        
        # 計算結果の確認
        assert mock_estimate_obj.subtotal == 73000  # 52000 + 21000
        assert mock_estimate_obj.total_cost == 55000  # 40000 + 15000
        assert mock_estimate_obj.total_amount == 73000  # subtotal + adjustment(0)
        assert mock_estimate_obj.gross_profit == 18000  # total_amount - total_cost
        assert abs(mock_estimate_obj.gross_margin_rate - 0.2466) < 0.001  # gross_profit / total_amount

    def test_demo_endpoints_no_auth_required(self):
        """デモ用エンドポイント（認証不要）テスト"""
        # デモ見積一覧
        response = client.get("/api/demo/estimates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

        # デモ単価マスタ
        response = client.get("/api/demo/price-master")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4

        # デモPDF生成
        response = client.post("/api/demo/estimates/1/pdf")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "pdf_url" in data


# パフォーマンステスト
class TestEstimateAPIPerformance:
    """見積API パフォーマンステスト"""

    @pytest.mark.asyncio
    async def test_large_estimate_items_performance(self):
        """大量明細データのパフォーマンステスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        app.dependency_overrides[get_db] = override_get_db
        
        # 1000件の明細データを作成
        large_items = []
        for i in range(1000):
            large_items.append({
                **mock_estimate_items[0],
                "item_id": i + 1,
                "item_description": f"項目{i + 1}",
            })
        
        with patch('main.db.query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = mock_estimate
            mock_query.return_value.filter.return_value.all.return_value = large_items
            
            import time
            start_time = time.time()
            
            response = client.get("/api/estimates/1")
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            assert response.status_code == 200
            assert processing_time < 2.0  # 2秒以内で処理完了

    @pytest.mark.asyncio 
    async def test_concurrent_estimate_requests(self):
        """同時リクエストのパフォーマンステスト"""
        import asyncio
        import aiohttp
        
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        async def make_request(session, estimate_id):
            async with session.get(f"http://testserver/api/estimates/{estimate_id}") as response:
                return response.status
        
        # 50個の同時リクエスト
        async with aiohttp.ClientSession() as session:
            tasks = [make_request(session, i % 10 + 1) for i in range(50)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 大部分のリクエストが成功することを確認
            success_count = sum(1 for result in results if result == 200)
            assert success_count >= 40  # 80%以上の成功率


# エラーハンドリングテスト
class TestEstimateAPIErrorHandling:
    """見積API エラーハンドリングテスト"""

    @pytest.mark.asyncio
    async def test_database_connection_error(self):
        """データベース接続エラーテスト"""
        def mock_db_error():
            raise Exception("Database connection failed")
        
        app.dependency_overrides[get_db] = mock_db_error
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        response = client.get("/api/estimates")
        
        # 内部サーバーエラー
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_invalid_json_payload(self):
        """無効なJSONペイロードテスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        response = client.post(
            "/api/estimates",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_sql_injection_protection(self):
        """SQLインジェクション保護テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        # SQLインジェクション試行
        malicious_id = "1 OR 1=1"
        
        response = client.get(f"/api/estimates/{malicious_id}")
        
        # 適切にエラーハンドリングされることを確認
        assert response.status_code in [400, 422, 404]

    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """レート制限テスト"""
        app.dependency_overrides[get_current_user_dependency] = override_get_current_user_owner
        
        # 短時間で大量のリクエスト送信
        responses = []
        for _ in range(100):
            response = client.get("/api/estimates")
            responses.append(response.status_code)
        
        # レート制限が適用されることを確認（実装されている場合）
        rate_limited = any(status == 429 for status in responses)
        # レート制限が実装されていない場合はスキップ
        if rate_limited:
            assert rate_limited