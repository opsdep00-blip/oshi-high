# Local Development Environment Setup

OSHI-HIGH のローカル開発環境は Docker Compose で構築されています。

## 🚀 クイックスタート

### 1. Docker Compose で環境起動

```bash
cd ~/Desktop/git_hub/oshi-high
docker-compose up -d
```

サービスが起動するまで待ちます（約1分）

```bash
docker-compose ps
```

出力例：
```
NAME                  STATUS
oshi-high-postgres    Up (healthy)
oshi-high-redis       Up (healthy)
oshi-high-minio       Up (healthy)
```

### 2. サービスへの接続

#### PostgreSQL

```bash
# psql で接続
psql -h localhost -U oshi_user -d oshi_local -W

# パスワード: oshi_local_dev_password

# または Connection String
postgresql://oshi_user:oshi_local_dev_password@localhost:5432/oshi_local
```

#### Redis

```bash
redis-cli -p 6379

# テスト
127.0.0.1:6379> ping
PONG
```

#### MinIO (S3-compatible storage)

```
Web UI: http://localhost:9001
Access Key: minioadmin
Secret Key: minioadmin
```

---

## 📊 環境構成

| サービス | ポート | 接続文字列 |
|---------|--------|-----------|
| PostgreSQL | 5432 | `postgresql://oshi_user:oshi_local_dev_password@localhost:5432/oshi_local` |
| Redis | 6379 | `redis://localhost:6379` |
| MinIO (S3) | 9000 | `http://localhost:9000` |
| MinIO Console | 9001 | `http://localhost:9001` |

---

## 🛑 停止・削除

```bash
# サービス停止（データ保持）
docker-compose down

# サービス停止＆データ削除
docker-compose down -v

# サービス再起動
docker-compose restart
```

---

## 🔧 トラブルシューティング

### PostgreSQL に接続できない

```bash
# ログ確認
docker-compose logs postgres

# ヘルスチェック確認
docker exec oshi-high-postgres pg_isready -U oshi_user
```

### ポートが既に使用されている

```bash
# ポート確認
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis
lsof -i :9000   # MinIO

# 別のポートを使う場合は docker-compose.yml を編集
# ports:
#   - "5433:5432"  # ← 5433 に変更
```

### データベーススキーマをリセット

```bash
# 既存データ削除
docker-compose down -v

# 再起動（init.sql が実行される）
docker-compose up -d
```

---

## � デバッグ / セキュリティ注意

**注意**: 開発用のデバッグエンドポイント（例: `/api/debug/*`）は便利ですが、環境変数や内部の情報をログに出力する場合があります。特に `DATABASE_URL` やサービスのシークレットは絶対に公開環境ではログに出さないでください。

- `ENABLE_DB_RESET` や `ENABLE_SMS_MOCK` などのフラグは開発用に `true` にすることがありますが、本番環境では必ず `false` にしてください。
- 出力されるログがシークレットを含まないか確認してください。

## 📝 環境変数（.env）

後で Backend/Frontend から接続する際は以下を使用：

```env
# ローカル開発
DATABASE_URL=postgresql://oshi_user:oshi_local_dev_password@localhost:5432/oshi_local
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=oshi-high-assets
```
---

最終更新：January 25, 2026
