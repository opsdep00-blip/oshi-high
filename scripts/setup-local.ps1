<#
PowerShell スクリプト — ローカル開発環境のセットアップ補助
Usage:
  pwsh -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1 [-NoDev]

What it does:
  - Docker Compose を起動（postgres / redis / minio）
  - Postgres の起動待ち（pg_isready）
  - npm install（必要なら）
  - npx prisma generate
  - npx prisma migrate deploy
  - （オプション）npm run dev を起動
#>

param(
  [switch]$NoDev
)

function Write-Info($s) { Write-Host "[info] $s" -ForegroundColor Cyan }
function Write-Warn($s) { Write-Host "[warn] $s" -ForegroundColor Yellow }
function Write-Err($s) { Write-Host "[error] $s" -ForegroundColor Red }

# 1) prerequisites
Write-Info "Checking prerequisites..."
try { docker --version | Out-Null } catch { Write-Err "Docker が見つかりません。Docker Desktop をインストールしてから再実行してください。"; exit 1 }
try { node --version | Out-Null } catch { Write-Err "Node.js が見つかりません。Node.js 18+ をインストールしてください。"; exit 1 }

# 2) docker compose up
if (Test-Path docker-compose.yml) {
  Write-Info "Starting services with Docker Compose..."
  docker compose up -d
} else {
  Write-Warn "docker-compose.yml が見つかりません。Postgres を単体で起動します（docker run）。"
  docker run --rm --name oshi-postgres -e POSTGRES_USER=oshi_user -e POSTGRES_PASSWORD=oshi_local_dev_password -e POSTGRES_DB=oshi_local -p 5432:5432 -d postgres:15
}

# 3) wait for Postgres
Write-Info "Waiting for Postgres to become available on localhost:5432..."
$max = 60
for ($i=0; $i -lt $max; $i++) {
  try {
    $out = docker exec oshi-high-postgres pg_isready -U oshi_user 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Info "Postgres is ready."; break }
  } catch {
    # container may be named differently when docker run was used
    try {
      Test-NetConnection -ComputerName localhost -Port 5432 | Out-Null
      if ($? -eq $true) { Write-Info "Port 5432 reachable."; break }
    } catch { }
  }
  Start-Sleep -Seconds 2
  if ($i -eq $max-1) { Write-Err "Postgres が起動しませんでした（タイムアウト）。docker ps / docker logs を確認してください。"; exit 1 }
}

# 4) node_modules / npm install
if (-not (Test-Path node_modules)) {
  Write-Info "Installing npm dependencies..."
  npm install
} else {
  Write-Info "node_modules が既に存在します。" 
}

# 5) Prisma: generate + migrate
Write-Info "Generating Prisma client..."
npx prisma generate

Write-Info "Applying Prisma migrations (deploy)..."
$npxExit = & npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Warn "prisma migrate deploy に問題が発生しました。出力を表示します。"
  Write-Host $npxExit
  Write-Warn "開発環境で schema を反映したい場合は 'npx prisma db push' を試してください。"
}

# 6) Prisma Studio を起動（非同期）
Write-Info "起動: Prisma Studio -> http://localhost:5555"
Start-Process npx -ArgumentList 'prisma','studio' -NoNewWindow -WindowStyle Hidden

# 7) 実行 / 開発サーバ
if (-not $NoDev) {
  Write-Info "Starting dev server: npm run dev"
  npm run dev
} else {
  Write-Info "セットアップ完了。開発サーバは起動していません（-NoDev が指定されました）。実行するには: npm run dev"
}
