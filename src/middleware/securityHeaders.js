/**
 * セキュリティヘッダー設定
 * 本番環境でのセキュリティ強化のためのヘッダー設定
 */

// Express.jsミドルウェアとして使用する場合
export const securityHeaders = (req, res, next) => {
  // X-Content-Type-Options: MIMEタイプスニッフィング防止
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options: クリックジャッキング攻撃防止
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection: XSS攻撃防止（レガシーブラウザ対応）
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict-Transport-Security: HTTPS強制
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content-Security-Policy: コンテンツセキュリティポリシー
  const cspPolicy = process.env.REACT_APP_CSP_POLICY || [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', cspPolicy);
  
  // Referrer-Policy: リファラー情報の制御
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy: ブラウザ機能の制限
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// React用のセキュリティヘッダー設定（public/index.htmlのmetaタグで設定）
export const getSecurityMetaTags = () => {
  return `
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta http-equiv="Content-Security-Policy" content="${process.env.REACT_APP_CSP_POLICY || "default-src 'self'"}">
    <meta name="referrer" content="strict-origin-when-cross-origin">
  `;
};

// Nginx設定例
export const nginxSecurityHeaders = `
# Security Headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Remove server version
server_tokens off;

# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
`;

// CORS設定
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.REACT_APP_ALLOWED_ORIGINS
      ? process.env.REACT_APP_ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8080'];
    
    // 開発環境ではlocalhostを許可
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // 本番環境では許可リストをチェック
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400 // 24時間
};

export default {
  securityHeaders,
  getSecurityMetaTags,
  nginxSecurityHeaders,
  corsOptions
};