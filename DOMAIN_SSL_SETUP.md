# 🌐 ドメイン・SSL証明書設定ガイド

## 📋 設定手順

### 1. Vercelでのドメイン設定

#### ステップ1: Vercelダッシュボードでドメイン追加
```bash
# Vercel CLIでドメイン追加
vercel domains add garden-dx.com
vercel domains add www.garden-dx.com
```

#### ステップ2: DNS設定
以下のDNSレコードを設定してください：

```dns
# A Record
Type: A
Name: @
Value: 76.76.19.61 (Vercelの公式IP)

# CNAME Record  
Type: CNAME
Name: www
Value: garden-dx.com

# Vercel専用設定
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 2. SSL証明書の自動設定

Vercelは自動的にLet's Encrypt証明書を発行します：

#### 特徴
- ✅ 自動更新
- ✅ ワイルドカード対応
- ✅ HTTP/2対応
- ✅ HSTS設定済み

#### 確認方法
```bash
# SSL証明書の確認
curl -I https://garden-dx.com
```

### 3. セキュリティ設定

#### HSTS設定
```javascript
// vercel.json に含まれる設定
{
  "key": "Strict-Transport-Security",
  "value": "max-age=31536000; includeSubDomains"
}
```

#### Content Security Policy
```javascript
// 追加セキュリティヘッダー（必要に応じて）
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
}
```

### 4. パフォーマンス最適化

#### CDN設定
- ✅ Vercel Edge Network（自動）
- ✅ 静的ファイルキャッシュ（1年間）
- ✅ 動的コンテンツ圧縮
- ✅ HTTP/2 Push

#### 地域最適化
```json
{
  "regions": ["nrt1"],  // 東京リージョン
  "functions": {
    "memory": 512,
    "maxDuration": 30
  }
}
```

### 5. 監視設定

#### SSL証明書監視
```bash
# 証明書の有効期限確認
openssl s_client -connect garden-dx.com:443 -servername garden-dx.com | openssl x509 -noout -dates
```

#### ドメイン健全性チェック
```bash
# DNSの確認
dig garden-dx.com
nslookup garden-dx.com
```

## 🔐 セキュリティチェックリスト

- [ ] SSL証明書の有効性確認
- [ ] HSTS設定確認
- [ ] DNS設定確認
- [ ] リダイレクト設定確認
- [ ] セキュリティヘッダー確認

## 📊 パフォーマンステスト

```bash
# Lighthouse監査
npx lighthouse https://garden-dx.com --output=json

# SSL Labs評価
curl -s "https://api.ssllabs.com/api/v3/analyze?host=garden-dx.com"
```

## 🚨 トラブルシューティング

### DNSが反映されない場合
```bash
# DNSキャッシュクリア
sudo dscacheutil -flushcache
```

### SSL証明書エラーの場合
1. Vercelダッシュボードで証明書を再発行
2. DNS設定の確認
3. CDNキャッシュクリア

## 📋 本番準備チェック

- [ ] ドメイン購入・設定完了
- [ ] DNS設定完了
- [ ] SSL証明書発行完了
- [ ] セキュリティヘッダー設定完了
- [ ] パフォーマンステスト合格
- [ ] 監視設定完了

---
**作成者**: Worker3  
**最終更新**: 2025-07-06