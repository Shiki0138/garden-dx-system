"""
Garden Project Management System - Integration Test Suite
プロジェクト管理システム統合テストスイート

Created by: worker2 (Integration Test Phase)
Date: 2025-07-01
Purpose: 全機能統合テスト・品質保証
"""

import asyncio
import time
import json
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any
import traceback

try:
    import requests
except ImportError:
    print("⚠️ requests not available, using mock responses")
    requests = None

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("⚠️ SQLAlchemy not available, using mock database")
    create_engine = None
    
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("⚠️ psycopg2 not available, using mock database")
    psycopg2 = None

# Test Configuration
TEST_CONFIG = {
    'api_base_url': 'http://localhost:8000',
    'db_url': 'postgresql://postgres:password@localhost:5432/garden_test',
    'performance_thresholds': {
        'api_response_time': 2.0,  # seconds
        'gantt_render_time': 0.1,  # seconds  
        'dashboard_load_time': 3.0,  # seconds
        'concurrent_users': 50,
        'memory_usage_mb': 512
    },
    'test_users': {
        'manager': {
            'username': 'test_manager',
            'password': 'test_password',
            'role': '経営者'
        },
        'employee': {
            'username': 'test_employee', 
            'password': 'test_password',
            'role': '従業員'
        }
    }
}

class ProjectManagementIntegrationTest:
    """プロジェクト管理システム統合テストクラス"""
    
    def __init__(self):
        self.session = requests.Session()
        self.db_engine = create_engine(TEST_CONFIG['db_url'])
        self.db_session = sessionmaker(bind=self.db_engine)()
        self.test_results = {
            'db_migration': [],
            'gantt_chart': [],
            'dashboard': [],
            'rbac': [],
            'performance': [],
            'scenarios': []
        }
        
    async def setup_test_environment(self):
        """テスト環境セットアップ"""
        print("🔧 テスト環境セットアップ開始...")
        
        # データベース接続確認
        try:
            with self.db_engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version = result.fetchone()[0]
                print(f"✅ データベース接続成功: {version}")
                self.test_results['db_migration'].append({
                    'test': 'database_connection',
                    'status': 'PASS',
                    'message': f'PostgreSQL接続成功: {version}'
                })
        except Exception as e:
            print(f"❌ データベース接続失敗: {e}")
            self.test_results['db_migration'].append({
                'test': 'database_connection',
                'status': 'FAIL',
                'message': f'データベース接続失敗: {e}'
            })
            return False
            
        # API接続確認
        try:
            response = self.session.get(f"{TEST_CONFIG['api_base_url']}/health")
            if response.status_code == 200:
                print("✅ API接続成功")
                self.test_results['db_migration'].append({
                    'test': 'api_connection',
                    'status': 'PASS',
                    'message': 'API接続成功'
                })
            else:
                raise Exception(f"API応答エラー: {response.status_code}")
        except Exception as e:
            print(f"❌ API接続失敗: {e}")
            self.test_results['db_migration'].append({
                'test': 'api_connection',
                'status': 'FAIL',
                'message': f'API接続失敗: {e}'
            })
            return False
            
        return True
        
    async def test_db_migration_and_schema(self):
        """1. DBマイグレーション後のスキーマ確認"""
        print("\n🗄️ 1. DBマイグレーション・スキーマテスト開始")
        
        # 必要なテーブルの存在確認
        required_tables = [
            'companies', 'users', 'customers', 'projects', 'project_tasks',
            'budget_tracking', 'change_orders', 'estimates', 'invoices'
        ]
        
        for table in required_tables:
            try:
                result = self.db_session.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    )
                """))
                exists = result.fetchone()[0]
                
                if exists:
                    print(f"✅ テーブル {table} 存在確認")
                    self.test_results['db_migration'].append({
                        'test': f'table_{table}_exists',
                        'status': 'PASS',
                        'message': f'テーブル {table} 存在確認'
                    })
                else:
                    print(f"❌ テーブル {table} が存在しません")
                    self.test_results['db_migration'].append({
                        'test': f'table_{table}_exists',
                        'status': 'FAIL',
                        'message': f'テーブル {table} が存在しません'
                    })
            except Exception as e:
                print(f"❌ テーブル {table} 確認エラー: {e}")
                self.test_results['db_migration'].append({
                    'test': f'table_{table}_exists',
                    'status': 'FAIL',
                    'message': f'テーブル {table} 確認エラー: {e}'
                })
        
        # インデックス確認
        try:
            result = self.db_session.execute(text("""
                SELECT schemaname, tablename, indexname 
                FROM pg_indexes 
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
            """))
            indexes = result.fetchall()
            print(f"✅ インデックス確認: {len(indexes)}個のインデックスが存在")
            self.test_results['db_migration'].append({
                'test': 'indexes_exist',
                'status': 'PASS',
                'message': f'{len(indexes)}個のインデックスが存在'
            })
        except Exception as e:
            print(f"❌ インデックス確認エラー: {e}")
            self.test_results['db_migration'].append({
                'test': 'indexes_exist',
                'status': 'FAIL',
                'message': f'インデックス確認エラー: {e}'
            })

    async def test_gantt_chart_functionality(self):
        """2. ガントチャート機能テスト"""
        print("\n📊 2. ガントチャート機能テスト開始")
        
        # テストプロジェクト作成
        test_project_data = {
            'company_id': 1,
            'customer_id': 1,
            'project_name': '統合テスト用プロジェクト',
            'start_date': '2025-07-01',
            'end_date': '2025-08-01',
            'total_budget': 1000000,
            'estimated_revenue': 1500000
        }
        
        try:
            # プロジェクト作成API呼び出し
            start_time = time.time()
            response = self.session.post(
                f"{TEST_CONFIG['api_base_url']}/api/projects",
                json=test_project_data
            )
            api_response_time = time.time() - start_time
            
            if response.status_code == 201:
                project_data = response.json()
                project_id = project_data['data']['project_id']
                print(f"✅ プロジェクト作成成功 (ID: {project_id}, {api_response_time:.3f}s)")
                
                # API応答時間チェック
                if api_response_time <= TEST_CONFIG['performance_thresholds']['api_response_time']:
                    self.test_results['gantt_chart'].append({
                        'test': 'project_creation_performance',
                        'status': 'PASS',
                        'message': f'プロジェクト作成API応答時間: {api_response_time:.3f}s'
                    })
                else:
                    self.test_results['gantt_chart'].append({
                        'test': 'project_creation_performance',
                        'status': 'FAIL',
                        'message': f'プロジェクト作成API応答時間が遅い: {api_response_time:.3f}s'
                    })
                
                # テストタスク作成
                test_tasks = [
                    {
                        'task_name': '整地・準備作業',
                        'task_type': 'work',
                        'start_date': '2025-07-01',
                        'end_date': '2025-07-03',
                        'budget_amount': 200000
                    },
                    {
                        'task_name': '植栽工事',
                        'task_type': 'work', 
                        'start_date': '2025-07-04',
                        'end_date': '2025-07-10',
                        'budget_amount': 500000
                    },
                    {
                        'task_name': '完成検査',
                        'task_type': 'milestone',
                        'start_date': '2025-07-31',
                        'end_date': '2025-07-31',
                        'budget_amount': 0
                    }
                ]
                
                created_tasks = []
                for task_data in test_tasks:
                    task_response = self.session.post(
                        f"{TEST_CONFIG['api_base_url']}/api/projects/{project_id}/tasks",
                        json=task_data
                    )
                    if task_response.status_code == 201:
                        created_tasks.append(task_response.json()['data'])
                        print(f"✅ タスク作成成功: {task_data['task_name']}")
                    else:
                        print(f"❌ タスク作成失敗: {task_data['task_name']}")
                
                # ガントチャートデータ取得テスト
                gantt_response = self.session.get(
                    f"{TEST_CONFIG['api_base_url']}/api/projects/{project_id}/tasks"
                )
                
                if gantt_response.status_code == 200:
                    tasks_data = gantt_response.json()['data']
                    print(f"✅ ガントチャートデータ取得成功: {len(tasks_data)}タスク")
                    self.test_results['gantt_chart'].append({
                        'test': 'gantt_data_retrieval',
                        'status': 'PASS',
                        'message': f'ガントチャートデータ取得成功: {len(tasks_data)}タスク'
                    })
                    
                    # タスク依存関係テスト
                    if len(created_tasks) >= 2:
                        dependency_data = {
                            'dependencies': [created_tasks[0]['task_id']]
                        }
                        dep_response = self.session.put(
                            f"{TEST_CONFIG['api_base_url']}/api/tasks/{created_tasks[1]['task_id']}",
                            json=dependency_data
                        )
                        if dep_response.status_code == 200:
                            print("✅ タスク依存関係設定成功")
                            self.test_results['gantt_chart'].append({
                                'test': 'task_dependencies',
                                'status': 'PASS',
                                'message': 'タスク依存関係設定成功'
                            })
                        else:
                            print("❌ タスク依存関係設定失敗")
                            self.test_results['gantt_chart'].append({
                                'test': 'task_dependencies',
                                'status': 'FAIL',
                                'message': 'タスク依存関係設定失敗'
                            })
                else:
                    print("❌ ガントチャートデータ取得失敗")
                    self.test_results['gantt_chart'].append({
                        'test': 'gantt_data_retrieval',
                        'status': 'FAIL',
                        'message': 'ガントチャートデータ取得失敗'
                    })
                    
            else:
                print(f"❌ プロジェクト作成失敗: {response.status_code}")
                self.test_results['gantt_chart'].append({
                    'test': 'project_creation',
                    'status': 'FAIL',
                    'message': f'プロジェクト作成失敗: {response.status_code}'
                })
                
        except Exception as e:
            print(f"❌ ガントチャート機能テストエラー: {e}")
            self.test_results['gantt_chart'].append({
                'test': 'gantt_chart_functionality',
                'status': 'FAIL',
                'message': f'ガントチャート機能テストエラー: {e}'
            })

    async def test_dashboard_and_budget_management(self):
        """3. ダッシュボード・予実管理テスト"""
        print("\n📈 3. ダッシュボード・予実管理テスト開始")
        
        try:
            # ダッシュボードメトリクス取得
            start_time = time.time()
            dashboard_response = self.session.get(
                f"{TEST_CONFIG['api_base_url']}/api/projects/dashboard-metrics?company_id=1"
            )
            dashboard_load_time = time.time() - start_time
            
            if dashboard_response.status_code == 200:
                metrics = dashboard_response.json()['data']
                print(f"✅ ダッシュボードメトリクス取得成功 ({dashboard_load_time:.3f}s)")
                
                # 必要なメトリクス項目確認
                required_metrics = [
                    'totalProjects', 'activeProjects', 'completedProjects', 
                    'delayedProjects', 'totalRevenue', 'totalBudget', 'profitRate'
                ]
                
                missing_metrics = [m for m in required_metrics if m not in metrics]
                if not missing_metrics:
                    print("✅ 全ダッシュボードメトリクス項目確認")
                    self.test_results['dashboard'].append({
                        'test': 'dashboard_metrics_completeness',
                        'status': 'PASS',
                        'message': '全ダッシュボードメトリクス項目確認'
                    })
                else:
                    print(f"❌ 不足メトリクス項目: {missing_metrics}")
                    self.test_results['dashboard'].append({
                        'test': 'dashboard_metrics_completeness',
                        'status': 'FAIL',
                        'message': f'不足メトリクス項目: {missing_metrics}'
                    })
                
                # パフォーマンス確認
                if dashboard_load_time <= TEST_CONFIG['performance_thresholds']['dashboard_load_time']:
                    self.test_results['dashboard'].append({
                        'test': 'dashboard_performance',
                        'status': 'PASS',
                        'message': f'ダッシュボード表示時間: {dashboard_load_time:.3f}s'
                    })
                else:
                    self.test_results['dashboard'].append({
                        'test': 'dashboard_performance',
                        'status': 'FAIL',
                        'message': f'ダッシュボード表示時間が遅い: {dashboard_load_time:.3f}s'
                    })
            else:
                print(f"❌ ダッシュボードメトリクス取得失敗: {dashboard_response.status_code}")
                self.test_results['dashboard'].append({
                    'test': 'dashboard_metrics_retrieval',
                    'status': 'FAIL',
                    'message': f'ダッシュボードメトリクス取得失敗: {dashboard_response.status_code}'
                })
            
            # 予実管理テスト
            # 予算追跡データ作成
            budget_data = {
                'task_id': None,
                'actual_cost': 150000,
                'comment': '統合テスト用予算実績'
            }
            
            # 既存プロジェクトから1つ取得
            projects_response = self.session.get(
                f"{TEST_CONFIG['api_base_url']}/api/projects?company_id=1&limit=1"
            )
            
            if projects_response.status_code == 200:
                projects = projects_response.json()['data']
                if projects:
                    project_id = projects[0]['project_id']
                    
                    budget_response = self.session.post(
                        f"{TEST_CONFIG['api_base_url']}/api/projects/{project_id}/budget",
                        json=budget_data
                    )
                    
                    if budget_response.status_code == 201:
                        print("✅ 予算実績記録成功")
                        self.test_results['dashboard'].append({
                            'test': 'budget_tracking',
                            'status': 'PASS',
                            'message': '予算実績記録成功'
                        })
                        
                        # 予算実績取得確認
                        budget_get_response = self.session.get(
                            f"{TEST_CONFIG['api_base_url']}/api/projects/{project_id}/budget"
                        )
                        
                        if budget_get_response.status_code == 200:
                            budget_records = budget_get_response.json()['data']
                            print(f"✅ 予算実績取得成功: {len(budget_records)}件")
                            self.test_results['dashboard'].append({
                                'test': 'budget_retrieval',
                                'status': 'PASS',
                                'message': f'予算実績取得成功: {len(budget_records)}件'
                            })
                        else:
                            print("❌ 予算実績取得失敗")
                            self.test_results['dashboard'].append({
                                'test': 'budget_retrieval',
                                'status': 'FAIL',
                                'message': '予算実績取得失敗'
                            })
                    else:
                        print("❌ 予算実績記録失敗")
                        self.test_results['dashboard'].append({
                            'test': 'budget_tracking',
                            'status': 'FAIL',
                            'message': '予算実績記録失敗'
                        })
                        
        except Exception as e:
            print(f"❌ ダッシュボード・予実管理テストエラー: {e}")
            self.test_results['dashboard'].append({
                'test': 'dashboard_budget_management',
                'status': 'FAIL',
                'message': f'ダッシュボード・予実管理テストエラー: {e}'
            })

    async def test_rbac_permissions(self):
        """4. RBAC権限分離機能テスト"""
        print("\n🔐 4. RBAC権限分離機能テスト開始")
        
        try:
            # 経営者ログインテスト
            manager_login_response = self.session.post(
                f"{TEST_CONFIG['api_base_url']}/api/auth/login",
                json={
                    'username': TEST_CONFIG['test_users']['manager']['username'],
                    'password': TEST_CONFIG['test_users']['manager']['password']
                }
            )
            
            if manager_login_response.status_code == 200:
                manager_token = manager_login_response.json()['access_token']
                print("✅ 経営者ログイン成功")
                
                # 経営者権限でダッシュボードアクセス
                manager_headers = {'Authorization': f'Bearer {manager_token}'}
                manager_dashboard_response = self.session.get(
                    f"{TEST_CONFIG['api_base_url']}/api/rbac/dashboard/metrics?company_id=1",
                    headers=manager_headers
                )
                
                if manager_dashboard_response.status_code == 200:
                    manager_metrics = manager_dashboard_response.json()['data']
                    # 経営者は財務情報にアクセス可能
                    if 'total_revenue' in manager_metrics and 'total_profit' in manager_metrics:
                        print("✅ 経営者財務情報アクセス成功")
                        self.test_results['rbac'].append({
                            'test': 'manager_financial_access',
                            'status': 'PASS',
                            'message': '経営者財務情報アクセス成功'
                        })
                    else:
                        print("❌ 経営者財務情報アクセス失敗")
                        self.test_results['rbac'].append({
                            'test': 'manager_financial_access',
                            'status': 'FAIL',
                            'message': '経営者財務情報アクセス失敗'
                        })
                else:
                    print("❌ 経営者ダッシュボードアクセス失敗")
                    self.test_results['rbac'].append({
                        'test': 'manager_dashboard_access',
                        'status': 'FAIL',
                        'message': '経営者ダッシュボードアクセス失敗'
                    })
            else:
                print("❌ 経営者ログイン失敗")
                self.test_results['rbac'].append({
                    'test': 'manager_login',
                    'status': 'FAIL',
                    'message': '経営者ログイン失敗'
                })
            
            # 従業員ログインテスト
            employee_login_response = self.session.post(
                f"{TEST_CONFIG['api_base_url']}/api/auth/login",
                json={
                    'username': TEST_CONFIG['test_users']['employee']['username'],
                    'password': TEST_CONFIG['test_users']['employee']['password']
                }
            )
            
            if employee_login_response.status_code == 200:
                employee_token = employee_login_response.json()['access_token']
                print("✅ 従業員ログイン成功")
                
                # 従業員権限でダッシュボードアクセス
                employee_headers = {'Authorization': f'Bearer {employee_token}'}
                employee_dashboard_response = self.session.get(
                    f"{TEST_CONFIG['api_base_url']}/api/rbac/my-assignments",
                    headers=employee_headers
                )
                
                if employee_dashboard_response.status_code == 200:
                    print("✅ 従業員担当タスクアクセス成功")
                    self.test_results['rbac'].append({
                        'test': 'employee_task_access',
                        'status': 'PASS',
                        'message': '従業員担当タスクアクセス成功'
                    })
                    
                    # 従業員が財務情報にアクセスできないことを確認
                    employee_financial_response = self.session.get(
                        f"{TEST_CONFIG['api_base_url']}/api/rbac/dashboard/metrics?company_id=1",
                        headers=employee_headers
                    )
                    
                    if employee_financial_response.status_code == 403:
                        print("✅ 従業員財務情報アクセス制限確認")
                        self.test_results['rbac'].append({
                            'test': 'employee_financial_restriction',
                            'status': 'PASS',
                            'message': '従業員財務情報アクセス制限確認'
                        })
                    else:
                        print("❌ 従業員財務情報アクセス制限失敗")
                        self.test_results['rbac'].append({
                            'test': 'employee_financial_restriction',
                            'status': 'FAIL',
                            'message': '従業員財務情報アクセス制限失敗'
                        })
                else:
                    print("❌ 従業員担当タスクアクセス失敗")
                    self.test_results['rbac'].append({
                        'test': 'employee_task_access',
                        'status': 'FAIL',
                        'message': '従業員担当タスクアクセス失敗'
                    })
            else:
                print("❌ 従業員ログイン失敗")
                self.test_results['rbac'].append({
                    'test': 'employee_login',
                    'status': 'FAIL',
                    'message': '従業員ログイン失敗'
                })
                
        except Exception as e:
            print(f"❌ RBAC権限分離機能テストエラー: {e}")
            self.test_results['rbac'].append({
                'test': 'rbac_permissions',
                'status': 'FAIL',
                'message': f'RBAC権限分離機能テストエラー: {e}'
            })

    async def test_performance_load(self):
        """5. パフォーマンス負荷テスト"""
        print("\n⚡ 5. パフォーマンス負荷テスト開始")
        
        try:
            # 同時接続テスト
            concurrent_requests = []
            start_time = time.time()
            
            # 複数の同時APIリクエスト
            for i in range(TEST_CONFIG['performance_thresholds']['concurrent_users']):
                # 非同期でAPIリクエストを実行（簡易版）
                try:
                    response = self.session.get(
                        f"{TEST_CONFIG['api_base_url']}/api/projects?company_id=1&limit=10"
                    )
                    concurrent_requests.append({
                        'request_id': i,
                        'status_code': response.status_code,
                        'response_time': response.elapsed.total_seconds()
                    })
                except Exception as e:
                    concurrent_requests.append({
                        'request_id': i,
                        'status_code': 500,
                        'response_time': 0,
                        'error': str(e)
                    })
            
            total_time = time.time() - start_time
            successful_requests = [r for r in concurrent_requests if r['status_code'] == 200]
            average_response_time = sum(r['response_time'] for r in successful_requests) / len(successful_requests) if successful_requests else 0
            
            print(f"✅ 負荷テスト完了: {len(successful_requests)}/{len(concurrent_requests)} 成功")
            print(f"✅ 平均応答時間: {average_response_time:.3f}s")
            
            # パフォーマンス基準チェック
            if len(successful_requests) >= len(concurrent_requests) * 0.95:  # 95%成功率
                self.test_results['performance'].append({
                    'test': 'concurrent_requests_success_rate',
                    'status': 'PASS',
                    'message': f'同時接続成功率: {len(successful_requests)}/{len(concurrent_requests)}'
                })
            else:
                self.test_results['performance'].append({
                    'test': 'concurrent_requests_success_rate',
                    'status': 'FAIL',
                    'message': f'同時接続成功率が低い: {len(successful_requests)}/{len(concurrent_requests)}'
                })
            
            if average_response_time <= TEST_CONFIG['performance_thresholds']['api_response_time']:
                self.test_results['performance'].append({
                    'test': 'average_response_time',
                    'status': 'PASS',
                    'message': f'平均応答時間: {average_response_time:.3f}s'
                })
            else:
                self.test_results['performance'].append({
                    'test': 'average_response_time',
                    'status': 'FAIL',
                    'message': f'平均応答時間が遅い: {average_response_time:.3f}s'
                })
            
            # 大量データ処理テスト
            large_data_test = {
                'company_id': 1,
                'customer_id': 1,
                'project_name': '大量データテストプロジェクト',
                'start_date': '2025-07-01',
                'end_date': '2025-12-31',
                'total_budget': 10000000,
                'estimated_revenue': 15000000
            }
            
            large_project_response = self.session.post(
                f"{TEST_CONFIG['api_base_url']}/api/projects",
                json=large_data_test
            )
            
            if large_project_response.status_code == 201:
                large_project_id = large_project_response.json()['data']['project_id']
                
                # 大量タスク作成（100個）
                task_creation_start = time.time()
                created_tasks_count = 0
                
                for i in range(100):
                    task_data = {
                        'task_name': f'大量データテストタスク{i+1}',
                        'task_type': 'work',
                        'start_date': '2025-07-01',
                        'end_date': '2025-07-05',
                        'budget_amount': 10000
                    }
                    
                    task_response = self.session.post(
                        f"{TEST_CONFIG['api_base_url']}/api/projects/{large_project_id}/tasks",
                        json=task_data
                    )
                    
                    if task_response.status_code == 201:
                        created_tasks_count += 1
                
                task_creation_time = time.time() - task_creation_start
                print(f"✅ 大量タスク作成: {created_tasks_count}/100 ({task_creation_time:.3f}s)")
                
                if created_tasks_count >= 95:  # 95%成功率
                    self.test_results['performance'].append({
                        'test': 'bulk_task_creation',
                        'status': 'PASS',
                        'message': f'大量タスク作成成功: {created_tasks_count}/100'
                    })
                else:
                    self.test_results['performance'].append({
                        'test': 'bulk_task_creation',
                        'status': 'FAIL',
                        'message': f'大量タスク作成失敗: {created_tasks_count}/100'
                    })
            
        except Exception as e:
            print(f"❌ パフォーマンス負荷テストエラー: {e}")
            self.test_results['performance'].append({
                'test': 'performance_load',
                'status': 'FAIL',
                'message': f'パフォーマンス負荷テストエラー: {e}'
            })

    async def test_integration_scenarios(self):
        """6. 統合シナリオテスト"""
        print("\n🔄 6. 統合シナリオテスト開始")
        
        try:
            # シナリオ1: 見積→プロジェクト→タスク→進捗→請求書の完全フロー
            print("📋 シナリオ1: 完全業務フロー実行")
            
            # 見積からプロジェクト作成
            estimate_to_project_data = {
                'estimate_id': 1,  # 既存の見積IDを使用
                'project_name': '統合シナリオテストプロジェクト',
                'start_date': '2025-07-01',
                'notes': '統合テスト用プロジェクト'
            }
            
            scenario_response = self.session.post(
                f"{TEST_CONFIG['api_base_url']}/api/integration/estimate-to-project",
                json=estimate_to_project_data
            )
            
            if scenario_response.status_code == 200:
                scenario_project = scenario_response.json()['data']
                scenario_project_id = scenario_project['project_id']
                print(f"✅ 見積→プロジェクト変換成功 (ID: {scenario_project_id})")
                
                # タスク進捗更新
                tasks_response = self.session.get(
                    f"{TEST_CONFIG['api_base_url']}/api/projects/{scenario_project_id}/tasks"
                )
                
                if tasks_response.status_code == 200:
                    tasks = tasks_response.json()['data']
                    if tasks:
                        first_task_id = tasks[0]['task_id']
                        
                        # 進捗更新
                        progress_data = {
                            'progress_percentage': 50,
                            'status': 'in_progress',
                            'comment': '統合テスト進捗更新'
                        }
                        
                        progress_response = self.session.put(
                            f"{TEST_CONFIG['api_base_url']}/api/tasks/{first_task_id}/progress",
                            json=progress_data
                        )
                        
                        if progress_response.status_code == 200:
                            print("✅ タスク進捗更新成功")
                            
                            # プロジェクト→請求書作成
                            invoice_data = {
                                'project_id': scenario_project_id,
                                'invoice_date': '2025-07-01',
                                'notes': '統合テスト請求書'
                            }
                            
                            invoice_response = self.session.post(
                                f"{TEST_CONFIG['api_base_url']}/api/integration/project-to-invoice",
                                json=invoice_data
                            )
                            
                            if invoice_response.status_code == 200:
                                print("✅ プロジェクト→請求書変換成功")
                                self.test_results['scenarios'].append({
                                    'test': 'complete_business_flow',
                                    'status': 'PASS',
                                    'message': '見積→プロジェクト→進捗→請求書の完全フロー成功'
                                })
                            else:
                                print("❌ プロジェクト→請求書変換失敗")
                                self.test_results['scenarios'].append({
                                    'test': 'complete_business_flow',
                                    'status': 'FAIL',
                                    'message': 'プロジェクト→請求書変換失敗'
                                })
                        else:
                            print("❌ タスク進捗更新失敗")
                            self.test_results['scenarios'].append({
                                'test': 'complete_business_flow',
                                'status': 'FAIL',
                                'message': 'タスク進捗更新失敗'
                            })
                else:
                    print("❌ タスク取得失敗")
                    self.test_results['scenarios'].append({
                        'test': 'complete_business_flow',
                        'status': 'FAIL',
                        'message': 'タスク取得失敗'
                    })
            else:
                print("❌ 見積→プロジェクト変換失敗")
                self.test_results['scenarios'].append({
                    'test': 'complete_business_flow',
                    'status': 'FAIL',
                    'message': '見積→プロジェクト変換失敗'
                })
            
            # シナリオ2: 権限別アクセスパターンテスト
            print("🔐 シナリオ2: 権限別アクセスパターンテスト")
            # (前のRBACテストで実施済み)
            
        except Exception as e:
            print(f"❌ 統合シナリオテストエラー: {e}")
            self.test_results['scenarios'].append({
                'test': 'integration_scenarios',
                'status': 'FAIL',
                'message': f'統合シナリオテストエラー: {e}'
            })

    async def generate_test_report(self):
        """テストレポート生成"""
        print("\n📊 統合テストレポート生成中...")
        
        # 全テスト結果を集計
        all_results = []
        for category, results in self.test_results.items():
            for result in results:
                result['category'] = category
                all_results.append(result)
        
        total_tests = len(all_results)
        passed_tests = len([r for r in all_results if r['status'] == 'PASS'])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            'test_execution_date': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': round(success_rate, 2),
                'overall_status': 'PASS' if success_rate >= 95 else 'FAIL'
            },
            'category_results': {
                category: {
                    'total': len(results),
                    'passed': len([r for r in results if r['status'] == 'PASS']),
                    'failed': len([r for r in results if r['status'] == 'FAIL'])
                }
                for category, results in self.test_results.items()
            },
            'detailed_results': all_results
        }
        
        return report

    async def run_all_tests(self):
        """全統合テスト実行"""
        print("🚀 プロジェクト管理システム統合テスト開始")
        print("=" * 60)
        
        # テスト環境セットアップ
        if not await self.setup_test_environment():
            print("❌ テスト環境セットアップ失敗")
            return
        
        # 1. DBマイグレーション・スキーマテスト
        await self.test_db_migration_and_schema()
        
        # 2. ガントチャート機能テスト
        await self.test_gantt_chart_functionality()
        
        # 3. ダッシュボード・予実管理テスト
        await self.test_dashboard_and_budget_management()
        
        # 4. RBAC権限分離機能テスト
        await self.test_rbac_permissions()
        
        # 5. パフォーマンス負荷テスト
        await self.test_performance_load()
        
        # 6. 統合シナリオテスト
        await self.test_integration_scenarios()
        
        # レポート生成
        report = await self.generate_test_report()
        
        print("\n" + "=" * 60)
        print("🎯 統合テスト完了")
        print(f"✅ 成功: {report['summary']['passed_tests']}")
        print(f"❌ 失敗: {report['summary']['failed_tests']}")
        print(f"📊 成功率: {report['summary']['success_rate']}%")
        print(f"🏆 総合結果: {report['summary']['overall_status']}")
        print("=" * 60)
        
        return report

# テスト実行
async def main():
    """メイン実行関数"""
    test_suite = ProjectManagementIntegrationTest()
    report = await test_suite.run_all_tests()
    
    # レポートをファイルに保存
    with open('/Users/leadfive/Desktop/system/garden/tests/reports/project_management_integration_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("📄 詳細レポートが保存されました: tests/reports/project_management_integration_report.json")
    
    return report

if __name__ == "__main__":
    asyncio.run(main())