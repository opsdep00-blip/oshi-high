# ローカル開発 — クイックスタート（チェックリスト）

短時間でローカル環境を立ち上げて動作確認するための最小手順をまとめたワンページガイドです。Windows（PowerShell）・Docker 環境を前提にしています。

⚠️ 既存の `SETUP.md` / `docs/LOCAL_DEVELOPMENT.md` に詳細があります。ここは素早く動かすための抜粋です。

---

## 必要条件

- Node.js 18+ / npm
- Docker（Docker Desktop）
- Git

---

## 1) リポジトリを取得 / 依存をインストール

```powershell
git clone <repo-url> && cd oshi-high
npm install
```

---

## 2) 環境変数を用意 (.env.local)

```powershell
# 既存の例ファイルをコピー
Copy-Item .env.example .env.local -Force
# ※ Windows の場合: Edit して値を確認
notepad .env.local
```

必須（ローカル実行用）:
- DATABASE_URL (例: postgresql://oshi_user:oshi_local_dev_password@localhost:5432/oshi_local)
- NEXTAUTH_SECRET
- PHONE_HASH_SECRET
- ENABLE_SMS_MOCK=true

---

## 3) 必須サービスを起動（Docker Compose 推奨）

```powershell
# Docker Compose がある場合（推奨）
docker compose up -d

# もし Docker を使わない場合は単体 Postgres を起動（代替）
# （既にポート5432 を使っていないことを確認）
docker run --rm --name oshi-postgres -e POSTGRES_USER=oshi_user -e POSTGRES_PASSWORD=oshi_local_dev_password -e POSTGRES_DB=oshi_local -p 5432:5432 -d postgres:15
```

サービス起動確認:
```powershell
docker ps
# or
docker compose ps
```

---

## 4) DB の準備（Prisma）

```powershell
npx prisma generate
npx prisma migrate deploy   # 既存マイグレーションを適用（安全）
# or (開発時に新しいマイグレーションを作成する場合)
# npx prisma migrate dev --name init
```

Prisma Studio（DB 中身確認）:
```powershell
npx prisma studio
# opens http://localhost:5555
```

---

## 5) アプリ起動 & 基本チェック

```powershell
npm run dev
```

ブラウザで確認:
- http://localhost:3000 — ホーム
- http://localhost:3000/login — ログイン画面
- http://localhost:3000/account — サインイン後のアカウント
- http://localhost:3000/debug/sms — SMS テスト（開発モック）

SMS テスト（モック時）:
- `ENABLE_SMS_MOCK=true` のとき、サーバログに 6 桁コードが出ます。

---

## 6) テスト / 静的チェック

```powershell
npm run lint
npm test
npx tsc --noEmit
```

---

## 停止 / クリーンアップ

```powershell
# 停止（データは残る）
docker compose down

# 停止 + ボリューム削除（データを消したいとき）
docker compose down -v

# 個別コンテナを停止する場合
docker stop oshi-postgres && docker rm oshi-postgres
```

---

## よくあるトラブルと対処

- Prisma: "Can't reach database server at `localhost:5432`" → Docker コンテナ（Postgres）が起動しているか確認
  - `docker ps` / `docker logs oshi-high-postgres`
- ポート競合: `netstat -ano | findstr :5432` を実行してプロセスを確認
- Google OAuth エラー: `.env.local` の `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を確認、`NEXTAUTH_DEBUG=true` を有効にしてログを見る

---

## ワンライン（すばやく実行したいとき）

```powershell
# Docker 起動 → Prisma 適用 → dev 起動（PowerShell）
docker compose up -d; npx prisma generate; npx prisma migrate deploy; npm run dev
```

---

ファイル: `scripts/setup-local.ps1` を使うと Windows で自動化できます。実行例:

```powershell
pwsh -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
```

---

必要に応じて、このファイルをカスタマイズして手順を短縮します（例: テストデータの投入、自動ブラウザ起動など）。
