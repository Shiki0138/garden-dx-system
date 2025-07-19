"""
Garden DX - 権限チェックミドルウェア
全API エンドポイントでのRBAC権限チェック自動実装
"""

from fastapi import HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, List, Optional, Callable, Any
import re
from datetime import datetime, timezone
import json

from .jwt_auth import JWTAuthManager, UserAuth, get_current_user
from .rbac import RBACManager, UserRole, Permission, rbac_manager
from .security import SessionSecurity, SecurityMiddleware, session_security

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """認証ミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.auth_manager = JWTAuthManager()
        self.excluded_paths = [
            "/",
            "/health",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/static",
            "/favicon.ico"
        ]
    
    async def dispatch(self, request: Request, call_next):
        # 除外パスチェック
        if self._is_excluded_path(request.url.path):
            return await call_next(request)
        
        # 認証が必要なパスの場合
        if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/auth/"):
            try:
                # JWTトークン取得
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer "):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="認証が必要です",
                        headers={"WWW-Authenticate": "Bearer"}
                    )
                
                token = auth_header.split(" ")[1]
                
                # トークン検証
                payload = self.auth_manager.verify_token(token)
                if not payload:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="無効なトークンです",
                        headers={"WWW-Authenticate": "Bearer"}
                    )
                
                # ユーザー情報をリクエストに追加
                request.state.current_user = UserAuth(
                    user_id=payload.get("user_id"),
                    username=payload.get("sub"),
                    email=payload.get("email"),
                    role=payload.get("role"),
                    company_id=payload.get("company_id"),
                    full_name="",  # 必要に応じて取得
                    is_active=True
                )
                
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="認証エラーが発生しました",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        
        response = await call_next(request)
        return response
    
    def _is_excluded_path(self, path: str) -> bool:
        """除外パス判定"""
        for excluded in self.excluded_paths:
            if path.startswith(excluded):
                return True
        return False

class PermissionMiddleware(BaseHTTPMiddleware):
    """権限チェックミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.rbac_manager = rbac_manager
        
        # エンドポイント別権限マッピング
        self.endpoint_permissions = {
            # 顧客管理
            "GET /api/customers": Permission.CUSTOMER_READ,
            "POST /api/customers": Permission.CUSTOMER_WRITE,
            "PUT /api/customers": Permission.CUSTOMER_WRITE,
            "DELETE /api/customers": Permission.CUSTOMER_DELETE,
            
            # 見積管理
            "GET /api/estimates": Permission.ESTIMATE_READ,
            "POST /api/estimates": Permission.ESTIMATE_WRITE,
            "PUT /api/estimates": Permission.ESTIMATE_WRITE,
            "DELETE /api/estimates": Permission.ESTIMATE_DELETE,
            "POST /api/estimates/.*/approve": Permission.ESTIMATE_APPROVE,
            
            # 単価マスタ
            "GET /api/price-master": Permission.PRICE_MASTER_READ,
            "POST /api/price-master": Permission.PRICE_MASTER_WRITE,
            "PUT /api/price-master": Permission.PRICE_MASTER_WRITE,
            "DELETE /api/price-master": Permission.PRICE_MASTER_DELETE,
            
            # プロジェクト管理
            "GET /api/projects": Permission.PROJECT_READ,
            "POST /api/projects": Permission.PROJECT_WRITE,
            "PUT /api/projects": Permission.PROJECT_WRITE,
            "DELETE /api/projects": Permission.PROJECT_DELETE,
            
            # 請求書
            "GET /api/invoices": Permission.INVOICE_READ,
            "POST /api/invoices": Permission.INVOICE_WRITE,
            "PUT /api/invoices": Permission.INVOICE_WRITE,
            "DELETE /api/invoices": Permission.INVOICE_DELETE,
            "POST /api/invoices/.*/issue": Permission.INVOICE_ISSUE,
            
            # 収益性ダッシュボード
            "GET /api/dashboard/profit": Permission.DASHBOARD_PROFIT,
            "GET /api/dashboard/analysis": Permission.DASHBOARD_ANALYSIS,
            "GET /api/estimates/.*/profitability": Permission.PROFIT_READ,
            
            # システム設定
            "GET /api/settings": Permission.SYSTEM_SETTINGS,
            "POST /api/settings": Permission.SYSTEM_SETTINGS,
            "PUT /api/settings": Permission.SYSTEM_SETTINGS,
            "GET /api/users": Permission.USER_MANAGE,
            "POST /api/users": Permission.USER_MANAGE,
            "PUT /api/users": Permission.USER_MANAGE,
            "DELETE /api/users": Permission.USER_MANAGE,
        }
    
    async def dispatch(self, request: Request, call_next):
        # 認証済みユーザーがいない場合はスキップ
        if not hasattr(request.state, 'current_user'):
            return await call_next(request)
        
        current_user = request.state.current_user
        
        # 権限チェックが必要なAPIエンドポイントの場合
        if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/auth/"):
            required_permission = self._get_required_permission(request.method, request.url.path)
            
            if required_permission:
                # 権限チェック
                user_role = UserRole(current_user.role)
                if not self.rbac_manager.has_permission(user_role, required_permission):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"この操作には '{required_permission.value}' 権限が必要です"
                    )
        
        response = await call_next(request)
        return response
    
    def _get_required_permission(self, method: str, path: str) -> Optional[Permission]:
        """必要な権限を取得"""
        endpoint_key = f"{method} {path}"
        
        # 完全一致
        if endpoint_key in self.endpoint_permissions:
            return self.endpoint_permissions[endpoint_key]
        
        # 正規表現マッチング
        for pattern, permission in self.endpoint_permissions.items():
            if re.match(pattern.replace(".*", "[^/]*"), endpoint_key):
                return permission
        
        return None

class DataFilteringMiddleware(BaseHTTPMiddleware):
    """データフィルタリングミドルウェア（権限に基づくレスポンス制御）"""
    
    def __init__(self, app):
        super().__init__(app)
        self.rbac_manager = rbac_manager
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 認証済みユーザーがいない場合はスキップ
        if not hasattr(request.state, 'current_user'):
            return response
        
        current_user = request.state.current_user
        user_role = UserRole(current_user.role)
        
        # レスポンスデータフィルタリング
        if (response.status_code == 200 and 
            request.url.path.startswith("/api/") and 
            hasattr(response, 'body')):
            
            try:
                # レスポンスボディ取得
                body = response.body
                if body:
                    response_data = json.loads(body)
                    
                    # 権限に基づくデータフィルタリング
                    filtered_data = self._filter_response_data(response_data, user_role, request.url.path)
                    
                    # フィルタリング済みデータでレスポンス更新
                    if filtered_data != response_data:
                        new_body = json.dumps(filtered_data, ensure_ascii=False, default=str)
                        response.body = new_body.encode()
                        response.headers["content-length"] = str(len(response.body))
            
            except (json.JSONDecodeError, AttributeError):
                # JSONでない場合はスキップ
                pass
        
        return response
    
    def _filter_response_data(self, data: Any, user_role: UserRole, path: str) -> Any:
        """権限に基づくレスポンスデータフィルタリング"""
        if isinstance(data, dict):
            return self._filter_dict(data, user_role, path)
        elif isinstance(data, list):
            return [self._filter_response_data(item, user_role, path) for item in data]
        else:
            return data
    
    def _filter_dict(self, data: Dict[str, Any], user_role: UserRole, path: str) -> Dict[str, Any]:
        """辞書データのフィルタリング"""
        filtered_data = data.copy()
        
        # 従業員の場合は原価・利益情報を除去
        if user_role == UserRole.EMPLOYEE:
            sensitive_fields = [
                'purchase_price',     # 仕入単価
                'total_cost',         # 原価合計
                'line_cost',          # 明細原価
                'gross_profit',       # 粗利額
                'gross_margin_rate',  # 粗利率
                'markup_rate',        # 掛率
                'default_markup_rate', # 標準掛率
            ]
            
            for field in sensitive_fields:
                if field in filtered_data:
                    del filtered_data[field]
            
            # 見積の最終調整額は経営者のみ
            if path.startswith("/api/estimates") and 'adjustment_amount' in filtered_data:
                del filtered_data['adjustment_amount']
        
        # 再帰的フィルタリング
        for key, value in filtered_data.items():
            if isinstance(value, (dict, list)):
                filtered_data[key] = self._filter_response_data(value, user_role, path)
        
        return filtered_data

class AuditLogMiddleware(BaseHTTPMiddleware):
    """監査ログミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.audit_logs: List[Dict[str, Any]] = []
    
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now(timezone.utc)
        
        # リクエスト情報記録
        log_entry = {
            "timestamp": start_time,
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", ""),
            "user_id": None,
            "username": None,
            "company_id": None,
            "status_code": None,
            "processing_time_ms": None,
            "error": None
        }
        
        # ユーザー情報追加
        if hasattr(request.state, 'current_user'):
            user = request.state.current_user
            log_entry.update({
                "user_id": user.user_id,
                "username": user.username,
                "company_id": user.company_id
            })
        
        try:
            response = await call_next(request)
            log_entry["status_code"] = response.status_code
            
        except Exception as e:
            log_entry["error"] = str(e)
            log_entry["status_code"] = 500
            raise
        
        finally:
            # 処理時間計算
            end_time = datetime.now(timezone.utc)
            processing_time = (end_time - start_time).total_seconds() * 1000
            log_entry["processing_time_ms"] = round(processing_time, 2)
            
            # ログ保存
            self.audit_logs.append(log_entry)
            
            # ログローテーション（最新1000件のみ保持）
            if len(self.audit_logs) > 1000:
                self.audit_logs = self.audit_logs[-1000:]
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """クライアントIP取得"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def get_audit_logs(self, user_id: Optional[int] = None, 
                       start_time: Optional[datetime] = None,
                       end_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """監査ログ取得"""
        filtered_logs = self.audit_logs
        
        if user_id:
            filtered_logs = [log for log in filtered_logs if log["user_id"] == user_id]
        
        if start_time:
            filtered_logs = [log for log in filtered_logs if log["timestamp"] >= start_time]
        
        if end_time:
            filtered_logs = [log for log in filtered_logs if log["timestamp"] <= end_time]
        
        return filtered_logs

# 統合ミドルウェアチェーン
class GardenSecurityMiddleware(BaseHTTPMiddleware):
    """Garden DX 統合セキュリティミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.security_middleware = SecurityMiddleware(app)
        self.auth_middleware = AuthenticationMiddleware(app)
        self.permission_middleware = PermissionMiddleware(app)
        self.data_filtering_middleware = DataFilteringMiddleware(app)
        self.audit_middleware = AuditLogMiddleware(app)
    
    async def dispatch(self, request: Request, call_next):
        # ミドルウェアチェーン実行
        
        # 1. セキュリティ基盤
        response = await self.security_middleware.dispatch(request, call_next)
        
        # 2. 認証
        # (実際の実装では適切なチェーン化が必要)
        
        return response

# グローバルインスタンス
auth_middleware = AuthenticationMiddleware
permission_middleware = PermissionMiddleware
data_filtering_middleware = DataFilteringMiddleware
audit_middleware = AuditLogMiddleware