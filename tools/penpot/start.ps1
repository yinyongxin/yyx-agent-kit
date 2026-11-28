$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "未找到 docker，请先启动 Docker Desktop。"
}

$legacy = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -like "starter-penpot-*" }
if ($legacy) {
  Write-Host "检测到旧模板 Penpot 容器仍在运行：" -ForegroundColor Yellow
  $legacy | ForEach-Object { Write-Host "  $_" }
  Write-Host "它们会占用 9001 端口。请先停止旧栈（保留数据卷）：" -ForegroundColor Yellow
  Write-Host "  docker stop $($legacy -join ' ')" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "已生成 tools/penpot/.env（生产请修改 PENPOT_SECRET_KEY / PENPOT_DB_PASSWORD）" -ForegroundColor Yellow
}

docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$port = (docker compose port penpot-frontend 8080 2>$null | Select-Object -Last 1) -replace '^.*:', ''
if (-not $port) { $port = "9001" }
$mailpit = (docker compose port penpot-mailpit 8025 2>$null | Select-Object -Last 1) -replace '^.*:', ''
if (-not $mailpit) { $mailpit = "8025" }

Write-Host "`n等待 Penpot 启动..." -ForegroundColor Cyan
for ($i = 0; $i -lt 60; $i++) {
  try {
    $res = Invoke-WebRequest "http://localhost:$port" -UseBasicParsing -TimeoutSec 3
    if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) { break }
  } catch {
    Start-Sleep -Seconds 1
  }
}

Write-Host "Penpot:  http://localhost:$port" -ForegroundColor Green
Write-Host "Mailpit: http://localhost:$mailpit" -ForegroundColor Green
Write-Host "MCP:     pwsh -NoProfile -File tools/penpot/start-mcp.ps1" -ForegroundColor DarkGray
exit 0
