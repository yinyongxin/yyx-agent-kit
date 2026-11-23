# 从 skills 仓库同步到 OpenCode 全局配置目录
# skills 本身由 opencode.json 的 skills 数组直接指向仓库，无需复制
# agents 只能从 ~/.config/opencode/agents 读取，所以需要同步
# 用法: pwsh -NoProfile -File F:\project\yyx-agent-kit\scripts\sync.ps1
param(
    [string]$Repo = (Split-Path -Parent $PSScriptRoot),
    [string]$ConfigDir = (Join-Path $env:USERPROFILE ".config\opencode")
)

$ErrorActionPreference = "Stop"

Write-Host "==> 拉取最新内容: $Repo"
git -C $Repo pull --ff-only
if ($LASTEXITCODE -ne 0) {
    Write-Host "git pull 失败，已保留现有 agents 不动。先检查网络或远端地址（git remote -v）再重试。" -ForegroundColor Red
    exit 1
}

$src  = Join-Path $Repo "agents"
$dest = Join-Path $ConfigDir "agents"
$created = -not (Test-Path $dest)
New-Item -ItemType Directory -Path $dest -Force | Out-Null

$manifest = Join-Path $dest ".synced.json"
$previous = @()
if (Test-Path $manifest) {
    $previous = Get-Content $manifest -Raw | ConvertFrom-Json
}

$current = @(Get-ChildItem $src -Filter *.md -File | Select-Object -ExpandProperty Name)
$current | ForEach-Object { Copy-Item (Join-Path $src $_) (Join-Path $dest $_) -Force }

# 清理上次同步过、但仓库里已经删除的 agent，避免残留
foreach ($name in $previous) {
    if ($current -notcontains $name -and (Test-Path (Join-Path $dest $name))) {
        Remove-Item (Join-Path $dest $name) -Force
        Write-Host "    - 已移除 $name"
    }
}

$current | ConvertTo-Json | Set-Content -Path $manifest -Encoding UTF8

Write-Host "==> 已同步 agents: $($current.Count) 个"
$current | ForEach-Object { Write-Host "    + $_" }
Write-Host ""

if ($created) {
    Write-Host "注意：agents 目录是本次新建的，OpenCode 不会自动扫描到，需要重启一次服务：" -ForegroundColor Yellow
    Write-Host "    opencode service restart" -ForegroundColor Yellow
    Write-Host "（重启会中断当前会话，请在普通终端里执行；之后增删改文件用 /reload 即可）" -ForegroundColor Yellow
} else {
    Write-Host "完成。在 OpenCode 中执行 /reload 使 skills 与 agents 刷新。"
}
