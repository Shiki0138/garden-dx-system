# フルスタックアプリ ビルド/デプロイ失敗原因リファレンス

## 目的
Claude Code を用いた Supabase × Vercel フルスタック開発において、よく発生する ビルド失敗／デプロイ障害 のメカニズムを一覧化し、システムファイルとして先に読み込むことで "転ばぬ先の杖" とする。

⸻

## 0. Claude Code への指示

```
# Claude Code System Instruction
この Markdown を常時参照し、`next build` / `vercel build` / `supabase db push` / `prisma generate` などのフェーズでエラー検知時に下記チェックリストをスキャンし、該当しそうな原因を優先的にフィードバックせよ。
```

⸻

## 1. ローカル環境・エディタ (E01‒E15)
- **E01** Node.js バージョン差異 — Vercel の Build イメージ (例: 20.x) とローカル (18.x) がズレ、BI_EXPORT まわりで ES モジュールが解決不能になる。
- **E02** 複数パッケージマネージャ混在 — yarn.lock/pnpm-lock.yaml が同居し、CI では意図しないマネージャが選択される。
- **E03** .nvmrc 未コミット — GitHub Actions が node -lts で走り、実装が experimental API を要求して落ちる。
- **E04** カーサー AI による自動 ESM ↔ CJS 変換 — 拡張子 .cjs と .js が混在し type: module でクラッシュ。
- **E05** 環境変数ファイル欠如 — .env.local だけ存在し .env.example が無いので Vercel にアップロードされず認証周りが undefined。
- **E06** 大文字小文字差異 — macOS では Components/Header.tsx が許容されるが Linux で components ディレクトリが見つからず MODULE_NOT_FOUND。
- **E07** パス区切り問題 — Windows 由来の \ が import 文に残り POSIX で失敗。
- **E08** TypeScript strict 設定差 — ローカルでは寛容だが CI で strict が有効化されビルド停止。
- **E09** Git hooks で自動フォーマット — husky が push 前にコードを書き換え、Vercel Cache が汚れる。
- **E10** Docker × 非 Docker 混在 — node-gyp が Alpine と glibc の ABI 差異でコンパイルエラー。
- **E11** ファイルウォッチャによる一時ファイルコミット — *.swp が Next の page ルートに置かれ duplicate route。
- **E12** Monorepo workspace 解決失敗 — packages/** が pnpm-workspace.yaml に未登録で import error。
- **E13** .gitignore 誤設定 — dist/ をコミットしてしまい、本番ビルドで古い JS が優先ロード。
- **E14** Editor 自動貼り付けのゼロ幅文字 — SUPABASE_URL​ に不可視 Unicode が混入し読み出し不可。
- **E15** ローカル alias と CI alias 不一致 — @/ パスが tsconfig だけで next.config.js へ伝播していない。

## 2. 依存関係・パッケージ (E16‒E35)
- **E16** peerDependency 不一致 — react 18 と next 14 beta で invalid peer。
- **E17** キャレット ^ アップデート — patch に破壊的変更が入り CI の fresh install で落ちる。
- **E18** optionalDependency にネイティブ拡張 — Build イメージに必要ライブラリが無く node-pre-gyp が fail。
- **E19** supabase-js v1/v2 混在 — Auth メソッドが変わり import { createClient } が undefined。
- **E20** NextAuth 旧版と App Router — useSession が React Server Components で呼ばれエラー。
- **E21** Prisma client を devDependency — Vercel が prisma generate を skip し runtime で Module not found。
- **E22** react-dom/client と従来 render 併用 — hydration mismatch。
- **E23** 廃止パッケージ @supabase/auth-helpers-nextjs — edge runtime 非対応。
- **E24** --legacy-peer-deps で強制解決 — ローカルOKでも CI は flag off。
- **E25** node-pre-gyp × GLIBC — Alpine Linux でビルド失敗。
- **E26** tailwindcss vs postcss-loader version mismatch — PostCSS Plugin architecture exception。
- **E27** devDependency の重量物 (playwright) — CI RAM不足→OOM。
- **E28** esbuild バイナリ fallback — CPU 指令セット差異で時間超過。
- **E29** vite + next-transpile-modules — resolve.alias 無限ループ。
- **E30** Intl polyfill が Edge runtime 非対応。
- **E31** tree‑shake で crypto polyfill 除去 — Supabase JS が runtime error。
- **E32** dotenv-expand × next/config 二重経由 — ENV undefined。
- **E33** Dependabot 自動マージ — 未テストバージョンでデプロイ失敗。
- **E34** Bun workspace protocol (workspace:*) — Vercel 旧 Bun 対応外。
- **E35** Yarn Classic vs Berry — Plug'n'Play 未サポートで EISDIR。

## 3. Next.js / Vercel 設定 (E36‒E55)
- **E36** experimental.appDir が true なのに app/ 不足 — ビルド abort。
- **E37** Redirects 無限ループ — next.config.js の rewrite 定義ミス。
- **E38** Image Optimization 外部 S3 認証失敗 — build-time fetch 403。
- **E39** Edge Function サイズ >1 MB — Bundle Size Exceeded。
- **E40** middleware.ts で dynamic import — Edge runtime unsupported。
- **E41** serverActions (React 19 beta) を stable で使用 — compiler error。
- **E42** Route Handlers の fetch cache API 未安定。
- **E43** next-i18next defaultLocale 不一致 — Invariant: defaultLocale not set。
- **E44** SWR v2 対応ミス — client component で hydration loop。
- **E45** app/api/ 名の大文字小文字ミス — route not found。
- **E46** Telemetry Env 未セット — NEXT_TELEMETRY=1 in CI → Exit 1。
- **E47** vercel/analytics plugin 403 — CLI Token 権限不足。
- **E48** tsconfig paths alias 未連携 — webpack resolve error。
- **E49** Output File Tracing blacklist syscall — Serverless build stop。
- **E50** next-sitemap postbuild error — process exit 1。
- **E51** Static Export と dynamic routes 併用 — ExportPathMap mismatch。
- **E52** APP_URL http/https 不一致 — Supabase cookie policy block。
- **E53** ISR revalidate=0 — Invalid config。
- **E54** publicRuntimeConfig 廃止 — undefined at runtime。
- **E55** Build タイムアウト 45 min — heavy bundle。

## 4. Supabase & 環境変数 (E56‒E70)
- **E56** SUPABASE_URL/KEY 未設定 — 401 Unauthorized。
- **E57** RLS 有効化、サービスロール未使用 — Insert fail。
- **E58** Subdomain/CORS 不一致 — Preflight error。
- **E59** pgvector など拡張未インストール — migration fail。
- **E60** Storage Policy 差異 — Build-time 画像 fetch fail。
- **E61** Secrets の YAML quoting — 特殊文字で破損。
- **E62** migration 未適用 — runtime SQL エラー。
- **E63** JWT 有効期限が短過ぎ Seed 中に expire。
- **E64** Realtime API は Edge 未対応 — Module not found。
- **E65** サービスロール Key をフロントに公開 — Vercel が自動マスクし Undefined。
- **E66** auth.redirectTo に Preview URL 固定 — Production ログイン不可。
- **E67** fetch Polyfill 二重定義 — global.fetch conflict。
- **E68** GraphQL 拡張と REST 型差 — __typename undefined。
- **E69** Postgres 15→16 アップグレード — plpgsql 互換切れ。
- **E70** Edge Functions と Next.js API 同名 — path collision。

## 5. CI/CD (E71‒E85)
- **E71** Node cache キー衝突 — 異なるブランチで lockfile 差異。
- **E72** OIDC 連携ミス — vercel --token 403。
- **E73** submodule private repo — CI clone 失敗。
- **E74** Vercel Secrets 65 個上限超え — env set error。
- **E75** 改行混入で YAML パースエラー。
- **E76** Matrix build 1job fail 全体落ち。
- **E77** Cache 上限 10 GB — restore corruption。
- **E78** Post Job Cleanup が先行 — artifact path missing。
- **E79** Vercel CLI major update — flag 仕様変化。
- **E80** concurrency cancel-in-progress — 本番デプロイ kill。
- **E81** Git LFS 帯域超過 — checkout fail。
- **E82** Self‑hosted Runner Disk Full — install ENOSPC。
- **E83** GitHub API rate limit — Dependabot fail。
- **E84** vercel env pull 未実行 — env 空。
- **E85** production/preview 混線 — 環境違いで実装破壊。

## 6. コード品質・静的解析 (E86‒E95)
- **E86** ESLint no‑unused-vars — next lint stage fail。
- **E87** Prettier 3 設定差 — trailingComma error。
- **E88** tRPC + Zod import 循環 — stack overflow。
- **E89** RSC ↔ Client 循環 import — Build abort。
- **E90** GraphQL codegen スキーマ stale — type mismatch。
- **E91** Test Runner フリーズ — massive context。
- **E92** openapi‑typescript fetch 503 — codegen fail。
- **E93** Tailwind arbitrary value parse error — PostCSS panic。
- **E94** Storybook build env 衝突 — process exit 1。
- **E95** Sentry sourcemap upload fail — exit code 1。

## 7. インフラ・外部サービス (E96‒E100)
- **E96** Region latency — cold start がタイムアウトと誤認され build fail。
- **E97** SSL Propagation 中 — next build の prerender fetch エラー。
- **E98** フォント CDN タイムアウト — build exit。
- **E99** egress firewall — npm registry block。
- **E100** JST ↔ UTC 差 — date-fns parse error Build time。

⸻

## 8. レアケース集 (E101‒E120)

上記に加え、本リポジトリで過去観測した特殊ケースを追記することで 200・300 件へ拡張可能。必要に応じ随時更新せよ。

⸻

## 9. 推奨ワークフロー
1. 環境パリティ確保 — .tool-versions / corepack enable。
2. npx vercel build をローカルで実行 — CI 再現。
3. ログを JSON で保存し CI Artifact へ。
4. Renovate + Preview Deploy で依存更新を安全化。
5. Slack/LINE 通知 に Build Hook を連携。

⸻

## ⚙️ Prevention Playbook (Local)

| フェーズ | 目的 | コマンド例 | 失敗時の動作 |
|---------|------|-----------|-------------|
| Pre-commit (推奨) | 早期に型・Lint エラーを潰す | `pnpm dlx lint-staged → next lint / tsc --noEmit` | コミット拒否 |
| Pre-push (必須) | GitHub へ送る前に 本番相当 Build を再現 | `pnpm dlx turbo run build --filter=web && SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SECRET npx vercel build --cwd apps/web --prod --token $VERCEL_TOKEN` | Push 拒否 |
| Optional | DB 変更の妥当性確認 | `supabase db diff --linked` | 不整合時 Push 拒否 |

> **ポイント**: `VERCEL_TOKEN` と Supabase 連携用環境変数を **`direnv` / `.envrc`** でローカルにも注入しておくと、CI と完全イコールのビルドを再現できます。

---

## 🩹 Self-Heal Flow (GitHub Actions)

1. **build.yml** で `vercel build --debug` を実行し、`build.log` をアーティファクト保存。
2. **on-failure** ステップで `claude-code-action@vX` を呼び出し:
   - `input_files:` に `build.log` と `git diff` を渡す
   - `/fix` プロンプトを用いて **E## ↔ 解決策マトリクス** からパッチを生成
   - `create-pull-request` Action で `fix/E##.patch` を提案 PR として自動作成
3. **self-heal.yml** で提案 PR に `auto-merge` ラベルを付与すると、人手レビュー前に段階的に再ビルド。

```yaml
# .github/workflows/build.yml (抜粋)
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: npx vercel build --debug --token ${{ secrets.VERCEL_TOKEN }}
      - if: failure()
        uses: grll/claude-code-action@v2
        with:
          prompt: |
            1. Parse build.log and map errors to docs/Build-error-checklist.md IDs.
            2. Generate minimal patch to resolve.
          file_paths: build.log
```

安全弁: auto-merge ラベルは changeset >= 30 lines なら外す、などブレーキも設定可。

⸻

## Claude Code System Prompt 追記例

```
# build-guard (auto generated)
When `vercel build` or `next build` fails:
1. Extract error lines (grep -E 'ERR|ERROR|FAIL').
2. Cross-reference /docs/Build-error-checklist.md (IDs E01-E120).
3. Draft a git patch (< 50 lines) that resolves the first matching ID.
4. Output the patch with unified diff headers.
```

⸻

## 10. Mac 環境差分チェック

| 項目 | MacBook Air | MacBook Pro (Early 2011) |
|------|-------------|-------------------------|
| CPU／チップ | Apple M1 | Intel Core i5‑2415M |
| macOS バージョン | | |
| Node.js 管理ツール | | |
| パッケージマネージャ | | |
| Docker 利用 | | |
| Homebrew パス | | |
| シェル & dotfiles | | |
| Proxy / VPN | | |

記入方法: 決定次第、PR でテーブルを更新してください。

最終更新: 2025‑07‑15

追加したい事象があれば PR で ## 8. レアケース集 に追記してください。