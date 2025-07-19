# 請求書作成機能 設計書

## 1. 概要
Garden（造園業向け統合業務管理システム）の請求書作成機能を設計・実装

## 2. 主要機能
### 2.1 見積からの自動生成
- 承認済み見積データからワンクリックで請求書生成
- 見積項目の金額・数量を請求書へ自動転記
- 見積書ID連携による履歴管理

### 2.2 PDF出力機能
- 正式な請求書フォーマットでのPDF生成
- 会社ロゴ・印鑑対応
- カスタマイズ可能なテンプレート

### 2.3 顧客情報連携
- 顧客マスタからの自動情報取得
- 請求先・支払条件の自動設定
- 過去請求履歴との連携

## 3. データベース設計
### 3.1 請求書テーブル (Invoices)
```sql
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    project_id INTEGER REFERENCES projects(project_id),
    customer_id INTEGER REFERENCES customers(customer_id),
    estimate_id INTEGER REFERENCES estimates(estimate_id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,0) NOT NULL,
    tax_amount DECIMAL(12,0) NOT NULL,
    total_amount DECIMAL(12,0) NOT NULL,
    status VARCHAR(50) DEFAULT '未送付',
    payment_status VARCHAR(50) DEFAULT '未払い',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 請求書明細テーブル (Invoice_Items)
```sql
CREATE TABLE invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(invoice_id),
    category VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(20),
    unit_price DECIMAL(10,0),
    amount DECIMAL(12,0) NOT NULL,
    notes TEXT
);
```

## 4. API設計
### 4.1 請求書作成 API
- POST /api/invoices
- 見積IDから請求書自動生成
- バリデーション・重複チェック

### 4.2 請求書更新 API
- PUT /api/invoices/{id}
- 請求書情報の更新
- ステータス管理

### 4.3 PDF生成 API
- GET /api/invoices/{id}/pdf
- 請求書PDFダウンロード

## 5. フロントエンド設計
### 5.1 請求書一覧画面
- 請求書リスト表示
- ステータス別フィルタリング
- 検索機能

### 5.2 請求書作成・編集画面
- 見積選択による自動生成
- 項目編集機能
- リアルタイム金額計算

### 5.3 PDF プレビュー機能
- 印刷前プレビュー
- レイアウト確認

## 6. 技術仕様
- フロントエンド: React 18.2.0 + TypeScript
- PDF生成: jsPDF + html2canvas
- スタイリング: styled-components
- 状態管理: React Hooks
- API通信: axios

## 7. セキュリティ要件
- 会社ID によるマルチテナント分離
- RBAC による権限制御
- 請求書番号の重複防止
- 改ざん防止対応