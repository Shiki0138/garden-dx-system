-- Garden DX - 造園業向け統合業務管理システム
-- 本番環境データベース初期化スクリプト

-- =============================================================================
-- 本番環境用データベース・ユーザー作成
-- =============================================================================

-- データベース作成
CREATE DATABASE garden_dx 
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'ja_JP.UTF-8'
    LC_CTYPE = 'ja_JP.UTF-8'
    TEMPLATE = template0;

-- データベースコメント
COMMENT ON DATABASE garden_dx IS '造園業向け統合業務管理システム Garden DX';

-- データベースに接続
\c garden_dx;

-- =============================================================================
-- 拡張機能の有効化
-- =============================================================================

-- UUID生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 暗号化関数
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 全文検索（日本語対応）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 統計情報拡張
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 地理情報システム（住所検索用）
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- 本番環境用ユーザー作成
-- =============================================================================

-- アプリケーション用ユーザー（読み書き権限）
CREATE USER garden_app WITH 
    ENCRYPTED PASSWORD '${GARDEN_APP_PASSWORD}'
    CONNECTION LIMIT 50;

-- 読み取り専用ユーザー（レポート・分析用）
CREATE USER garden_readonly WITH 
    ENCRYPTED PASSWORD '${GARDEN_READONLY_PASSWORD}'
    CONNECTION LIMIT 10;

-- バックアップ用ユーザー
CREATE USER garden_backup WITH 
    ENCRYPTED PASSWORD '${GARDEN_BACKUP_PASSWORD}'
    CONNECTION LIMIT 5;

-- 監視用ユーザー
CREATE USER garden_monitor WITH 
    ENCRYPTED PASSWORD '${GARDEN_MONITOR_PASSWORD}'
    CONNECTION LIMIT 3;

-- レプリケーション用ユーザー
CREATE USER replicator WITH 
    REPLICATION 
    ENCRYPTED PASSWORD '${REPLICATION_PASSWORD}'
    CONNECTION LIMIT 3;

-- =============================================================================
-- スキーマ作成
-- =============================================================================

-- メインスキーマ
CREATE SCHEMA IF NOT EXISTS garden_main AUTHORIZATION garden_app;

-- 監査ログ用スキーマ
CREATE SCHEMA IF NOT EXISTS garden_audit AUTHORIZATION garden_app;

-- バックアップ用スキーマ
CREATE SCHEMA IF NOT EXISTS garden_backup AUTHORIZATION garden_backup;

-- 統計・分析用スキーマ
CREATE SCHEMA IF NOT EXISTS garden_analytics AUTHORIZATION garden_readonly;

-- システム管理用スキーマ
CREATE SCHEMA IF NOT EXISTS garden_system AUTHORIZATION garden_app;

-- スキーマコメント
COMMENT ON SCHEMA garden_main IS 'メインビジネスデータ';
COMMENT ON SCHEMA garden_audit IS '監査ログ・変更履歴';
COMMENT ON SCHEMA garden_backup IS 'バックアップ関連';
COMMENT ON SCHEMA garden_analytics IS '分析・レポート用';
COMMENT ON SCHEMA garden_system IS 'システム管理';

-- =============================================================================
-- 基本テーブル作成
-- =============================================================================

-- 会社マスタ
CREATE TABLE garden_main.companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL UNIQUE,
    postal_code VARCHAR(8),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    fax VARCHAR(20),
    website VARCHAR(200),
    business_license VARCHAR(50), -- 建設業許可番号
    representative_name VARCHAR(100),
    capital BIGINT,
    established_date DATE,
    business_hours VARCHAR(100),
    closed_days VARCHAR(100),
    logo_url TEXT,
    seal_url TEXT,
    business_description TEXT,
    specialties TEXT[], -- 専門分野配列
    service_areas TEXT[], -- サービス対応エリア配列
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT companies_email_check CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT companies_capital_check CHECK (capital >= 0)
);

-- 会社テーブルインデックス
CREATE INDEX idx_companies_name ON garden_main.companies(company_name);
CREATE INDEX idx_companies_active ON garden_main.companies(is_active);

-- ユーザーマスタ
CREATE TABLE garden_main.users (
    user_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES garden_main.companies(company_id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(32) NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'employee', 'viewer')),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(50),
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT users_failed_attempts_check CHECK (failed_login_attempts >= 0),
    CONSTRAINT users_username_length CHECK (length(username) >= 3)
);

-- ユーザーテーブルインデックス
CREATE INDEX idx_users_company ON garden_main.users(company_id);
CREATE INDEX idx_users_username ON garden_main.users(username);
CREATE INDEX idx_users_email ON garden_main.users(email);
CREATE INDEX idx_users_active ON garden_main.users(is_active);
CREATE INDEX idx_users_role ON garden_main.users(role);

-- 顧客マスタ
CREATE TABLE garden_main.customers (
    customer_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES garden_main.companies(company_id) ON DELETE CASCADE,
    customer_code VARCHAR(20) UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'corporate')),
    postal_code VARCHAR(8),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    contact_person VARCHAR(100),
    notes TEXT,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- 支払期限（日数）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT customers_credit_limit_check CHECK (credit_limit >= 0),
    CONSTRAINT customers_payment_terms_check CHECK (payment_terms > 0)
);

-- 顧客テーブルインデックス
CREATE INDEX idx_customers_company ON garden_main.customers(company_id);
CREATE INDEX idx_customers_name ON garden_main.customers(customer_name);
CREATE INDEX idx_customers_code ON garden_main.customers(customer_code);
CREATE INDEX idx_customers_active ON garden_main.customers(is_active);
CREATE INDEX idx_customers_type ON garden_main.customers(customer_type);

-- 全文検索インデックス（顧客名・住所）
CREATE INDEX idx_customers_name_trgm ON garden_main.customers USING GIN (customer_name gin_trgm_ops);
CREATE INDEX idx_customers_address_trgm ON garden_main.customers USING GIN (address gin_trgm_ops);

-- =============================================================================
-- 行レベルセキュリティ（RLS）設定
-- =============================================================================

-- 行レベルセキュリティ有効化
ALTER TABLE garden_main.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_main.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_main.customers ENABLE ROW LEVEL SECURITY;

-- 会社テーブルのRLSポリシー
CREATE POLICY company_isolation_policy ON garden_main.companies
    FOR ALL
    TO garden_app
    USING (company_id = current_setting('app.current_company_id')::INTEGER);

-- ユーザーテーブルのRLSポリシー
CREATE POLICY user_company_isolation_policy ON garden_main.users
    FOR ALL
    TO garden_app
    USING (company_id = current_setting('app.current_company_id')::INTEGER);

-- 顧客テーブルのRLSポリシー
CREATE POLICY customer_company_isolation_policy ON garden_main.customers
    FOR ALL
    TO garden_app
    USING (company_id = current_setting('app.current_company_id')::INTEGER);

-- =============================================================================
-- 権限設定
-- =============================================================================

-- garden_app ユーザー権限
GRANT CONNECT ON DATABASE garden_dx TO garden_app;
GRANT USAGE ON SCHEMA garden_main TO garden_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA garden_main TO garden_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA garden_main TO garden_app;

-- garden_readonly ユーザー権限
GRANT CONNECT ON DATABASE garden_dx TO garden_readonly;
GRANT USAGE ON SCHEMA garden_main TO garden_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA garden_main TO garden_readonly;

-- garden_monitor ユーザー権限
GRANT CONNECT ON DATABASE garden_dx TO garden_monitor;
GRANT USAGE ON SCHEMA pg_catalog TO garden_monitor;
GRANT SELECT ON pg_stat_activity TO garden_monitor;
GRANT SELECT ON pg_stat_database TO garden_monitor;

-- =============================================================================
-- 監査ログテーブル
-- =============================================================================

CREATE TABLE garden_audit.audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id INTEGER,
    company_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    client_ip INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 監査ログインデックス
CREATE INDEX idx_audit_log_table ON garden_audit.audit_log(table_name);
CREATE INDEX idx_audit_log_operation ON garden_audit.audit_log(operation);
CREATE INDEX idx_audit_log_user ON garden_audit.audit_log(user_id);
CREATE INDEX idx_audit_log_company ON garden_audit.audit_log(company_id);
CREATE INDEX idx_audit_log_created ON garden_audit.audit_log(created_at);

-- =============================================================================
-- セキュリティ監視テーブル
-- =============================================================================

CREATE TABLE garden_audit.security_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    user_id INTEGER,
    username VARCHAR(50),
    client_ip INET,
    user_agent TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- セキュリティイベントインデックス
CREATE INDEX idx_security_events_type ON garden_audit.security_events(event_type);
CREATE INDEX idx_security_events_severity ON garden_audit.security_events(severity);
CREATE INDEX idx_security_events_created ON garden_audit.security_events(created_at);

-- =============================================================================
-- パフォーマンス監視テーブル
-- =============================================================================

CREATE TABLE garden_system.performance_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,4),
    unit VARCHAR(20),
    source VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- パフォーマンスメトリクスインデックス
CREATE INDEX idx_performance_metrics_name ON garden_system.performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_recorded ON garden_system.performance_metrics(recorded_at);

-- =============================================================================
-- 暗号化ファンクション
-- =============================================================================

-- パスワードハッシュ化関数
CREATE OR REPLACE FUNCTION garden_main.hash_password(password TEXT, salt TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, '$2b$12$' || salt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- パスワード検証関数
CREATE OR REPLACE FUNCTION garden_main.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- データ暗号化関数
-- =============================================================================

-- 機密データ暗号化
CREATE OR REPLACE FUNCTION garden_main.encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 機密データ復号化
CREATE OR REPLACE FUNCTION garden_main.decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 自動更新トリガー
-- =============================================================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION garden_main.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_atトリガー設定
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON garden_main.companies 
    FOR EACH ROW 
    EXECUTE FUNCTION garden_main.update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON garden_main.users 
    FOR EACH ROW 
    EXECUTE FUNCTION garden_main.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON garden_main.customers 
    FOR EACH ROW 
    EXECUTE FUNCTION garden_main.update_updated_at_column();

-- =============================================================================
-- バックアップ設定
-- =============================================================================

-- バックアップメタデータテーブル
CREATE TABLE garden_backup.backup_history (
    backup_id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
    backup_path TEXT NOT NULL,
    backup_size BIGINT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 初期データ挿入
-- =============================================================================

-- デフォルト会社データ（本番では実際のデータに置き換え）
INSERT INTO garden_main.companies (
    company_name, postal_code, address, phone, email, 
    business_license, representative_name, capital, established_date,
    business_hours, closed_days, business_description,
    specialties, service_areas
) VALUES (
    'サンプル造園株式会社', 
    '100-0001', 
    '東京都千代田区千代田1-1-1', 
    '03-1234-5678', 
    'info@sample-garden.co.jp',
    '東京都知事許可（般-1）第12345号',
    'サンプル 太郎',
    10000000,
    '2020-04-01',
    '8:00-17:00',
    '日曜日、祝日',
    '造園工事・庭園設計・緑地管理を専門とする総合造園業',
    ARRAY['庭園設計', '造園工事', '樹木剪定', '芝生管理', '外構工事'],
    ARRAY['東京都', '神奈川県', '埼玉県']
);

-- 管理者ユーザー作成（本番では強力なパスワードに変更）
INSERT INTO garden_main.users (
    company_id, username, email, password_hash, role, full_name, department
) VALUES (
    1, 
    'admin', 
    'admin@sample-garden.co.jp', 
    garden_main.hash_password('${ADMIN_PASSWORD}', encode(gen_random_bytes(16), 'hex')),
    'owner', 
    'システム管理者', 
    '管理部'
);

-- =============================================================================
-- 統計情報更新
-- =============================================================================

ANALYZE;

-- =============================================================================
-- 本番環境設定確認
-- =============================================================================

\echo '=== Garden DX データベース初期化完了 ==='
\echo '作成されたスキーマ:'
\dn

\echo '作成されたテーブル:'
\dt garden_main.*

\echo '作成されたユーザー:'
\du

\echo '=== セキュリティ設定確認 ==='
\echo 'RLS有効テーブル:'
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;

\echo '=== 初期化完了 ==='