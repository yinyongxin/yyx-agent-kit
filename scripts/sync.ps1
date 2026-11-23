# 同步 skills 仓库到本机 OpenCode 配置
# 用法: powershell -ExecutionPolicy Bypass -File scripts\sync.ps1
param(
    [string]$Repo = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Set-Location $Repo

Write-Host "==> 拉取最新内容"
git pull --ff-only

# skills 目录本身就是 OpenCode 的全局 skills 源，pull 后自动生效
# agents 通过 junction 直连仓库，无需复制
$agentsLink = Join-Path $env:USERPROFILE ".config\opencode\agents"
if (-not (Test-Path $agentsLink)) {
    New-Item -ItemType Junction -Path $agentsLink -Target (Join-Path $Repo "agents") | Out-Null
    Write-Host "==> 已创建 agents junction: $agentsLink"
}

Write-Host "==> 当前版本"
git log -1 --oneline
Write-Host ""
Write-Host "完成。在 OpenCode 中执行 /reload 使 skills 与 agents 立即刷新。"
