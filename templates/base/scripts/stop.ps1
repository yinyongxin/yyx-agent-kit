$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ports = 47100, 47173, 47174, 47175

Write-Host "==> 停止应用进程" -ForegroundColor Cyan
$stopped = 0
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { continue }
    $procId = $conn.OwningProcess
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host ("    停止端口 " + $port + "（" + $proc.ProcessName + " PID " + $procId + "）")
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        $stopped++
    }
}

# 端口释放后，清掉仍挂在项目目录下的 node 监视进程（nest / vite / concurrently / next）
$escaped = [Regex]::Escape($root)
$leftovers = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $escaped })
foreach ($proc in $leftovers) {
    Write-Host ("    停止残留 node PID " + $proc.ProcessId)
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    $stopped++
}
if ($stopped -eq 0) { Write-Host "    没有需要停止的应用进程" }

Start-Sleep -Seconds 1

Write-Host "==> 停止 Docker 依赖（保留数据卷；Penpot 与全局 MCP 不受影响）" -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -eq 0) {
    docker compose down 2>&1 | ForEach-Object { Write-Host ("    " + $_) }
    if ($LASTEXITCODE -ne 0) { Write-Host "    docker compose down 失败，请手动检查" -ForegroundColor Yellow }
} else {
    Write-Host "    Docker 未运行，跳过" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ 已停止（数据卷保留，下次 start-dev.cmd 直接继续）" -ForegroundColor Green
