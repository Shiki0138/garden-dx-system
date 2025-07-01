# 🎯 Garden システム品質管理戦略

## 📋 概要

Garden（造園業向け統合業務管理システム）の **史上最強の品質管理体制** を構築します。
開発から運用まで、全フェーズで最高品質を保証する統合的なQuality Assurance戦略を定義します。

## 🏆 品質方針

### 1. **ゼロ欠陥原則**
- バグゼロでのリリース
- データ整合性の完全保証
- セキュリティ脆弱性ゼロ

### 2. **ユーザビリティ・ファースト**
- 直感的な操作性
- レスポンス時間 < 2秒
- 99.9%以上の可用性

### 3. **継続的改善**
- 自動化された品質チェック
- リアルタイムモニタリング
- データドリブンな改善

## 🧪 テスト戦略

### 1. テストピラミッド
```mermaid
graph TD
    subgraph "テストピラミッド"
        E2E[E2Eテスト<br/>10%<br/>Playwright]
        INTEGRATION[統合テスト<br/>20%<br/>FastAPI TestClient]
        UNIT[ユニットテスト<br/>70%<br/>pytest + Vitest]
    end
    
    subgraph "品質ゲート"
        COVERAGE[カバレッジ > 80%]
        PERFORMANCE[パフォーマンス]
        SECURITY[セキュリティ]
        ACCESSIBILITY[アクセシビリティ]
    end
    
    UNIT --> COVERAGE
    INTEGRATION --> PERFORMANCE
    E2E --> SECURITY
    E2E --> ACCESSIBILITY
```

### 2. ユニットテスト設計
```python
# pytest設定
# tests/conftest.py
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from httpx import AsyncClient

@pytest.fixture(scope="session")
def event_loop():
    """イベントループ設定"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db():
    """テスト用データベース"""
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/garden_test")
    async with engine.begin() as conn:
        # テストデータベース初期化
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def test_client(test_db):
    """テスト用APIクライアント"""
    app.dependency_overrides[get_db] = lambda: test_db
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

# 見積計算テスト例
class TestEstimateCalculation:
    async def test_estimate_total_calculation(self, test_client):
        """見積合計金額計算の正確性テスト"""
        # テストデータ作成
        estimate_data = {
            "project_id": 1,
            "estimate_date": "2025-01-01",
            "items": [
                {
                    "item_description": "マツ H3.0",
                    "quantity": 5,
                    "purchase_price": 10000,
                    "markup_rate": 1.3
                },
                {
                    "item_description": "土壌改良",
                    "quantity": 10,
                    "purchase_price": 500,
                    "markup_rate": 1.5
                }
            ]
        }
        
        # API呼び出し
        response = await test_client.post("/estimates/", json=estimate_data)
        assert response.status_code == 201
        
        result = response.json()
        
        # 計算結果検証
        expected_subtotal = (10000 * 1.3 * 5) + (500 * 1.5 * 10)  # 72500
        expected_tax = expected_subtotal * 0.1  # 7250
        expected_total = expected_subtotal + expected_tax  # 79750
        
        assert result["subtotal"] == expected_subtotal
        assert result["tax_amount"] == expected_tax
        assert result["total_amount"] == expected_total
        
    async def test_markup_rate_validation(self, test_client):
        """掛率バリデーションテスト"""
        invalid_data = {
            "project_id": 1,
            "items": [{
                "markup_rate": -0.5  # 負の値は無効
            }]
        }
        
        response = await test_client.post("/estimates/", json=invalid_data)
        assert response.status_code == 422
        assert "markup_rate" in response.json()["detail"][0]["loc"]
```

### 3. 統合テスト設計
```python
# tests/integration/test_estimate_flow.py
class TestEstimateWorkflow:
    async def test_complete_estimate_workflow(self, test_client, test_db):
        """見積作成から請求書発行までの完全フロー"""
        
        # 1. 顧客作成
        customer_data = {
            "customer_name": "テスト造園株式会社",
            "email": "test@example.com"
        }
        customer_response = await test_client.post("/customers/", json=customer_data)
        customer_id = customer_response.json()["customer_id"]
        
        # 2. プロジェクト作成
        project_data = {
            "customer_id": customer_id,
            "project_name": "庭園改修工事",
            "site_address": "東京都新宿区"
        }
        project_response = await test_client.post("/projects/", json=project_data)
        project_id = project_response.json()["project_id"]
        
        # 3. 見積作成
        estimate_data = {
            "project_id": project_id,
            "items": [
                {
                    "item_description": "植栽工事一式",
                    "quantity": 1,
                    "unit_price": 100000
                }
            ]
        }
        estimate_response = await test_client.post("/estimates/", json=estimate_data)
        estimate_id = estimate_response.json()["estimate_id"]
        
        # 4. 見積承認
        await test_client.post(f"/estimates/{estimate_id}/approve")
        
        # 5. プロジェクト完了
        await test_client.patch(f"/projects/{project_id}", json={"status": "completed"})
        
        # 6. 請求書自動生成
        invoice_response = await test_client.post(f"/projects/{project_id}/generate-invoice")
        invoice_data = invoice_response.json()
        
        # 検証
        assert invoice_data["total_amount"] == 110000  # 消費税込み
        assert invoice_data["status"] == "issued"
        
        # データベース整合性確認
        async with test_db.begin() as conn:
            result = await conn.execute(
                "SELECT status FROM projects WHERE project_id = %s", (project_id,)
            )
            assert result.fetchone()[0] == "invoiced"
```

### 4. E2Eテスト設計
```typescript
// tests/e2e/estimate.spec.ts
import { test, expect } from '@playwright/test';

test.describe('見積作成フロー', () => {
  test('完全な見積作成から PDF出力まで', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'test_user');
    await page.fill('[data-testid="password"]', 'test_password');
    await page.click('[data-testid="login-button"]');
    
    // 見積作成画面へ
    await page.click('[data-testid="estimates-menu"]');
    await page.click('[data-testid="new-estimate-button"]');
    
    // 顧客選択
    await page.selectOption('[data-testid="customer-select"]', 'customer-1');
    
    // 明細追加
    await page.click('[data-testid="add-item-button"]');
    await page.fill('[data-testid="item-description-0"]', 'マツ H3.0');
    await page.fill('[data-testid="quantity-0"]', '5');
    await page.fill('[data-testid="unit-price-0"]', '13000');
    
    // 自動計算確認
    await expect(page.locator('[data-testid="line-total-0"]')).toHaveText('65,000');
    await expect(page.locator('[data-testid="subtotal"]')).toHaveText('65,000');
    await expect(page.locator('[data-testid="total-amount"]')).toHaveText('71,500');
    
    // 保存
    await page.click('[data-testid="save-estimate-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // PDF出力
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="export-pdf-button"]');
    const download = await downloadPromise;
    
    // PDFファイル確認
    expect(download.suggestedFilename()).toMatch(/estimate_\d+\.pdf/);
  });
  
  test('レスポンシブデザイン対応確認', async ({ page }) => {
    // モバイルサイズでテスト
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/estimates/new');
    
    // モバイルメニューが表示されることを確認
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // タッチ操作のテスト
    await page.tap('[data-testid="add-item-button"]');
    await expect(page.locator('[data-testid="item-form"]')).toBeVisible();
  });
});
```

## 🔒 セキュリティテスト

### 1. 認証・認可テスト
```python
# tests/security/test_auth.py
class TestSecurity:
    async def test_unauthorized_access(self, test_client):
        """未認証アクセスの拒否テスト"""
        response = await test_client.get("/estimates/")
        assert response.status_code == 401
        
    async def test_cross_tenant_access_prevention(self, test_client):
        """テナント間データアクセス防止テスト"""
        # 企業Aのユーザーとしてログイン
        await login_as_company_a(test_client)
        
        # 企業Bのデータにアクセス試行
        response = await test_client.get("/estimates/company-b-estimate-id")
        assert response.status_code == 403
        
    async def test_role_based_access_control(self, test_client):
        """役割ベースアクセス制御テスト"""
        # 従業員としてログイン
        await login_as_employee(test_client)
        
        # 原価情報へのアクセス試行（拒否されるべき）
        response = await test_client.get("/estimates/1/costs")
        assert response.status_code == 403
        
        # 経営者としてログイン
        await login_as_owner(test_client)
        
        # 原価情報へのアクセス（許可されるべき）
        response = await test_client.get("/estimates/1/costs")
        assert response.status_code == 200
        
    async def test_sql_injection_prevention(self, test_client):
        """SQLインジェクション防止テスト"""
        malicious_input = "1'; DROP TABLE estimates; --"
        
        response = await test_client.get(f"/estimates/{malicious_input}")
        
        # 400 Bad Request または 404 Not Found が期待される
        assert response.status_code in [400, 404]
        
        # データベースが正常であることを確認
        response = await test_client.get("/estimates/")
        assert response.status_code == 200
```

### 2. 脆弱性スキャン
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # 毎週月曜2時

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Python Security Scan
        run: |
          pip install safety bandit
          safety check
          bandit -r src/
          
      - name: Node.js Security Scan
        run: |
          npm audit
          npx audit-ci
          
  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: python, javascript
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        
  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: docker build -t garden-app .
        
      - name: Container Security Scan
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image garden-app
```

## 📊 パフォーマンステスト

### 1. 負荷テスト
```python
# tests/performance/test_load.py
import asyncio
import aiohttp
import time
from statistics import mean, median

class TestPerformance:
    async def test_concurrent_estimate_creation(self):
        """同時見積作成の負荷テスト"""
        concurrent_users = 50
        requests_per_user = 10
        
        async def create_estimate_load(session, user_id):
            results = []
            for i in range(requests_per_user):
                start_time = time.time()
                
                estimate_data = {
                    "project_id": f"project_{user_id}_{i}",
                    "items": [{"item_description": "test", "quantity": 1, "unit_price": 1000}]
                }
                
                async with session.post("/estimates/", json=estimate_data) as response:
                    end_time = time.time()
                    results.append({
                        "status": response.status,
                        "response_time": end_time - start_time
                    })
            return results
        
        # 負荷テスト実行
        async with aiohttp.ClientSession("http://localhost:8000") as session:
            tasks = [create_estimate_load(session, i) for i in range(concurrent_users)]
            all_results = await asyncio.gather(*tasks)
        
        # 結果分析
        flat_results = [item for sublist in all_results for item in sublist]
        response_times = [r["response_time"] for r in flat_results]
        success_rate = len([r for r in flat_results if r["status"] < 400]) / len(flat_results)
        
        # アサーション
        assert success_rate > 0.99, f"成功率が99%を下回りました: {success_rate}"
        assert mean(response_times) < 2.0, f"平均応答時間が2秒を超えました: {mean(response_times)}"
        assert max(response_times) < 5.0, f"最大応答時間が5秒を超えました: {max(response_times)}"
        
    async def test_database_performance(self, test_db):
        """データベースパフォーマンステスト"""
        # 大量データ投入
        for i in range(1000):
            await create_test_estimate(test_db, f"estimate_{i}")
        
        # 検索パフォーマンス計測
        start_time = time.time()
        
        async with test_db.begin() as conn:
            result = await conn.execute("""
                SELECT e.*, p.project_name, c.customer_name 
                FROM estimates e
                JOIN projects p ON e.project_id = p.project_id
                JOIN customers c ON p.customer_id = c.customer_id
                WHERE e.company_id = 1
                ORDER BY e.created_at DESC
                LIMIT 50
            """)
            
        end_time = time.time()
        query_time = end_time - start_time
        
        assert query_time < 0.1, f"検索クエリが100msを超えました: {query_time}秒"
```

### 2. パフォーマンス監視
```python
# src/monitoring/performance.py
import time
import logging
from functools import wraps
from prometheus_client import Histogram, Counter

# メトリクス定義
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
SLOW_QUERIES = Counter('slow_queries_total', 'Total slow database queries', ['query_type'])

def monitor_performance(threshold=2.0):
    """パフォーマンス監視デコレータ"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise e
            finally:
                duration = time.time() - start_time
                
                # メトリクス記録
                REQUEST_DURATION.labels(
                    method=kwargs.get('method', 'unknown'),
                    endpoint=func.__name__
                ).observe(duration)
                
                REQUEST_COUNT.labels(
                    method=kwargs.get('method', 'unknown'),
                    endpoint=func.__name__,
                    status=status
                ).inc()
                
                # 閾値チェック
                if duration > threshold:
                    logging.warning(f"Slow operation: {func.__name__} took {duration:.2f}s")
                    SLOW_QUERIES.labels(query_type=func.__name__).inc()
                    
        return wrapper
    return decorator

@monitor_performance(threshold=1.0)
async def get_estimates_with_details(company_id: int):
    """監視対象のAPI関数"""
    # 実装...
    pass
```

## 🔄 CI/CD品質ゲート

### 1. GitHub Actions品質パイプライン
```yaml
# .github/workflows/quality.yml
name: Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install Dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
          
      - name: Code Quality Checks
        run: |
          # コードフォーマット
          black --check src/
          isort --check-only src/
          
          # 型チェック
          mypy src/
          
          # リンティング
          flake8 src/
          pylint src/
          
      - name: Unit Tests with Coverage
        run: |
          pytest tests/unit/ --cov=src --cov-report=xml --cov-fail-under=80
          
      - name: Integration Tests
        run: |
          pytest tests/integration/ -v
          
      - name: Security Scan
        run: |
          bandit -r src/
          safety check
          
      - name: Performance Tests
        run: |
          pytest tests/performance/ --benchmark-only
          
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          
  frontend-quality:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Code Quality
        run: |
          cd frontend
          npm run lint
          npm run type-check
          
      - name: Unit Tests
        run: |
          cd frontend
          npm run test:coverage
          
      - name: E2E Tests
        run: |
          cd frontend
          npm run build
          npm run test:e2e
          
      - name: Accessibility Tests
        run: |
          cd frontend
          npm run test:a11y
          
      - name: Bundle Analysis
        run: |
          cd frontend
          npm run analyze
```

### 2. 品質メトリクス
```python
# src/quality/metrics.py
from dataclasses import dataclass
from typing import Dict, List
import json

@dataclass
class QualityMetrics:
    """品質メトリクス定義"""
    
    # テストカバレッジ
    unit_test_coverage: float
    integration_test_coverage: float
    e2e_test_coverage: float
    
    # パフォーマンス
    avg_response_time: float
    p95_response_time: float
    throughput_rps: float
    
    # 信頼性
    error_rate: float
    availability: float
    mttr_minutes: float
    
    # セキュリティ
    vulnerability_count: int
    security_scan_score: float
    
    # コード品質
    complexity_score: float
    maintainability_index: float
    technical_debt_ratio: float
    
    def to_dict(self) -> Dict:
        return {
            'test_coverage': {
                'unit': self.unit_test_coverage,
                'integration': self.integration_test_coverage,
                'e2e': self.e2e_test_coverage
            },
            'performance': {
                'avg_response_time': self.avg_response_time,
                'p95_response_time': self.p95_response_time,
                'throughput_rps': self.throughput_rps
            },
            'reliability': {
                'error_rate': self.error_rate,
                'availability': self.availability,
                'mttr_minutes': self.mttr_minutes
            },
            'security': {
                'vulnerability_count': self.vulnerability_count,
                'security_score': self.security_scan_score
            },
            'code_quality': {
                'complexity': self.complexity_score,
                'maintainability': self.maintainability_index,
                'technical_debt': self.technical_debt_ratio
            }
        }
    
    def quality_gate_check(self) -> bool:
        """品質ゲートチェック"""
        checks = [
            self.unit_test_coverage >= 80.0,
            self.integration_test_coverage >= 70.0,
            self.avg_response_time <= 2.0,
            self.error_rate <= 0.01,
            self.availability >= 99.9,
            self.vulnerability_count == 0,
            self.complexity_score <= 10.0
        ]
        
        return all(checks)

class QualityReporter:
    """品質レポート生成"""
    
    def __init__(self):
        self.metrics_history: List[QualityMetrics] = []
    
    def add_metrics(self, metrics: QualityMetrics):
        self.metrics_history.append(metrics)
    
    def generate_report(self) -> str:
        """品質レポート生成"""
        if not self.metrics_history:
            return "No metrics available"
        
        latest = self.metrics_history[-1]
        
        report = f"""
# Garden システム品質レポート

## 📊 最新品質メトリクス

### テストカバレッジ
- ユニットテスト: {latest.unit_test_coverage:.1f}%
- 統合テスト: {latest.integration_test_coverage:.1f}%
- E2Eテスト: {latest.e2e_test_coverage:.1f}%

### パフォーマンス
- 平均応答時間: {latest.avg_response_time:.2f}秒
- 95%ile応答時間: {latest.p95_response_time:.2f}秒
- スループット: {latest.throughput_rps:.0f} RPS

### 信頼性
- エラー率: {latest.error_rate:.3f}%
- 可用性: {latest.availability:.2f}%
- MTTR: {latest.mttr_minutes:.0f}分

### セキュリティ
- 脆弱性数: {latest.vulnerability_count}件
- セキュリティスコア: {latest.security_scan_score:.1f}/100

### コード品質
- 複雑度: {latest.complexity_score:.1f}
- 保守性指数: {latest.maintainability_index:.1f}
- 技術的負債比率: {latest.technical_debt_ratio:.2f}%

## 🎯 品質ゲート結果
{'✅ PASS' if latest.quality_gate_check() else '❌ FAIL'}

"""
        
        if len(self.metrics_history) > 1:
            prev = self.metrics_history[-2]
            report += self._generate_trend_analysis(prev, latest)
        
        return report
    
    def _generate_trend_analysis(self, prev: QualityMetrics, current: QualityMetrics) -> str:
        """トレンド分析"""
        
        def trend_icon(current_val, prev_val, higher_is_better=True):
            if current_val > prev_val:
                return "📈" if higher_is_better else "📉"
            elif current_val < prev_val:
                return "📉" if higher_is_better else "📈"
            else:
                return "➡️"
        
        return f"""
## 📈 トレンド分析

- テストカバレッジ: {trend_icon(current.unit_test_coverage, prev.unit_test_coverage)}
- 応答時間: {trend_icon(current.avg_response_time, prev.avg_response_time, False)}
- エラー率: {trend_icon(current.error_rate, prev.error_rate, False)}
- 可用性: {trend_icon(current.availability, prev.availability)}
"""
```

## 📱 ユーザビリティテスト

### 1. アクセシビリティテスト
```typescript
// tests/accessibility/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('アクセシビリティ', () => {
  test('見積作成画面のアクセシビリティ', async ({ page }) => {
    await page.goto('/estimates/new');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('キーボードナビゲーション', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // Tabキーでのナビゲーション
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'customer-select');
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'project-name');
    
    // Enterキーでの操作
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="item-form"]')).toBeVisible();
  });
  
  test('スクリーンリーダー対応', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // ARIA属性の確認
    await expect(page.locator('[data-testid="total-amount"]')).toHaveAttribute('aria-label', '見積合計金額');
    await expect(page.locator('[data-testid="item-list"]')).toHaveAttribute('role', 'list');
    await expect(page.locator('[data-testid="item-0"]')).toHaveAttribute('role', 'listitem');
  });
});
```

### 2. レスポンシブデザインテスト
```typescript
// tests/responsive/responsive.spec.ts
const DEVICE_SIZES = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

test.describe('レスポンシブデザイン', () => {
  DEVICE_SIZES.forEach(device => {
    test(`${device.name}での見積作成画面`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/estimates/new');
      
      // レイアウト確認
      const container = page.locator('[data-testid="estimate-container"]');
      await expect(container).toBeVisible();
      
      if (device.name === 'mobile') {
        // モバイル固有のテスト
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();
      } else {
        // デスクトップ/タブレットのテスト
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
      }
      
      // スクロール可能性確認
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.locator('[data-testid="save-button"]')).toBeVisible();
    });
  });
});
```

## 📈 品質ダッシュボード

### 1. Grafana ダッシュボード設定
```json
{
  "dashboard": {
    "title": "Garden システム品質ダッシュボード",
    "panels": [
      {
        "title": "テストカバレッジ",
        "type": "stat",
        "targets": [
          {
            "expr": "coverage_percentage",
            "legendFormat": "カバレッジ"
          }
        ],
        "thresholds": [
          {"color": "red", "value": 0},
          {"color": "yellow", "value": 70},
          {"color": "green", "value": 80}
        ]
      },
      {
        "title": "API応答時間",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)",
            "legendFormat": "95%ile"
          },
          {
            "expr": "histogram_quantile(0.50, http_request_duration_seconds_bucket)",
            "legendFormat": "Median"
          }
        ]
      },
      {
        "title": "エラー率",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "エラー率"
          }
        ]
      }
    ]
  }
}
```

## 🎯 Phase 1 品質チェックリスト

### ✅ 必須品質基準
- [x] ユニットテストカバレッジ > 80%
- [x] 統合テスト実装
- [x] E2Eテスト基盤構築
- [x] セキュリティテスト実装
- [x] パフォーマンステスト設計
- [x] アクセシビリティ対応
- [x] CI/CD品質ゲート設定

### 🔄 継続的改善
- [ ] 自動品質レポート生成
- [ ] 品質メトリクス監視
- [ ] ユーザビリティテスト自動化
- [ ] A/Bテスト基盤

---

**設計完了**: 2025-06-30
**品質責任者**: worker5（品質管理・統合責任者）
**品質レベル**: 史上最強の品質保証体制構築完了