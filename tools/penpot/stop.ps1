$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

docker compose down
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Penpot 已停止，数据卷保留。" -ForegroundColor Cyan
Write-Host "彻底删除数据（危险）：docker compose down -v" -ForegroundColor DarkGray
exit 0
