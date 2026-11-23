# 从 templates/base 生成新项目
# 用法: pwsh -NoProfile -File F:\project\yyx-agent-kit\scripts\new.ps1 -Name myapp -Path D:\projects
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Name,

    [Parameter(Position = 1)]
    [string]$Path,

    [int]$PortBase = 47100,

    [switch]$Force
)

$ErrorActionPreference = "Stop"
$Repo = Split-Path -Parent $PSScriptRoot

# 项目名同时作为 npm scope，必须符合包名规则
if ($Name -notmatch '^[a-z0-9][a-z0-9\-_]*$') {
    throw "项目名只能包含小写字母、数字、- 和 _，且以字母或数字开头: $Name"
}

if (-not $Path) { $Path = (Get-Location).Path }
$Target = Join-Path $Path $Name

if (Test-Path $Target) {
    if (-not $Force) { throw "目标目录已存在: $Target（加 -Force 覆盖）" }
    Remove-Item $Target -Recurse -Force
}
New-Item -ItemType Directory -Path $Path -Force | Out-Null

# 复制模板
$Template = Join-Path $Repo "templates\base"
Copy-Item -Recurse -Force $Template $Target
Write-Host "==> 已复制模板: $Target"

# 替换规则：先长后短，避免路径被短规则截断
$RepoSkills = (Join-Path $Repo "skills").Replace('\', '/')
$replacements = @(
    @((Join-Path $Repo "templates\base"), $Target),
    @('..\..\scripts\sync.ps1', (Join-Path $Repo "scripts\sync.ps1")),
    @('templates/base', $Name),
    @('`.opencode/opencode.json` 里的 `skills` 是相对路径 `../../skills`，按工作目录解析。', '`.opencode/opencode.json` 里的 `skills` 指向本仓库的 `skills` 目录；换机器后把这一行改成新机器上本仓库 `skills` 的路径。'),
    @('clone 到其他机器后路径不同也没关系，相对路径会跟着走。', 'clone 到别的机器后按上面的说明改一行即可。'),
    @('`yyx-agent-kit` 的项目模板，也是 CLI 生成新项目的复制源。', '由 `yyx-agent-kit` 生成的项目，已接入交付流水线。'),
    @('starter', $Name),
    @('47173', [string]($PortBase + 73)),
    @('47174', [string]($PortBase + 74)),
    @('47175', [string]($PortBase + 75)),
    @('47100', [string]$PortBase)
)

$changed = 0
Get-ChildItem -Path $Target -Recurse -File -Force | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $new = $content
    foreach ($pair in $replacements) { $new = $new.Replace($pair[0], $pair[1]) }
    if ($new -ne $content) {
        [System.IO.File]::WriteAllText($_.FullName, $new, [System.Text.UTF8Encoding]::new($false))
        $changed++
    }
}

# skills 相对路径只对仓库内的模板有效，生成时写入本机仓库绝对路径
$opencode = Join-Path $Target ".opencode\opencode.json"
$content = [System.IO.File]::ReadAllText($opencode)
$content = $content.Replace('../../skills', $RepoSkills)
[System.IO.File]::WriteAllText($opencode, $content, [System.Text.UTF8Encoding]::new($false))

# agents 用仓库最新版，不用模板里的历史快照
$agentsDest = Join-Path $Target ".opencode\agents"
New-Item -ItemType Directory -Path $agentsDest -Force | Out-Null
Copy-Item (Join-Path $Repo "agents\*.md") $agentsDest -Force

Write-Host "==> 完成: $changed 个文件内容已更新，已注入本机 skills 路径与最新 agents"
Write-Host ""
Write-Host "下一步:"
Write-Host "  cd $Target"
Write-Host "  pnpm install"
Write-Host "  opencode"
Write-Host ""
Write-Host "注意: .opencode/opencode.json 的 skills 写的是本机仓库路径；换机器后改这一行。"
