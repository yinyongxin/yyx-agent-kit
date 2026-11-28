$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "启动 Penpot 本地 MCP（4400 插件 / 4401 MCP / 4402 WS）" -ForegroundColor Cyan
Write-Host "整个机器只运行一个实例；多个项目共用。" -ForegroundColor DarkGray
npx -y @penpot/mcp@2.17.0
