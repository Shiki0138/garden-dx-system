"""
Garden DX - キャッシュサービス
API応答時間最適化のためのキャッシュ機能
"""

import json
import hashlib
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)

class MemoryCache:
    """メモリベースキャッシュ（Redis代替）"""
    
    def __init__(self, default_ttl: int = 300):  # 5分
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _is_expired(self, cache_entry: Dict[str, Any]) -> bool:
        """キャッシュエントリの期限切れチェック"""
        return datetime.now() > cache_entry['expires_at']
    
    def _cleanup_expired(self):
        """期限切れエントリの削除"""
        current_time = datetime.now()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time > entry['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]
    
    def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得"""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        if self._is_expired(entry):
            del self._cache[key]
            return None
        
        entry['access_count'] += 1
        entry['last_accessed'] = datetime.now()
        return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """キャッシュに値を設定"""
        if ttl is None:
            ttl = self.default_ttl
        
        self._cache[key] = {
            'value': value,
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(seconds=ttl),
            'last_accessed': datetime.now(),
            'access_count': 0
        }
        
        # 定期クリーンアップ（10件ごと）
        if len(self._cache) % 10 == 0:
            self._cleanup_expired()
    
    def delete(self, key: str) -> bool:
        """キャッシュから削除"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """全キャッシュクリア"""
        self._cache.clear()
    
    def stats(self) -> Dict[str, Any]:
        """キャッシュ統計情報"""
        self._cleanup_expired()
        total_access = sum(entry['access_count'] for entry in self._cache.values())
        
        return {
            'total_entries': len(self._cache),
            'total_access_count': total_access,
            'memory_usage_mb': len(str(self._cache)) / 1024 / 1024,
            'oldest_entry': min(
                (entry['created_at'] for entry in self._cache.values()),
                default=None
            )
        }

# グローバルキャッシュインスタンス
cache = MemoryCache(default_ttl=300)

def cache_key_builder(*args, **kwargs) -> str:
    """キャッシュキー生成"""
    key_data = {
        'args': str(args),
        'kwargs': sorted(kwargs.items()) if kwargs else []
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()

def cached(ttl: int = 300, key_prefix: str = ""):
    """キャッシュデコレータ"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # キャッシュキー生成
            cache_key = f"{key_prefix}:{func.__name__}:{cache_key_builder(*args, **kwargs)}"
            
            # キャッシュから取得試行
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_result
            
            # キャッシュミスの場合、関数実行
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            # 結果をキャッシュ
            cache.set(cache_key, result, ttl)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # キャッシュキー生成
            cache_key = f"{key_prefix}:{func.__name__}:{cache_key_builder(*args, **kwargs)}"
            
            # キャッシュから取得試行
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_result
            
            # キャッシュミスの場合、関数実行
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)
            
            # 結果をキャッシュ
            cache.set(cache_key, result, ttl)
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def invalidate_cache_pattern(pattern: str) -> int:
    """パターンマッチによるキャッシュ無効化"""
    deleted_count = 0
    keys_to_delete = []
    
    for key in cache._cache.keys():
        if pattern in key:
            keys_to_delete.append(key)
    
    for key in keys_to_delete:
        cache.delete(key)
        deleted_count += 1
    
    logger.info(f"Invalidated {deleted_count} cache entries matching pattern: {pattern}")
    return deleted_count

# 価格マスタ専用キャッシュ機能
class PriceMasterCache:
    """単価マスタ専用高速キャッシュ"""
    
    @staticmethod
    @cached(ttl=1800, key_prefix="price_master")  # 30分
    def get_categories(company_id: int):
        """カテゴリ階層キャッシュ"""
        pass  # 実装は呼び出し元で
    
    @staticmethod
    @cached(ttl=600, key_prefix="price_master")  # 10分
    def search_items(company_id: int, category: str = None, search: str = None):
        """品目検索結果キャッシュ"""
        pass
    
    @staticmethod
    def invalidate_company_cache(company_id: int):
        """会社別価格マスタキャッシュ無効化"""
        return invalidate_cache_pattern(f"price_master:*:company_id:{company_id}")

# 見積関連キャッシュ
class EstimateCache:
    """見積関連キャッシュ"""
    
    @staticmethod
    @cached(ttl=300, key_prefix="estimate")  # 5分
    def get_estimate_list(company_id: int, status: str = None, customer_id: int = None):
        """見積一覧キャッシュ"""
        pass
    
    @staticmethod
    @cached(ttl=180, key_prefix="estimate")  # 3分
    def get_profitability_analysis(estimate_id: int):
        """収益性分析キャッシュ"""
        pass
    
    @staticmethod
    def invalidate_estimate_cache(estimate_id: int):
        """特定見積のキャッシュ無効化"""
        return invalidate_cache_pattern(f"estimate:*:estimate_id:{estimate_id}")
    
    @staticmethod
    def invalidate_company_estimates(company_id: int):
        """会社の見積関連キャッシュ全無効化"""
        return invalidate_cache_pattern(f"estimate:*:company_id:{company_id}")

# キャッシュウォーミング
async def warm_up_cache():
    """起動時キャッシュウォーミング"""
    logger.info("Starting cache warm-up...")
    
    try:
        # よく使われるデータを事前にロード
        # 実装は必要に応じて追加
        logger.info("Cache warm-up completed")
    except Exception as e:
        logger.error(f"Cache warm-up failed: {e}")

# パフォーマンス計測デコレータ
def performance_monitor(func):
    """パフォーマンス計測"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = datetime.now()
        try:
            result = await func(*args, **kwargs)
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"API {func.__name__} executed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"API {func.__name__} failed in {duration:.3f}s: {e}")
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = datetime.now()
        try:
            result = func(*args, **kwargs)
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Function {func.__name__} executed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"Function {func.__name__} failed in {duration:.3f}s: {e}")
            raise
    
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper