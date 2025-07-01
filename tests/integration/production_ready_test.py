"""
Garden 造園業DXシステム 本番リリース準備統合テスト
95%完成度品質保証・エンドツーエンドテスト・パフォーマンステスト
"""

import pytest
import asyncio
import time
import requests
import json
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import psutil
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GardenProductionTest:
    """本番リリース準備統合テストクラス"""
    
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.api_url = "http://localhost:8000"
        self.driver = None
        self.test_results = {
            "start_time": datetime.now(),
            "tests": [],
            "performance": {},
            "errors": [],
            "overall_score": 0
        }
    
    def setup_browser(self):
        """ブラウザセットアップ"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # ヘッドレスモード
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.implicitly_wait(10)
        logger.info("ブラウザセットアップ完了")
    
    def teardown_browser(self):
        """ブラウザ終了"""
        if self.driver:
            self.driver.quit()
            logger.info("ブラウザ終了")
    
    def record_test_result(self, test_name, success, duration, details=None):
        """テスト結果記録"""
        result = {
            "test_name": test_name,
            "success": success,
            "duration": duration,
            "timestamp": datetime.now(),
            "details": details or {}
        }
        self.test_results["tests"].append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status} {test_name} ({duration:.2f}s)")
    
    # ======================================
    # 1. 基本システム可用性テスト
    # ======================================
    
    def test_system_health(self):
        """システムヘルスチェック"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            # フロントエンド確認
            response = requests.get(self.base_url, timeout=30)
            details["frontend_status"] = response.status_code
            details["frontend_response_time"] = response.elapsed.total_seconds()
            
            if response.status_code != 200:
                success = False
                self.test_results["errors"].append(f"フロントエンド接続失敗: {response.status_code}")
            
            # バックエンドAPI確認
            api_response = requests.get(f"{self.api_url}/health", timeout=30)
            details["api_status"] = api_response.status_code
            details["api_response_time"] = api_response.elapsed.total_seconds()
            
            if api_response.status_code != 200:
                success = False
                self.test_results["errors"].append(f"API接続失敗: {api_response.status_code}")
            
            # データベース接続確認
            db_response = requests.get(f"{self.api_url}/api/health/database", timeout=30)
            details["database_status"] = db_response.status_code
            
            if db_response.status_code != 200:
                success = False
                self.test_results["errors"].append("データベース接続失敗")
                
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"システムヘルスチェックエラー: {str(e)}")
        
        duration = time.time() - start_time
        self.record_test_result("システムヘルスチェック", success, duration, details)
        return success
    
    # ======================================
    # 2. 見積ウィザード機能テスト
    # ======================================
    
    def test_estimate_wizard_flow(self):
        """見積ウィザード完全フローテスト"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            self.driver.get(f"{self.base_url}/wizard")
            
            # ページ読み込み確認
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, "estimate-wizard"))
            )
            details["page_load"] = "success"
            
            # ステップ1: 基本情報入力
            customer_name = self.driver.find_element(By.NAME, "customerName")
            customer_name.send_keys("テスト造園株式会社")
            
            site_address = self.driver.find_element(By.NAME, "siteAddress")
            site_address.send_keys("東京都渋谷区テスト1-1-1")
            
            # 次のステップボタンクリック
            next_button = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='next-step']")
            next_button.click()
            details["step1_complete"] = "success"
            
            # ステップ2: 要望詳細
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "projectDescription"))
            )
            
            project_desc = self.driver.find_element(By.NAME, "projectDescription")
            project_desc.send_keys("庭園リニューアル工事のテスト見積")
            
            budget_input = self.driver.find_element(By.NAME, "budget")
            budget_input.send_keys("1500000")
            
            next_button = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='next-step']")
            next_button.click()
            details["step2_complete"] = "success"
            
            # ステップ3: 項目選択
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "price-items"))
            )
            
            # デフォルト選択項目確認
            checkboxes = self.driver.find_elements(By.CSS_SELECTOR, "input[type='checkbox']:checked")
            details["default_items_selected"] = len(checkboxes)
            
            if len(checkboxes) == 0:
                success = False
                self.test_results["errors"].append("デフォルト項目が選択されていません")
            
            # 数量入力テスト
            quantity_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[name*='quantity']")
            if quantity_inputs:
                quantity_inputs[0].clear()
                quantity_inputs[0].send_keys("5")
                details["quantity_input"] = "success"
            
            next_button = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='next-step']")
            next_button.click()
            details["step3_complete"] = "success"
            
            # ステップ4: 金額調整・最終確認
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "price-summary"))
            )
            
            # 合計金額表示確認
            total_amount = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='total-amount']")
            total_text = total_amount.text
            details["total_amount_displayed"] = total_text
            
            if "円" not in total_text or "0" == total_text.replace("円", "").replace(",", ""):
                success = False
                self.test_results["errors"].append("合計金額計算エラー")
            
            # 保存ボタンテスト
            save_button = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='save-estimate']")
            save_button.click()
            
            # 保存完了確認
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "success-message"))
            )
            details["save_complete"] = "success"
            
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"見積ウィザードテストエラー: {str(e)}")
            details["error"] = str(e)
        
        duration = time.time() - start_time
        self.record_test_result("見積ウィザード完全フロー", success, duration, details)
        return success
    
    # ======================================
    # 3. 単価マスター管理テスト
    # ======================================
    
    def test_price_master_management(self):
        """単価マスター管理機能テスト"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            self.driver.get(f"{self.base_url}/price-master")
            
            # ページ読み込み確認
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, "price-master-management"))
            )
            details["page_load"] = "success"
            
            # カテゴリツリー表示確認
            category_tree = self.driver.find_elements(By.CLASS_NAME, "category-tree")
            if category_tree:
                details["category_tree"] = "displayed"
            else:
                success = False
                self.test_results["errors"].append("カテゴリツリーが表示されていません")
            
            # 検索機能テスト
            search_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='検索']")
            search_input.send_keys("植栽")
            
            # 検索結果確認
            time.sleep(2)  # 検索結果待機
            search_results = self.driver.find_elements(By.CLASS_NAME, "price-item-row")
            details["search_results_count"] = len(search_results)
            
            if len(search_results) == 0:
                success = False
                self.test_results["errors"].append("検索結果が表示されません")
            
            # 価格計算機テスト
            calc_button = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='price-calculator']")
            calc_button.click()
            
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "price-calculator"))
            )
            
            # 計算実行
            purchase_price = self.driver.find_element(By.NAME, "purchasePrice")
            purchase_price.send_keys("10000")
            
            markup_rate = self.driver.find_element(By.NAME, "markupRate")
            markup_rate.clear()
            markup_rate.send_keys("1.3")
            
            calc_execute = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='calculate-price']")
            calc_execute.click()
            
            # 計算結果確認
            time.sleep(2)
            result_display = self.driver.find_elements(By.CLASS_NAME, "calculation-result")
            if result_display:
                details["price_calculation"] = "success"
            else:
                success = False
                self.test_results["errors"].append("価格計算結果が表示されません")
            
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"単価マスターテストエラー: {str(e)}")
            details["error"] = str(e)
        
        duration = time.time() - start_time
        self.record_test_result("単価マスター管理機能", success, duration, details)
        return success
    
    # ======================================
    # 4. 工程管理機能テスト
    # ======================================
    
    def test_process_management(self):
        """工程管理機能テスト"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            self.driver.get(f"{self.base_url}/process")
            
            # ページ読み込み確認
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, "process-management"))
            )
            details["page_load"] = "success"
            
            # ガントチャート表示確認
            gantt_chart = self.driver.find_elements(By.CLASS_NAME, "gantt-chart")
            if gantt_chart:
                details["gantt_chart"] = "displayed"
            else:
                success = False
                self.test_results["errors"].append("ガントチャートが表示されていません")
            
            # 工程テンプレート選択テスト
            template_select = self.driver.find_element(By.CSS_SELECTOR, "select[name='template']")
            template_select.send_keys("基本工事テンプレート")
            details["template_selection"] = "success"
            
            # 自動生成ボタンテスト
            generate_button = self.driver.find_element(By.CSS_SELECTOR, "[data-testid='generate-schedule']")
            generate_button.click()
            
            # 生成結果確認
            time.sleep(3)
            process_tasks = self.driver.find_elements(By.CLASS_NAME, "process-task")
            details["generated_tasks_count"] = len(process_tasks)
            
            if len(process_tasks) == 0:
                success = False
                self.test_results["errors"].append("工程表が自動生成されませんでした")
            
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"工程管理テストエラー: {str(e)}")
            details["error"] = str(e)
        
        duration = time.time() - start_time
        self.record_test_result("工程管理機能", success, duration, details)
        return success
    
    # ======================================
    # 5. レスポンシブUI・モバイル対応テスト
    # ======================================
    
    def test_responsive_ui(self):
        """レスポンシブUI・モバイル対応テスト"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            # デスクトップサイズ
            self.driver.set_window_size(1920, 1080)
            self.driver.get(self.base_url)
            
            # メニュー表示確認
            main_menu = self.driver.find_elements(By.CLASS_NAME, "main-menu")
            if main_menu:
                details["desktop_menu"] = "displayed"
            
            # タブレットサイズ
            self.driver.set_window_size(768, 1024)
            time.sleep(2)
            
            tablet_menu = self.driver.find_elements(By.CLASS_NAME, "mobile-menu-toggle")
            if tablet_menu:
                details["tablet_responsive"] = "success"
            
            # モバイルサイズ
            self.driver.set_window_size(375, 667)
            time.sleep(2)
            
            # モバイルメニュー動作確認
            mobile_toggle = self.driver.find_elements(By.CSS_SELECTOR, "[data-testid='mobile-menu-toggle']")
            if mobile_toggle:
                mobile_toggle[0].click()
                time.sleep(1)
                
                mobile_menu = self.driver.find_elements(By.CLASS_NAME, "mobile-menu-open")
                if mobile_menu:
                    details["mobile_menu"] = "functional"
                else:
                    success = False
                    self.test_results["errors"].append("モバイルメニューが動作しません")
            
            # 見積ウィザードモバイル対応確認
            self.driver.get(f"{self.base_url}/wizard")
            
            wizard_mobile = self.driver.find_elements(By.CLASS_NAME, "wizard-mobile-optimized")
            if wizard_mobile:
                details["wizard_mobile"] = "optimized"
            
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"レスポンシブUIテストエラー: {str(e)}")
            details["error"] = str(e)
        
        duration = time.time() - start_time
        self.record_test_result("レスポンシブUI・モバイル対応", success, duration, details)
        return success
    
    # ======================================
    # 6. パフォーマンステスト
    # ======================================
    
    def test_performance(self):
        """パフォーマンステスト"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            # ページ読み込み速度テスト
            load_times = []
            pages = ["/", "/wizard", "/price-master", "/process", "/settings"]
            
            for page in pages:
                page_start = time.time()
                self.driver.get(f"{self.base_url}{page}")
                
                # ページ読み込み完了待機
                WebDriverWait(self.driver, 30).until(
                    lambda driver: driver.execute_script("return document.readyState") == "complete"
                )
                
                load_time = time.time() - page_start
                load_times.append(load_time)
                details[f"load_time{page.replace('/', '_')}"] = load_time
            
            avg_load_time = sum(load_times) / len(load_times)
            details["average_load_time"] = avg_load_time
            
            # パフォーマンス基準チェック（3秒以内）
            if avg_load_time > 3.0:
                success = False
                self.test_results["errors"].append(f"平均読み込み時間が遅い: {avg_load_time:.2f}s")
            
            # API応答時間テスト
            api_endpoints = [
                "/api/health",
                "/api/price-master/categories",
                "/api/estimates",
                "/api/companies/current"
            ]
            
            api_times = []
            for endpoint in api_endpoints:
                api_start = time.time()
                try:
                    response = requests.get(f"{self.api_url}{endpoint}", timeout=10)
                    api_time = time.time() - api_start
                    api_times.append(api_time)
                    details[f"api_time_{endpoint.replace('/', '_')}"] = api_time
                except Exception as e:
                    details[f"api_error_{endpoint.replace('/', '_')}"] = str(e)
            
            if api_times:
                avg_api_time = sum(api_times) / len(api_times)
                details["average_api_time"] = avg_api_time
                
                # API応答時間基準チェック（2秒以内）
                if avg_api_time > 2.0:
                    success = False
                    self.test_results["errors"].append(f"API応答時間が遅い: {avg_api_time:.2f}s")
            
            # システムリソース使用量確認
            process = psutil.Process()
            details["memory_usage_mb"] = process.memory_info().rss / 1024 / 1024
            details["cpu_percent"] = process.cpu_percent()
            
            self.test_results["performance"] = details
            
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"パフォーマンステストエラー: {str(e)}")
            details["error"] = str(e)
        
        duration = time.time() - start_time
        self.record_test_result("パフォーマンステスト", success, duration, details)
        return success
    
    # ======================================
    # 7. データ保存・読み込みテスト
    # ======================================
    
    def test_data_persistence(self):
        """データ保存・読み込みテスト"""
        start_time = time.time()
        success = True
        details = {}
        
        try:
            # 見積データ保存テスト
            test_data = {
                "customer_name": "テストデータ保存会社",
                "site_address": "テストアドレス",
                "project_description": "データ保存テスト",
                "budget": 500000
            }
            
            # API経由でデータ保存
            save_response = requests.post(
                f"{self.api_url}/api/estimates",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if save_response.status_code in [200, 201]:
                details["data_save"] = "success"
                saved_id = save_response.json().get("estimate_id")
                
                # データ読み込みテスト
                if saved_id:
                    load_response = requests.get(
                        f"{self.api_url}/api/estimates/{saved_id}",
                        timeout=30
                    )
                    
                    if load_response.status_code == 200:
                        loaded_data = load_response.json()
                        if loaded_data.get("customer_name") == test_data["customer_name"]:
                            details["data_load"] = "success"
                        else:
                            success = False
                            self.test_results["errors"].append("読み込みデータが一致しません")
                    else:
                        success = False
                        self.test_results["errors"].append("データ読み込み失敗")
            else:
                success = False
                self.test_results["errors"].append(f"データ保存失敗: {save_response.status_code}")
            
            # 単価マスターデータ確認
            price_data_response = requests.get(f"{self.api_url}/api/price-master/items", timeout=30)
            if price_data_response.status_code == 200:
                price_data = price_data_response.json()
                details["price_master_count"] = len(price_data.get("items", []))
            
        except Exception as e:
            success = False
            self.test_results["errors"].append(f"データ保存・読み込みテストエラー: {str(e)}")
            details["error"] = str(e)
        
        duration = time.time() - start_time
        self.record_test_result("データ保存・読み込み", success, duration, details)
        return success
    
    # ======================================
    # 8. 全体品質評価
    # ======================================
    
    def calculate_overall_score(self):
        """全体品質スコア計算"""
        total_tests = len(self.test_results["tests"])
        passed_tests = sum(1 for test in self.test_results["tests"] if test["success"])
        
        if total_tests == 0:
            return 0
        
        base_score = (passed_tests / total_tests) * 100
        
        # パフォーマンスボーナス/ペナルティ
        perf_data = self.test_results["performance"]
        perf_bonus = 0
        
        if "average_load_time" in perf_data:
            if perf_data["average_load_time"] < 1.0:
                perf_bonus += 5  # 高速読み込みボーナス
            elif perf_data["average_load_time"] > 5.0:
                perf_bonus -= 10  # 低速読み込みペナルティ
        
        if "average_api_time" in perf_data:
            if perf_data["average_api_time"] < 0.5:
                perf_bonus += 5  # 高速APIボーナス
            elif perf_data["average_api_time"] > 3.0:
                perf_bonus -= 10  # 低速APIペナルティ
        
        # エラー数ペナルティ
        error_penalty = min(len(self.test_results["errors"]) * 2, 20)
        
        final_score = max(0, min(100, base_score + perf_bonus - error_penalty))
        self.test_results["overall_score"] = final_score
        
        return final_score
    
    # ======================================
    # メイン実行関数
    # ======================================
    
    def run_all_tests(self):
        """全統合テスト実行"""
        logger.info("🚀 Garden 造園業DXシステム 本番リリース準備統合テスト開始")
        
        try:
            self.setup_browser()
            
            # テスト実行順序
            test_functions = [
                self.test_system_health,
                self.test_estimate_wizard_flow,
                self.test_price_master_management,
                self.test_process_management,
                self.test_responsive_ui,
                self.test_performance,
                self.test_data_persistence
            ]
            
            # 各テスト実行
            for test_func in test_functions:
                try:
                    test_func()
                except Exception as e:
                    logger.error(f"テスト実行エラー {test_func.__name__}: {str(e)}")
                    self.test_results["errors"].append(f"{test_func.__name__}: {str(e)}")
            
            # 総合評価
            overall_score = self.calculate_overall_score()
            
            # 結果サマリー
            self.test_results["end_time"] = datetime.now()
            self.test_results["duration"] = (self.test_results["end_time"] - self.test_results["start_time"]).total_seconds()
            
            return self.test_results
            
        finally:
            self.teardown_browser()
    
    def generate_report(self):
        """テストレポート生成"""
        results = self.test_results
        
        # 成功・失敗統計
        total_tests = len(results["tests"])
        passed_tests = sum(1 for test in results["tests"] if test["success"])
        failed_tests = total_tests - passed_tests
        
        # レポート生成
        report = f"""
# 🌿 Garden 造園業DXシステム 本番リリース準備テストレポート

## 📊 テスト実行概要
- **実行日時**: {results['start_time'].strftime('%Y-%m-%d %H:%M:%S')}
- **実行時間**: {results['duration']:.2f}秒
- **総合品質スコア**: **{results['overall_score']:.1f}%** {'🎉' if results['overall_score'] >= 95 else '⚠️' if results['overall_score'] >= 80 else '❌'}

## 📋 テスト結果サマリー
- **総テスト数**: {total_tests}
- **成功**: {passed_tests} ✅
- **失敗**: {failed_tests} ❌
- **成功率**: {(passed_tests/total_tests*100):.1f}%

## 🔍 詳細テスト結果
"""
        
        for test in results["tests"]:
            status = "✅ PASS" if test["success"] else "❌ FAIL"
            report += f"- **{test['test_name']}**: {status} ({test['duration']:.2f}s)\n"
        
        # パフォーマンス情報
        if results["performance"]:
            report += f"\n## ⚡ パフォーマンス指標\n"
            perf = results["performance"]
            
            if "average_load_time" in perf:
                report += f"- **平均ページ読み込み時間**: {perf['average_load_time']:.2f}s\n"
            if "average_api_time" in perf:
                report += f"- **平均API応答時間**: {perf['average_api_time']:.2f}s\n"
            if "memory_usage_mb" in perf:
                report += f"- **メモリ使用量**: {perf['memory_usage_mb']:.1f}MB\n"
        
        # エラー情報
        if results["errors"]:
            report += f"\n## ❌ エラー・警告\n"
            for error in results["errors"]:
                report += f"- {error}\n"
        
        # 品質評価
        report += f"\n## 🎯 品質評価\n"
        
        if results["overall_score"] >= 95:
            report += """
**🎉 本番リリース準備完了！**
- 全機能が正常に動作しています
- パフォーマンスも良好です
- 造園業者1社での本番運用が可能です
"""
        elif results["overall_score"] >= 80:
            report += """
**⚠️ 改善推奨項目があります**
- 基本機能は動作していますが、改善の余地があります
- 軽微な修正後に本番リリース可能です
"""
        else:
            report += """
**❌ 本番リリース前に修正が必要です**
- 重要な問題が発見されています
- 修正後に再テストを実施してください
"""
        
        return report


def main():
    """メイン実行関数"""
    tester = GardenProductionTest()
    
    # テスト実行
    results = tester.run_all_tests()
    
    # レポート生成・保存
    report = tester.generate_report()
    
    # レポートファイル保存
    report_file = f"production_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    # 結果JSON保存
    results_file = f"production_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        # datetimeオブジェクトを文字列に変換
        def json_serial(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
        
        json.dump(results, f, ensure_ascii=False, indent=2, default=json_serial)
    
    print(report)
    print(f"\n📄 詳細レポート: {report_file}")
    print(f"📊 結果データ: {results_file}")
    
    return results["overall_score"] >= 95


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)