param(
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Fail($message) {
    Write-Host ""
    Write-Host "✗ $message" -ForegroundColor Red
    exit 1
}

Write-Host "==> 检查环境" -ForegroundColor Cyan
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fail "未找到 pnpm，请先安装并加入 PATH" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "未找到 docker，请先安装 Docker Desktop" }
docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker 未运行，请先启动 Docker Desktop" }

if (-not (Test-Path ".env")) {
    if (-not (Test-Path ".env.example")) { Fail "缺少 .env.example，无法创建 .env" }
    Copy-Item ".env.example" ".env"
    Write-Host "已从 .env.example 创建 .env" -ForegroundColor Yellow
}

if ($CheckOnly) {
    Write-Host "✓ 环境检查通过（未启动服务）" -ForegroundColor Green
    exit 0
}

Write-Host "==> 启动 Docker 依赖（PostgreSQL / Redis / Penpot / Mailpit）" -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose up 失败，请查看上方输出" }

Write-Host "==> 等待 PostgreSQL 就绪" -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    docker compose exec -T postgres pg_isready -U app -d app *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    Write-Host "! PostgreSQL 30 秒内未就绪，继续启动（导航页会先显示离线）" -ForegroundColor Yellow
}

Write-Host "==> 启动开发服务（关闭窗口或 Ctrl+C 停止）" -ForegroundColor Cyan
Write-Host "    开发导航页：http://localhost:47100/api/dev" -ForegroundColor DarkGray
Write-Host ""
pnpm dev

Write-Host ""
Write-Host "开发服务已退出。若 Docker 仍在运行，可双击 stop-dev.cmd 一并停止。" -ForegroundColor Yellow
