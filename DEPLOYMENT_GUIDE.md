# 🚀 Garden DX System - Vercel + Supabase デプロイメントガイド

## 📋 本番デプロイ手順

### 1. 前提条件
- Node.js 18+ インストール済み
- Vercel アカウント作成済み
- Supabase プロジェクト作成済み
- GitHub リポジトリ準備済み

### 2. Supabase設定

#### 2.1 プロジェクト作成
```bash
# Supabase CLI インストール
npm install -g supabase

# プロジェクト作成（Webコンソールで実行）
# 1. https://supabase.com にアクセス
# 2. "New Project" をクリック
# 3. プロジェクト名: garden-dx-system
# 4. データベースパスワードを設定
```

#### 2.2 データベーススキーマ作成
```sql
-- users テーブル（認証ユーザー拡張）
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- companies テーブル
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  business_license VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- customers テーブル
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(10),
  customer_type VARCHAR(50) DEFAULT '法人',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- categories テーブル
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- unit_prices テーブル
CREATE TABLE unit_prices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  item_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- estimates テーブル
CREATE TABLE estimates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  estimate_number VARCHAR(255) UNIQUE NOT NULL,
  estimate_date DATE NOT NULL,
  valid_until DATE,
  project_name VARCHAR(255),
  site_address TEXT,
  work_period VARCHAR(255),
  subtotal DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- estimate_items テーブル
CREATE TABLE estimate_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(255),
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- invoices テーブル
CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  estimate_id UUID REFERENCES estimates(id),
  invoice_number VARCHAR(255) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  project_name VARCHAR(255),
  site_address TEXT,
  subtotal DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- invoice_items テーブル
CREATE TABLE invoice_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(255),
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- projects テーブル
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  estimate_id UUID REFERENCES estimates(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'planning',
  budget DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- project_tasks テーブル
CREATE TABLE project_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  category VARCHAR(255),
  dependencies TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.3 RLS（Row Level Security）設定
```sql
-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成
-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "users_policy" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "customers_policy" ON customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "unit_prices_policy" ON unit_prices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "estimates_policy" ON estimates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "estimate_items_policy" ON estimate_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "invoices_policy" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "invoice_items_policy" ON invoice_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "projects_policy" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "project_tasks_policy" ON project_tasks FOR ALL USING (auth.uid() = user_id);

-- カテゴリは全ユーザー読み取り可能
CREATE POLICY "categories_read_policy" ON categories FOR SELECT TO public USING (true);
```

### 3. Vercel設定

#### 3.1 環境変数設定
```bash
# Vercel Dashboard または CLI で設定
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_BASE_URL=https://your-project.supabase.co
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
CI=false
REACT_APP_PWA_ENABLED=true
REACT_APP_ANALYTICS_ENABLED=true
```

#### 3.2 Vercel CLI デプロイ
```bash
# Vercel CLI インストール
npm install -g vercel

# プロジェクトディレクトリに移動
cd app

# 依存関係インストール
npm install

# ビルドテスト
npm run build:production

# Vercelにログイン
vercel login

# 初回デプロイ
vercel

# 本番デプロイ
vercel --prod
```

### 4. GitHub Actions CI/CD設定

#### 4.1 シークレット設定
GitHub リポジトリの Settings > Secrets で以下を設定:
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

#### 4.2 自動デプロイ
- main ブランチにプッシュで自動本番デプロイ
- PR作成でプレビューデプロイ
- テスト・リント・型チェック自動実行

### 5. 本番環境テスト

#### 5.1 基本機能テスト
```bash
# テストデータ準備
- テストユーザー作成
- 顧客データ作成
- 単価マスタデータ作成

# 機能テスト実行
- ログイン・ログアウト
- 見積作成・編集・削除
- PDF生成・ダウンロード
- 請求書作成・編集
- 権限制御テスト
```

#### 5.2 パフォーマンステスト
```bash
# Lighthouse スコア確認
npx lighthouse https://your-app.vercel.app --output=json

# Core Web Vitals 確認
- First Contentful Paint < 1.8s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
```

#### 5.3 セキュリティテスト
```bash
# セキュリティヘッダー確認
curl -I https://your-app.vercel.app

# 必要なヘッダー:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy
```

### 6. 運用・監視

#### 6.1 ログ監視
```bash
# Vercel ログ確認
vercel logs

# Supabase ログ確認
# Dashboard > Logs で確認
```

#### 6.2 メトリクス監視
- Vercel Analytics: パフォーマンス・使用量
- Supabase Analytics: データベース使用量
- GitHub Actions: デプロイ成功率

### 7. カスタムドメイン設定

#### 7.1 ドメイン追加
```bash
# Vercel Dashboard でドメイン追加
# DNS設定でCNAMEレコード追加
your-domain.com -> cname.vercel-dns.com
```

#### 7.2 SSL証明書
- Vercel が自動でLet's Encrypt証明書を取得
- カスタム証明書も対応可能

### 8. トラブルシューティング

#### 8.1 ビルドエラー
```bash
# ローカルでビルド確認
npm run build:production

# 環境変数確認
vercel env ls
```

#### 8.2 認証エラー
```bash
# Supabase URL・キー確認
# RLS ポリシー確認
# ユーザー権限確認
```

#### 8.3 パフォーマンス問題
```bash
# バンドルサイズ分析
npm run build:analyze

# 不要なライブラリ削除
# 画像最適化
# キャッシュ設定確認
```

## 🎯 成功基準

### パフォーマンス
- ページ読み込み時間: < 3秒
- PDF生成時間: < 5秒
- API応答時間: < 1秒

### セキュリティ
- HTTPS 100%使用
- セキュリティヘッダー設定済み
- RLS によるデータ保護

### 可用性
- Uptime: 99.9%以上
- エラー率: < 0.1%
- 自動バックアップ設定済み

## 📞 サポート

### 技術サポート
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- GitHub: https://support.github.com

### ドキュメント
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- React Docs: https://react.dev