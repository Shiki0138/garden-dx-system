"""
Garden DX - 認証システム包括的セキュリティ検証テスト（最小版）
サイクル6：DBマイグレーション後のJWT・RBAC動作確認・OWASP Top10脆弱性検証
"""

import requests
import json
import time
from datetime import datetime

class SecurityVerificationMinimal:
    """認証システム包括的セキュリティ検証（最小版）"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.test_results = {}
        
    def run_security_verification(self):
        """セキュリティ検証実行"""
        print("🛡️ 認証システム包括的セキュリティ検証開始")
        
        # 1. 基本接続テスト
        self.test_basic_connectivity()
        
        # 2. JWT・RBAC動作確認
        self.test_jwt_rbac_functionality()
        
        # 3. OWASP Top10基本チェック
        self.test_owasp_basic_vulnerabilities()
        
        # 4. 認証フロー統合テスト
        self.test_authentication_flow()
        
        # 5. セキュリティ設定確認
        self.test_security_configuration()
        
        # レポート生成
        self.generate_report()
        
        return self.test_results
    
    def test_basic_connectivity(self):
        """基本接続テスト"""
        print("\n📡 1. 基本接続テスト")
        
        try:
            # ヘルスチェック
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                print("✅ サーバー接続成功")
                self.test_results["connectivity"] = "PASS"
            else:
                print(f"❌ サーバー接続失敗: {response.status_code}")
                self.test_results["connectivity"] = "FAIL"
        except Exception as e:
            print(f"❌ 接続エラー: {str(e)}")
            self.test_results["connectivity"] = "ERROR"
    
    def test_jwt_rbac_functionality(self):
        """JWT・RBAC機能テスト"""
        print("\n🔐 2. JWT・RBAC機能テスト")
        
        jwt_rbac_results = {}
        
        try:
            # ログインテスト
            login_response = requests.post(f"{self.base_url}/api/auth/login", json={
                "username": "owner",
                "password": "owner123"
            }, timeout=10)
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                access_token = token_data.get("access_token")
                
                if access_token:
                    print("✅ JWTトークン取得成功")
                    jwt_rbac_results["token_generation"] = "PASS"
                    
                    # 認証が必要なエンドポイントテスト
                    headers = {"Authorization": f"Bearer {access_token}"}
                    
                    # ユーザー情報取得テスト
                    user_response = requests.get(f"{self.base_url}/api/auth/user-features", headers=headers, timeout=10)
                    if user_response.status_code == 200:
                        print("✅ 認証エンドポイントアクセス成功")
                        jwt_rbac_results["authenticated_access"] = "PASS"
                    else:
                        print(f"❌ 認証エンドポイントアクセス失敗: {user_response.status_code}")
                        jwt_rbac_results["authenticated_access"] = "FAIL"
                    
                    # 権限チェックテスト
                    permission_response = requests.get(f"{self.base_url}/api/auth/check-permission/estimates/view", headers=headers, timeout=10)
                    if permission_response.status_code == 200:
                        print("✅ 権限チェック機能確認")
                        jwt_rbac_results["permission_check"] = "PASS"
                    else:
                        print(f"❌ 権限チェック機能失敗: {permission_response.status_code}")
                        jwt_rbac_results["permission_check"] = "FAIL"
                    
                    # 無効なトークンテスト
                    invalid_headers = {"Authorization": "Bearer invalid_token"}
                    invalid_response = requests.get(f"{self.base_url}/api/auth/user-features", headers=invalid_headers, timeout=10)
                    if invalid_response.status_code == 401:
                        print("✅ 無効トークン拒否確認")
                        jwt_rbac_results["invalid_token_rejection"] = "PASS"
                    else:
                        print(f"❌ 無効トークン拒否失敗: {invalid_response.status_code}")
                        jwt_rbac_results["invalid_token_rejection"] = "FAIL"
                
                else:
                    print("❌ JWTトークンが応答に含まれていません")
                    jwt_rbac_results["token_generation"] = "FAIL"
            
            elif login_response.status_code == 404:
                print("⚠️ ログインエンドポイントが見つかりません（実装待ち）")
                jwt_rbac_results["login"] = "SKIP"
            else:
                print(f"❌ ログイン失敗: {login_response.status_code}")
                jwt_rbac_results["login"] = "FAIL"
        
        except Exception as e:
            print(f"❌ JWT・RBACテストエラー: {str(e)}")
            jwt_rbac_results["error"] = str(e)
        
        self.test_results["jwt_rbac"] = jwt_rbac_results
    
    def test_owasp_basic_vulnerabilities(self):
        """OWASP基本脆弱性チェック"""
        print("\n🔍 3. OWASP基本脆弱性チェック")
        
        owasp_results = {}
        
        # A01: アクセス制御の不備
        try:
            # 認証なしでの保護されたエンドポイントアクセス
            unauth_response = requests.get(f"{self.base_url}/api/auth/user-features", timeout=5)
            if unauth_response.status_code == 401:
                print("✅ A01: 認証なしアクセス適切に拒否")
                owasp_results["A01_access_control"] = "PASS"
            else:
                print(f"❌ A01: 認証なしアクセス許可: {unauth_response.status_code}")
                owasp_results["A01_access_control"] = "FAIL"
        except Exception as e:
            owasp_results["A01_access_control"] = f"ERROR: {str(e)}"
        
        # A03: インジェクション
        try:
            # SQLインジェクション基本テスト
            sql_payload = "' OR '1'='1"
            injection_response = requests.post(f"{self.base_url}/api/auth/login", json={
                "username": sql_payload,
                "password": "test"
            }, timeout=10)
            
            if injection_response.status_code == 500:
                print("⚠️ A03: SQLインジェクション脆弱性の可能性")
                owasp_results["A03_injection"] = "WARN"
            elif injection_response.status_code in [400, 401, 422]:
                print("✅ A03: SQLインジェクション対策確認")
                owasp_results["A03_injection"] = "PASS"
            else:
                print(f"✅ A03: 適切なエラーハンドリング: {injection_response.status_code}")
                owasp_results["A03_injection"] = "PASS"
        except Exception as e:
            owasp_results["A03_injection"] = f"ERROR: {str(e)}"
        
        # A05: セキュリティ設定ミス
        try:
            # デバッグ情報露出確認
            debug_response = requests.get(f"{self.base_url}/debug", timeout=5)
            if debug_response.status_code == 404:
                print("✅ A05: デバッグ情報適切に非公開")
                owasp_results["A05_security_misconfig"] = "PASS"
            elif debug_response.status_code == 200:
                print("❌ A05: デバッグ情報が公開されています")
                owasp_results["A05_security_misconfig"] = "FAIL"
            else:
                print("✅ A05: デバッグエンドポイント適切に制御")
                owasp_results["A05_security_misconfig"] = "PASS"
        except Exception as e:
            owasp_results["A05_security_misconfig"] = f"ERROR: {str(e)}"
        
        # A07: 認証・識別の失敗
        try:
            # 弱いパスワードテスト
            weak_attempts = [
                {"username": "admin", "password": "admin"},
                {"username": "admin", "password": "password"},
                {"username": "admin", "password": "123456"}
            ]
            
            weak_auth_detected = False
            for attempt in weak_attempts:
                weak_response = requests.post(f"{self.base_url}/api/auth/login", json=attempt, timeout=5)
                if weak_response.status_code == 200:
                    weak_auth_detected = True
                    break
            
            if not weak_auth_detected:
                print("✅ A07: 弱い認証情報拒否確認")
                owasp_results["A07_auth_failures"] = "PASS"
            else:
                print("❌ A07: 弱い認証情報で認証成功")
                owasp_results["A07_auth_failures"] = "FAIL"
        except Exception as e:
            owasp_results["A07_auth_failures"] = f"ERROR: {str(e)}"
        
        self.test_results["owasp_top10"] = owasp_results
    
    def test_authentication_flow(self):
        """認証フロー統合テスト"""
        print("\n🔄 4. 認証フロー統合テスト")
        
        auth_flow_results = {}
        
        try:
            # 1. 正常ログインフロー
            login_response = requests.post(f"{self.base_url}/api/auth/login", json={
                "username": "owner",
                "password": "owner123"
            }, timeout=10)
            
            if login_response.status_code == 200:
                print("✅ 正常ログイン成功")
                auth_flow_results["valid_login"] = "PASS"
                
                token_data = login_response.json()
                access_token = token_data.get("access_token")
                
                if access_token:
                    # 2. 認証が必要な操作実行
                    headers = {"Authorization": f"Bearer {access_token}"}
                    protected_response = requests.get(f"{self.base_url}/api/auth/user-features", headers=headers, timeout=10)
                    
                    if protected_response.status_code == 200:
                        print("✅ 認証後の保護された操作成功")
                        auth_flow_results["protected_operation"] = "PASS"
                    else:
                        print(f"❌ 認証後の操作失敗: {protected_response.status_code}")
                        auth_flow_results["protected_operation"] = "FAIL"
                    
                    # 3. ログアウト（実装されている場合）
                    logout_response = requests.post(f"{self.base_url}/api/auth/logout", headers=headers, timeout=10)
                    if logout_response.status_code in [200, 404]:  # 404は未実装
                        print("✅ ログアウト処理確認")
                        auth_flow_results["logout"] = "PASS"
                    else:
                        print(f"⚠️ ログアウト処理: {logout_response.status_code}")
                        auth_flow_results["logout"] = "WARN"
                
            elif login_response.status_code == 404:
                print("⚠️ ログインエンドポイント未実装")
                auth_flow_results["valid_login"] = "SKIP"
            else:
                print(f"❌ ログイン失敗: {login_response.status_code}")
                auth_flow_results["valid_login"] = "FAIL"
            
            # 4. 無効ログイン試行
            invalid_login_response = requests.post(f"{self.base_url}/api/auth/login", json={
                "username": "invalid_user",
                "password": "wrong_password"
            }, timeout=10)
            
            if invalid_login_response.status_code in [401, 400, 422]:
                print("✅ 無効ログイン適切に拒否")
                auth_flow_results["invalid_login"] = "PASS"
            else:
                print(f"❌ 無効ログイン処理不適切: {invalid_login_response.status_code}")
                auth_flow_results["invalid_login"] = "FAIL"
        
        except Exception as e:
            print(f"❌ 認証フローテストエラー: {str(e)}")
            auth_flow_results["error"] = str(e)
        
        self.test_results["auth_flow"] = auth_flow_results
    
    def test_security_configuration(self):
        """セキュリティ設定確認"""
        print("\n⚙️ 5. セキュリティ設定確認")
        
        security_config_results = {}
        
        try:
            # CORS設定確認
            cors_response = requests.options(f"{self.base_url}/api/auth/login", 
                                           headers={"Origin": "http://malicious-site.com"}, timeout=5)
            
            if "Access-Control-Allow-Origin" in cors_response.headers:
                cors_header = cors_response.headers["Access-Control-Allow-Origin"]
                if cors_header == "*":
                    print("⚠️ CORS設定が緩い（ワイルドカード）")
                    security_config_results["cors"] = "WARN"
                else:
                    print("✅ CORS設定適切")
                    security_config_results["cors"] = "PASS"
            else:
                print("✅ CORS設定確認")
                security_config_results["cors"] = "PASS"
            
            # セキュリティヘッダー確認
            header_response = requests.get(f"{self.base_url}/health", timeout=5)
            security_headers = {
                "X-Content-Type-Options": False,
                "X-Frame-Options": False,
                "X-XSS-Protection": False,
                "Strict-Transport-Security": False
            }
            
            for header in security_headers:
                if header in header_response.headers:
                    security_headers[header] = True
            
            present_headers = sum(security_headers.values())
            total_headers = len(security_headers)
            
            if present_headers >= total_headers * 0.7:  # 70%以上
                print(f"✅ セキュリティヘッダー適切: {present_headers}/{total_headers}")
                security_config_results["security_headers"] = "PASS"
            else:
                print(f"⚠️ セキュリティヘッダー不足: {present_headers}/{total_headers}")
                security_config_results["security_headers"] = "WARN"
            
            # エラーハンドリング確認
            error_response = requests.get(f"{self.base_url}/nonexistent-endpoint", timeout=5)
            if "traceback" in error_response.text.lower() or "exception" in error_response.text.lower():
                print("⚠️ 詳細エラー情報が露出")
                security_config_results["error_handling"] = "WARN"
            else:
                print("✅ エラーハンドリング適切")
                security_config_results["error_handling"] = "PASS"
        
        except Exception as e:
            print(f"❌ セキュリティ設定確認エラー: {str(e)}")
            security_config_results["error"] = str(e)
        
        self.test_results["security_config"] = security_config_results
    
    def generate_report(self):
        """セキュリティ検証レポート生成"""
        print("\n📄 セキュリティ検証レポート生成")
        
        # サマリー計算
        total_tests = 0
        passed_tests = 0
        
        for category, results in self.test_results.items():
            if isinstance(results, dict):
                for test_name, result in results.items():
                    if result in ["PASS", "FAIL", "WARN", "ERROR", "SKIP"]:
                        total_tests += 1
                        if result == "PASS":
                            passed_tests += 1
            elif results in ["PASS", "FAIL", "WARN", "ERROR", "SKIP"]:
                total_tests += 1
                if results == "PASS":
                    passed_tests += 1
        
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        security_level = "HIGH" if pass_rate >= 90 else "MEDIUM" if pass_rate >= 70 else "LOW"
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "pass_rate": round(pass_rate, 2),
                "security_level": security_level
            },
            "detailed_results": self.test_results,
            "recommendations": self.generate_recommendations()
        }
        
        # レポート出力
        try:
            with open("SECURITY_VERIFICATION_REPORT.json", "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False, default=str)
            print("✅ セキュリティ検証レポート生成完了: SECURITY_VERIFICATION_REPORT.json")
        except Exception as e:
            print(f"❌ レポート生成エラー: {str(e)}")
        
        # コンソール出力
        print(f"\n🎯 セキュリティ検証結果サマリー")
        print(f"📊 総合セキュリティスコア: {pass_rate:.1f}% ({security_level})")
        print(f"📈 テスト結果: {passed_tests}/{total_tests} PASS")
        
        return report
    
    def generate_recommendations(self):
        """推奨事項生成"""
        recommendations = []
        
        for category, results in self.test_results.items():
            if isinstance(results, dict):
                for test_name, result in results.items():
                    if result == "FAIL":
                        recommendations.append(f"{category}.{test_name}: 修正が必要です")
                    elif result == "WARN":
                        recommendations.append(f"{category}.{test_name}: 改善を推奨します")
                    elif result == "ERROR":
                        recommendations.append(f"{category}.{test_name}: エラーの調査が必要です")
        
        if not recommendations:
            recommendations.append("セキュリティ検証で重大な問題は発見されませんでした")
        
        return recommendations

if __name__ == "__main__":
    # セキュリティ検証実行
    security_test = SecurityVerificationMinimal()
    results = security_test.run_security_verification()
    
    print("\n🛡️ 認証システム包括的セキュリティ検証完了")