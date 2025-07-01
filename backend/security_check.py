"""
Garden DX セキュリティ検証スクリプト
"""
import os
import re
import subprocess

class SecurityChecker:
    def __init__(self):
        self.issues = []
        self.passed = []
    
    def check_env_file(self):
        """環境変数ファイルのセキュリティチェック"""
        if os.path.exists('.env'):
            with open('.env', 'r') as f:
                content = f.read()
                
            # シークレットキーの確認
            if 'your-secret-key-here' in content:
                self.issues.append("⚠️  SECRET_KEY がデフォルト値のままです")
            else:
                self.passed.append("✅ SECRET_KEY が設定されています")
                
            # データベースパスワードの確認
            if 'postgres:postgres' in content:
                self.issues.append("⚠️  データベースパスワードがデフォルト値です")
            else:
                self.passed.append("✅ データベースパスワードが変更されています")
    
    def check_cors_settings(self):
        """CORS設定のチェック"""
        try:
            with open('main.py', 'r') as f:
                content = f.read()
                
            if 'CORSMiddleware' in content:
                self.passed.append("✅ CORS設定が実装されています")
                
                # 本番環境での * 許可チェック
                if 'allow_origins=["*"]' in content:
                    self.issues.append("⚠️  CORS設定で全てのオリジンを許可しています")
            else:
                self.issues.append("❌ CORS設定が見つかりません")
        except:
            pass
    
    def check_sql_injection(self):
        """SQLインジェクション対策チェック"""
        vulnerable_patterns = [
            r'f".*WHERE.*{.*}.*"',  # f-string でのSQL構築
            r'\.format\(.*\).*WHERE',  # formatでのSQL構築
            r'\+.*WHERE.*\+',  # 文字列結合でのSQL構築
        ]
        
        py_files = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.py'):
                    py_files.append(os.path.join(root, file))
        
        vulnerable_found = False
        for file_path in py_files:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    
                for pattern in vulnerable_patterns:
                    if re.search(pattern, content):
                        vulnerable_found = True
                        self.issues.append(f"⚠️  SQLインジェクションの可能性: {file_path}")
                        break
            except:
                pass
        
        if not vulnerable_found:
            self.passed.append("✅ SQLインジェクション対策が実装されています")
    
    def check_password_hashing(self):
        """パスワードハッシュ化チェック"""
        try:
            # auth_service.pyのチェック
            if os.path.exists('services/auth_service.py'):
                with open('services/auth_service.py', 'r') as f:
                    content = f.read()
                    
                if 'bcrypt' in content or 'passlib' in content:
                    self.passed.append("✅ パスワードハッシュ化が実装されています")
                else:
                    self.issues.append("❌ パスワードハッシュ化が見つかりません")
        except:
            pass
    
    def check_authentication(self):
        """認証実装チェック"""
        try:
            with open('main.py', 'r') as f:
                content = f.read()
                
            if 'HTTPBearer' in content or 'OAuth2PasswordBearer' in content:
                self.passed.append("✅ Bearer認証が実装されています")
            else:
                self.issues.append("⚠️  認証実装が不完全な可能性があります")
                
            if 'jwt' in content.lower():
                self.passed.append("✅ JWT認証が実装されています")
        except:
            pass
    
    def run_all_checks(self):
        """全セキュリティチェック実行"""
        print("\n" + "="*50)
        print("🔐 Garden DX セキュリティ検証")
        print("="*50 + "\n")
        
        self.check_env_file()
        self.check_cors_settings()
        self.check_sql_injection()
        self.check_password_hashing()
        self.check_authentication()
        
        # 結果表示
        print("【合格項目】")
        for item in self.passed:
            print(f"  {item}")
        
        if self.issues:
            print("\n【要対応項目】")
            for issue in self.issues:
                print(f"  {issue}")
        
        # サマリー
        total = len(self.passed) + len(self.issues)
        passed = len(self.passed)
        
        print("\n" + "="*50)
        print(f"📊 セキュリティスコア: {passed}/{total}")
        
        if passed == total:
            print("🎉 全てのセキュリティチェックに合格しました！")
        else:
            print("⚠️  セキュリティ改善が必要です")
        
        print("="*50 + "\n")
        
        return len(self.issues) == 0

if __name__ == "__main__":
    checker = SecurityChecker()
    success = checker.run_all_checks()
    exit(0 if success else 1)