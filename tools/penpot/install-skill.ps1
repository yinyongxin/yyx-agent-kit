$ErrorActionPreference = "Stop"

$source = Resolve-Path (Join-Path $PSScriptRoot "..\..\skills\tools\penpot")
$globalSkills = Join-Path $env:USERPROFILE ".config\opencode\skills"
$target = Join-Path $globalSkills "penpot"

New-Item -ItemType Directory -Force $globalSkills | Out-Null
if (Test-Path $target) {
  Remove-Item $target -Recurse -Force
}
Copy-Item $source $target -Recurse -Force

Write-Host "Penpot skill 已安装到全局：$target" -ForegroundColor Green
Write-Host "重启 OpenCode 后，其他项目也可以加载 penpot skill。" -ForegroundColor Cyan
