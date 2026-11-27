import { API_PREFIX } from "../../../../packages/shared/src/index";

/**
 * 开发导航页（单文件、无构建、无外部依赖）。
 *
 * 视觉：Bento Grid + 深色玻璃拟态（CSS backdrop-filter）。
 * 三个视图（概览 / 服务 / 工具）在客户端切换，轮询不中断；数据全部来自
 * `/api/dev/services`，无演示数据：
 * - KPI / 仪表盘 / 表格由探测结果实时计算
 * - 最近事件由状态变化生成（首次加载记录“开始监控”）
 * - 探测耗时为浏览器侧 fetch 往返时间
 */
export const renderDevPage = (): string => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>本地开发服务</title>
<style>
  :root {
    --bg: #08080a;
    --ink: #f5f4f2;
    --muted: #a7a198;
    --faint: #706b64;
    --green: #34d399;
    --green-text: #6ee7b7;
    --accent: #ff6b3d;
    --accent-2: #ff9d4d;
    --blue: #38bdf8;
    --violet: #a78bfa;
    --sans: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
    --mono: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    padding: 28px 24px 32px;
    color: var(--ink);
    font: 14px/1.5 var(--sans);
    -webkit-font-smoothing: antialiased;
    background:
      radial-gradient(900px 600px at 86% -8%, rgba(255, 107, 61, 0.30), transparent 62%),
      radial-gradient(760px 620px at -6% 46%, rgba(124, 92, 255, 0.26), transparent 62%),
      radial-gradient(720px 600px at 94% 108%, rgba(56, 189, 248, 0.18), transparent 62%),
      var(--bg);
    background-attachment: fixed;
  }

  .wrap { max-width: 1440px; margin: 0 auto; }

  .top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .brand {
    width: 40px; height: 40px; flex: none;
    display: grid; place-items: center; border-radius: 13px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    box-shadow: 0 10px 26px rgba(255, 107, 61, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    font-weight: 700; font-size: 18px; color: #fff;
  }
  .title h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
  .title p { margin: 2px 0 0; font-size: 11.5px; color: var(--muted); }

  .tabs { display: flex; align-items: center; gap: 4px; margin-left: 34px; }
  .tabs button {
    border: 0; background: transparent; color: #b7b1a9;
    font: 500 12px/1 var(--sans);
    padding: 10px 18px; border-radius: 999px; cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .tabs button:hover { color: var(--ink); background: rgba(255, 255, 255, 0.06); }
  .tabs button.active { background: var(--ink); color: #111114; font-weight: 600; }

  .top-right { margin-left: auto; display: flex; align-items: center; gap: 14px; }
  .live { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: #b7b1a9; }
  .live i {
    width: 7px; height: 7px; border-radius: 50%; background: var(--green);
    box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5);
    animation: pulse 2.4s ease-out infinite;
  }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.45); }
    70% { box-shadow: 0 0 0 7px rgba(52, 211, 153, 0); }
    100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
  }
  .refresh {
    border: 0; cursor: pointer; background: var(--ink); color: #111114;
    font: 600 11.5px/1 var(--sans); padding: 11px 17px; border-radius: 999px;
    transition: transform 0.15s;
  }
  .refresh:hover { transform: translateY(-1px); }

  .view { display: none; }
  .view.active { display: block; }

  .band-label { display: flex; align-items: center; gap: 14px; margin: 26px 0 10px; }
  .band-label span { font-size: 9.5px; font-weight: 600; letter-spacing: 0.12em; color: var(--faint); white-space: nowrap; }
  .band-label i { flex: 1; height: 1px; background: rgba(255, 255, 255, 0.07); }

  .band { display: grid; gap: 14px; }
  .band-kpi { grid-template-columns: 4fr 3fr 3fr 2fr; grid-template-rows: 101px 101px; }
  .band-main { grid-template-columns: 5fr 7fr; }
  .band-tools { grid-template-columns: 4fr 3fr 5fr; }
  .band-support { grid-template-columns: 5fr 3fr 4fr; }
  .band-svc-kpi { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .tile {
    position: relative; padding: 18px 20px; border-radius: 24px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.03));
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 18px 40px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    min-width: 0;
  }
  .tile.accent {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-color: rgba(255, 255, 255, 0.26);
    box-shadow: 0 14px 30px rgba(255, 107, 61, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  .tile.light {
    background: #f5f4f2; color: #111114;
    border-color: rgba(0, 0, 0, 0.06);
  }
  .t-uptime { grid-column: 1; grid-row: 1 / span 2; display: flex; flex-direction: column; overflow: hidden; }
  .t-uptime .gauge { position: absolute; right: 14px; bottom: 4px; width: 172px; margin: 0; }
  .t-kpi-apps { grid-column: 2; grid-row: 1; }
  .t-kpi-tools { grid-column: 3; grid-row: 1; }
  .t-kpi-deps { grid-column: 2; grid-row: 2; }
  .t-kpi-probe { grid-column: 3; grid-row: 2; }
  .t-events { grid-column: 4; grid-row: 1 / span 2; display: flex; flex-direction: column; }
  .band-main .tile { min-height: 300px; }
  .band-tools .tile { min-height: 300px; }
  .band-support .tile { min-height: 220px; }
  .band-svc-kpi .tile { min-height: 92px; }

  .t-label { display: block; font-size: 11px; color: var(--muted); }
  .tile.accent .t-label { color: rgba(255, 226, 214, 0.9); }
  .tile.light .t-label { color: #6b6459; }
  .t-value { display: block; margin-top: 3px; font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
  .t-big { display: block; margin-top: 6px; font-size: 44px; font-weight: 700; letter-spacing: -0.02em; }
  .t-sub { display: block; margin-top: 8px; font-size: 10.5px; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile.accent .t-sub { color: rgba(255, 217, 201, 0.9); }
  .tile.light .t-sub { color: #8b857c; }

  .chip {
    position: absolute; top: 14px; right: 18px;
    font-style: normal; font-size: 9.5px; padding: 3px 9px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.08); color: var(--muted);
  }
  .chip.ok { background: rgba(52, 211, 153, 0.14); color: var(--green-text); }
  .chip.warn { background: rgba(255, 107, 61, 0.18); color: #ffc1a6; }
  .chip.on-accent { background: rgba(255, 255, 255, 0.24); color: #3b1b0d; }
  .tile.light .chip.ok { background: #e4f5ec; color: #177a4a; }

  .gauge { margin-top: auto; width: 220px; max-width: 100%; align-self: flex-end; }
  .gauge svg { display: block; width: 100%; height: auto; }

  .events { list-style: none; margin: 12px 0 0; padding: 0; flex: 1; }
  .events li {
    display: grid; grid-template-columns: 54px 6px minmax(0, 1fr); gap: 9px;
    align-items: center; padding: 8px 0; font-size: 11px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .events li:last-child { border-bottom: 0; }
  .events time { font-family: var(--mono); font-size: 9px; color: var(--faint); }
  .events .empty { display: block; padding: 12px 0; color: var(--faint); font-size: 10.5px; border: 0; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #bdb8b0; flex: none; }
  .dot.ok { background: var(--green); box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.12); }
  .dot.warn { background: #ff8a6b; }

  .tile-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .tile-head h2 { margin: 0; font-size: 12.5px; font-weight: 600; }
  .tile-head span { font-size: 9.5px; color: var(--faint); }

  .rows { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
  .row {
    display: grid; grid-template-columns: 9px minmax(0, 1fr) auto 54px;
    align-items: center; gap: 10px; height: 38px; padding: 0 12px;
    border-radius: 12px; background: rgba(255, 255, 255, 0.045);
  }
  .row b { font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row code { font-family: var(--mono); font-size: 10px; color: var(--muted); }

  .badge { font-size: 9.5px; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
  .badge.ok { background: rgba(52, 211, 153, 0.15); color: var(--green-text); }
  .badge.off { background: rgba(255, 107, 61, 0.18); color: #ffc1a6; }

  .tbl { margin-top: 10px; }
  .thead, .trow { display: grid; gap: 10px; align-items: center; }
  .tbl-mini .thead, .tbl-mini .trow { grid-template-columns: minmax(0, 1.5fr) 66px 62px 60px; }
  .tbl-full .thead, .tbl-full .trow { grid-template-columns: minmax(0, 1.5fr) 78px 74px 86px 64px 64px minmax(0, 1.6fr); }
  .thead { padding: 5px 0 8px; font-size: 9px; letter-spacing: 0.08em; color: var(--faint); text-transform: uppercase; }
  .trow { min-height: 30px; border-top: 1px solid rgba(255, 255, 255, 0.055); font-size: 11px; }
  .trow .name { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .trow .name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trow code { font-family: var(--mono); font-size: 9.5px; color: var(--muted); }
  .trow .probe { font-size: 9.5px; color: var(--faint); }
  .trow .cmdtext { font-family: var(--mono); font-size: 9px; color: #8f8981; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trow a { color: var(--accent-2); text-decoration: none; font-size: 9.5px; }
  .trow a:hover { text-decoration: underline; }
  .trow .none { color: var(--faint); font-size: 9.5px; }

  .gtag { font-size: 9px; padding: 3px 8px; border-radius: 999px; justify-self: start; }
  .gtag.app { background: #123326; color: var(--green-text); }
  .gtag.tool { background: #102a36; color: var(--blue); }
  .gtag.dep { background: #241e38; color: var(--violet); }

  .filters { display: flex; align-items: center; gap: 8px; margin: 14px 0 0; flex-wrap: wrap; }
  .filters button {
    border: 0; cursor: pointer; padding: 9px 14px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.06); color: #b7b1a9;
    font: 500 10.5px/1 var(--sans);
  }
  .filters button.active { background: var(--ink); color: #111114; font-weight: 600; }
  .filters .hint { margin-left: auto; font-size: 9.5px; color: var(--faint); }

  .cmd-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .cmd {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; padding: 9px 12px; border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px; background: rgba(255, 255, 255, 0.045);
    color: #b9b3aa; font: 400 10px/1.4 var(--mono);
    text-align: left; cursor: copy;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .cmd:hover { background: rgba(255, 255, 255, 0.08); }
  .cmd .copy { flex: none; font: 400 8.5px/1 var(--sans); color: #6e6a65; }
  .cmd.copied { border-color: rgba(52, 211, 153, 0.5); color: var(--green-text); }
  .cmd.copied .copy { color: var(--green-text); }

  .kv { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 6px 0; font-size: 10px; color: var(--muted); }
  .kv b { font-family: var(--mono); font-size: 9.5px; font-weight: 400; color: #b9b3aa; }
  .kv .val { color: var(--ink); }

  .mcp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .mcp-head h2 { margin: 0; font-size: 12.5px; font-weight: 600; }
  .mcp-port { margin-top: 8px; font: 700 30px/1 var(--mono); letter-spacing: -0.02em; }
  .mcp-sub { margin-top: 6px; font-size: 9.5px; color: var(--faint); }
  .mcp-open {
    display: block; margin-top: 16px; padding: 10px 0; text-align: center;
    border-radius: 999px; text-decoration: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff; font-size: 10.5px; font-weight: 600;
    box-shadow: 0 8px 18px rgba(255, 107, 61, 0.18);
  }
  .mcp-open.off { background: rgba(255, 255, 255, 0.08); color: var(--faint); box-shadow: none; }

  .list { display: flex; flex-direction: column; margin-top: 8px; }
  .list a, .list .item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 7px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 10.5px; color: var(--ink); text-decoration: none;
  }
  .list a:last-child, .list .item:last-child { border-bottom: 0; }
  .list a:hover { color: var(--accent-2); }
  .list code { font-family: var(--mono); font-size: 9px; color: var(--faint); }

  .note {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px;
    margin-top: 16px; padding: 12px 16px; border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 10px; color: var(--muted);
  }
  .note i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-2); }
  .note .right { margin-left: auto; color: var(--faint); }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; margin-top: 12px; font-size: 9.5px; color: var(--faint); }

  @media (max-width: 1180px) {
    .band-kpi { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
    .t-uptime, .t-events { grid-column: auto; grid-row: auto; min-height: 200px; }
    .t-kpi-apps, .t-kpi-tools, .t-kpi-deps, .t-kpi-probe { grid-column: auto; grid-row: auto; }
    .band-main, .band-tools, .band-support, .band-svc-kpi { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 760px) {
    body { padding: 16px 12px 24px; }
    .tabs { order: 3; width: 100%; margin-left: 0; overflow-x: auto; }
    .top-right { margin-left: auto; }
    .band-kpi, .band-main, .band-tools, .band-support, .band-svc-kpi { grid-template-columns: 1fr; }
    .t-uptime, .t-events { min-height: 190px; }
    .tbl { overflow-x: auto; }
    .tbl-full { min-width: 700px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .live i { animation: none; }
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .tile { background: #17171a; }
  }
</style>
</head>
<body>
<main class="wrap">
  <header class="top">
    <div class="brand" aria-hidden="true">S</div>
    <div class="title">
      <h1>本地开发服务</h1>
      <p>starter · local dev · 47xxx</p>
    </div>
    <nav class="tabs" aria-label="视图切换">
      <button type="button" class="active" data-view="overview">概览</button>
      <button type="button" data-view="services">服务</button>
      <button type="button" data-view="tools">工具</button>
    </nav>
    <div class="top-right">
      <span class="live"><i></i>自动刷新 5s</span>
      <button id="refresh" class="refresh" type="button">立即刷新</button>
    </div>
  </header>

  <!-- 概览 -->
  <section class="view active" id="view-overview" aria-label="概览">
    <div class="band-label"><span>概览 / OVERVIEW</span><i></i></div>
    <div class="band band-kpi">
      <article class="tile t-uptime">
        <span class="t-label">在线率</span>
        <strong class="t-big" id="ov-rate">—</strong>
        <span class="t-sub" id="ov-sub">检测中…</span>
        <span class="chip" id="ov-live">实时</span>
        <div class="gauge" id="ov-gauge"></div>
      </article>

      <article class="tile t-kpi-apps">
        <span class="t-label">应用</span>
        <strong class="t-value" id="ov-apps-value">—</strong>
        <span class="t-sub" id="ov-apps-sub"></span>
        <span class="chip" id="ov-apps-chip"></span>
      </article>

      <article class="tile t-kpi-tools light">
        <span class="t-label">工具</span>
        <strong class="t-value" id="ov-tools-value">—</strong>
        <span class="t-sub" id="ov-tools-sub"></span>
        <span class="chip ok" id="ov-tools-chip"></span>
      </article>

      <article class="tile t-kpi-deps">
        <span class="t-label">依赖服务</span>
        <strong class="t-value" id="ov-deps-value">—</strong>
        <span class="t-sub" id="ov-deps-sub"></span>
        <span class="chip" id="ov-deps-chip"></span>
      </article>

      <article class="tile t-kpi-probe accent">
        <span class="t-label">探测耗时</span>
        <strong class="t-value" id="ov-probe-value">—</strong>
        <span class="t-sub">并发探测 · 超时 1.2s</span>
        <span class="chip on-accent">超时 1.2s</span>
      </article>

      <article class="tile t-events">
        <div class="tile-head">
          <h2>最近事件</h2>
          <span class="live"><i></i>实时</span>
        </div>
        <ul class="events" id="ov-events" aria-live="polite"></ul>
      </article>
    </div>

    <div class="band-label"><span>服务 / SERVICES</span><i></i></div>
    <div class="band band-main">
      <article class="tile">
        <div class="tile-head"><h2>应用与工具</h2><span id="ov-apps-meta"></span></div>
        <div class="rows" id="ov-app-rows"></div>
      </article>
      <article class="tile">
        <div class="tile-head"><h2>服务明细</h2><span id="ov-table-meta"></span></div>
        <div class="tbl tbl-mini" id="ov-table"></div>
      </article>
    </div>

    <div class="band-label"><span>工具 / TOOLS</span><i></i></div>
    <div class="band band-tools">
      <article class="tile">
        <div class="tile-head"><h2>快捷命令</h2><span>点击复制</span></div>
        <div class="cmd-list" id="ov-cmds"></div>
      </article>
      <article class="tile">
        <div class="tile-head"><h2>端口约定</h2></div>
        <div class="list" id="ov-ports"></div>
      </article>
      <article class="tile">
        <div class="tile-head"><h2>探测策略</h2></div>
        <div class="list" id="ov-strategy"></div>
      </article>
    </div>
  </section>

  <!-- 服务 -->
  <section class="view" id="view-services" aria-label="服务">
    <div class="band-label"><span>概览 / OVERVIEW</span><i></i></div>
    <div class="band band-svc-kpi" id="svc-kpis"></div>

    <div class="band-label"><span>服务 / SERVICES</span><i></i></div>
    <div class="filters" id="svc-filters"></div>
    <div class="tile" style="margin-top:14px">
      <div class="tile-head"><h2>服务明细</h2><span id="svc-table-meta"></span></div>
      <div class="tbl tbl-full" id="svc-table"></div>
    </div>
  </section>

  <!-- 工具 -->
  <section class="view" id="view-tools" aria-label="工具">
    <div class="band-label"><span>工具 / TOOLS</span><i></i></div>
    <div class="band band-tools" style="grid-template-columns:6fr 3fr 3fr">
      <article class="tile">
        <div class="tile-head"><h2>快捷命令</h2><span>点击复制</span></div>
        <div class="cmd-list" id="tool-cmds"></div>
      </article>
      <article class="tile" id="tool-mcp"></article>
      <article class="tile">
        <div class="tile-head"><h2>端口约定</h2></div>
        <div class="list" id="tool-ports"></div>
      </article>
    </div>

    <div class="band-label"><span>辅助 / SUPPORT</span><i></i></div>
    <div class="band band-support">
      <article class="tile">
        <div class="tile-head"><h2>常用入口</h2></div>
        <div class="list" id="tool-links"></div>
      </article>
      <article class="tile">
        <div class="tile-head"><h2>探测策略</h2></div>
        <div class="list" id="tool-strategy"></div>
      </article>
      <article class="tile">
        <div class="tile-head"><h2>环境信息</h2></div>
        <div class="list" id="tool-env"></div>
      </article>
    </div>
  </section>

  <div class="note">
    <i></i>
    <span>端口约定：server 47100 · client +73 · admin +74 · portal +75 · Penpot MCP 4401</span>
    <span class="right">仅开发环境注册 · 生产访问返回 404</span>
  </div>
  <footer class="foot">
    <span>starter · local dev · 47xxx</span>
    <span id="foot-time">最后更新 —</span>
  </footer>
</main>
<script>
(function () {
  var API = "${API_PREFIX}/dev/services";
  var REFRESH_MS = 5000;
  var state = { services: [], prev: null, events: [], ms: null, filter: "all", view: "overview" };

  var COMMANDS = [
    "pnpm dev",
    "pnpm api:generate",
    "pnpm lint",
    "pnpm --filter @starter/server test:e2e",
    "pnpm --filter @starter/server test:rls",
    "docker compose up -d"
  ];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function byGroup(group) {
    return state.services.filter(function (s) { return s.group === group; });
  }
  function onlineOf(list) {
    return list.filter(function (s) { return s.status === "online"; }).length;
  }
  function percent(part, total) {
    return total ? Math.round((part / total) * 1000) / 10 : 0;
  }
  function clock(d) {
    d = d || new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function base(port) { return "http://localhost:" + port; }
  function entryOf(s) {
    if (s.url) return s.url;
    if (s.links && s.links.length) return s.links[0].href;
    return null;
  }
  function groupClass(group) {
    return group === "应用" ? "app" : group === "工具" ? "tool" : "dep";
  }
  function groupTag(group) {
    return '<span class="gtag ' + groupClass(group) + '">' + esc(group) + "</span>";
  }
  function badge(ok) {
    return '<span class="badge ' + (ok ? "ok" : "off") + '">' + (ok ? "在线" : "离线") + "</span>";
  }

  function gaugeSvg(ratio) {
    var arc = 283;
    var dash = arc * ratio;
    var theta = (180 - 180 * ratio) * Math.PI / 180;
    var kx = (120 + 90 * Math.cos(theta)).toFixed(1);
    var ky = (125 - 90 * Math.sin(theta)).toFixed(1);
    return '<svg viewBox="0 0 240 140" role="img" aria-label="服务在线率">'
      + '<defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">'
      + '<stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#a78bfa"/>'
      + "</linearGradient></defs>"
      + '<path d="M30 125 A90 90 0 1 1 210 125" fill="none" stroke="#26262a" stroke-width="16" stroke-linecap="round"/>'
      + '<path d="M30 125 A90 90 0 1 1 210 125" fill="none" stroke="url(#gg)" stroke-width="16" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + ' 295"/>'
      + '<circle cx="' + kx + '" cy="' + ky + '" r="8" fill="#fff"/>'
      + "</svg>";
  }

  function renderEvents() {
    var el = document.getElementById("ov-events");
    if (!el) return;
    if (!state.events.length) {
      el.innerHTML = '<li class="empty">状态变化时自动记录</li>';
      return;
    }
    var html = "";
    state.events.slice(0, 4).forEach(function (e) {
      var tone = e.tone === "ok" ? " ok" : e.tone === "off" ? " warn" : "";
      html += "<li><time>" + esc(e.time) + '</time><i class="dot' + tone + '"></i><span>' + esc(e.text) + "</span></li>";
    });
    if (state.events.length < 4) html += '<li class="empty">状态变化时自动记录</li>';
    el.innerHTML = html;
  }

  function recordEvents() {
    var map = {};
    state.services.forEach(function (s) { map[s.id] = s; });
    if (!state.prev) {
      state.events.unshift({ time: clock(), text: "开始监控 · " + state.services.length + " 个服务", tone: "info" });
    } else {
      state.services.forEach(function (s) {
        var old = state.prev[s.id];
        if (old && old.status !== s.status) {
          state.events.unshift({
            time: clock(),
            text: s.name + (s.status === "online" ? " 已连接" : " 探测失败"),
            tone: s.status === "online" ? "ok" : "off"
          });
        }
      });
    }
    state.prev = map;
    state.events = state.events.slice(0, 20);
    renderEvents();
  }

  function renderOverview() {
    var apps = byGroup("应用");
    var tools = byGroup("工具");
    var deps = byGroup("依赖服务");
    var total = state.services.length;
    var online = onlineOf(state.services);
    var ratio = total ? online / total : 0;

    document.getElementById("ov-rate").textContent = percent(online, total) + "%";
    document.getElementById("ov-sub").textContent = online + " / " + total + " 服务在线";
    document.getElementById("ov-gauge").innerHTML = gaugeSvg(ratio);
    var liveChip = document.getElementById("ov-live");
    liveChip.className = "chip " + (online === total ? "ok" : "warn");
    liveChip.textContent = online === total ? "全部在线" : (total - online) + " 离线";

    [
      ["apps", apps], ["tools", tools], ["deps", deps]
    ].forEach(function (pair) {
      var key = pair[0];
      var list = pair[1];
      var count = onlineOf(list);
      var off = list.length - count;
      document.getElementById("ov-" + key + "-value").textContent = count + "/" + list.length;
      document.getElementById("ov-" + key + "-sub").textContent = list.map(function (s) { return s.name; }).join(" · ");
      var chip = document.getElementById("ov-" + key + "-chip");
      chip.className = "chip " + (off ? "warn" : "ok");
      chip.textContent = off ? off + " 离线" : "全部在线";
    });

    document.getElementById("ov-probe-value").textContent = state.ms == null ? "—" : state.ms + "ms";

    var rows = byGroup("应用").concat(byGroup("工具"));
    document.getElementById("ov-apps-meta").textContent = rows.length + " 项";
    document.getElementById("ov-app-rows").innerHTML = rows.map(function (s) {
      var ok = s.status === "online";
      return '<div class="row"><i class="dot' + (ok ? " ok" : "") + '"></i><b>' + esc(s.name) + "</b><code>:" + s.port + "</code>" + badge(ok) + "</div>";
    }).join("");

    document.getElementById("ov-table-meta").textContent = total + " 个服务";
    var thead = '<div class="thead"><span>服务</span><span>端口</span><span>状态</span><span>入口</span></div>';
    var trows = state.services.map(function (s) {
      var ok = s.status === "online";
      var href = entryOf(s);
      var entry = ok && href ? '<a href="' + esc(href) + '" target="_blank" rel="noreferrer">打开 ↗</a>' : '<span class="none">—</span>';
      return '<div class="trow"><div class="name"><i class="dot' + (ok ? " ok" : "") + '"></i><span>' + esc(s.name) + "</span></div><code>:" + s.port + "</code>" + badge(ok) + "<div>" + entry + "</div></div>";
    }).join("");
    document.getElementById("ov-table").innerHTML = thead + trows;

    document.getElementById("ov-ports").innerHTML = state.services.map(function (s) {
      return '<div class="item"><span>' + esc(s.name) + "</span><code>:" + s.port + "</code></div>";
    }).join("");

    var strategy = [
      ["HTTP 请求", "应用 / Penpot / Mailpit", "1200ms"],
      ["TCP 连接", "Redis", "1200ms"],
      ["SELECT 1", "PostgreSQL", "1200ms"]
    ];
    document.getElementById("ov-strategy").innerHTML = strategy.map(function (s) {
      return '<div class="item"><span>' + esc(s[0]) + " <code>" + esc(s[1]) + "</code></span><code>" + esc(s[2]) + "</code></div>";
    }).join("");

    renderEvents();
  }

  function renderServices() {
    var apps = byGroup("应用");
    var deps = byGroup("依赖服务");
    var total = state.services.length;
    var online = onlineOf(state.services);

    var cards = [
      { label: "应用", value: onlineOf(apps) + "/" + apps.length, chip: apps.length - onlineOf(apps) ? "1 离线" : "全部在线", warn: apps.length - onlineOf(apps), sub: "server · client · admin · portal" },
      { label: "依赖服务", value: onlineOf(deps) + "/" + deps.length, chip: deps.length - onlineOf(deps) ? "有离线" : "全部在线", warn: deps.length - onlineOf(deps), sub: "PG · Redis · Penpot · Mailpit" },
      { label: "在线率", value: percent(online, total) + "%", chip: online + "/" + total, warn: total - online, sub: "实时探测 · 5s 刷新" },
      { label: "探测耗时", value: (state.ms == null ? "—" : state.ms + "ms"), chip: "超时 1.2s", accent: true, sub: "并发探测" }
    ];

    document.getElementById("svc-kpis").innerHTML = cards.map(function (c, i) {
      var cls = "tile" + (c.accent ? " accent" : "");
      var chipCls = c.accent ? "on-accent" : (c.warn ? "warn" : "ok");
      return '<article class="' + cls + '">'
        + '<span class="t-label">' + esc(c.label) + "</span>"
        + '<strong class="t-value"' + (c.accent ? ' style="color:#fff"' : "") + ">" + esc(c.value) + "</strong>"
        + '<span class="t-sub">' + esc(c.sub) + "</span>"
        + '<span class="chip ' + chipCls + '">' + esc(c.chip) + "</span>"
        + "</article>";
    }).join("");

    var counts = { all: total, "应用": apps.length, "工具": byGroup("工具").length, "依赖服务": deps.length };
    var filterHtml = [["all", "全部"], ["应用", "应用"], ["工具", "工具"], ["依赖服务", "依赖"]].map(function (f) {
      var n = counts[f[0]] == null ? 0 : counts[f[0]];
      var active = state.filter === f[0] ? " active" : "";
      return '<button type="button" class="' + active.trim() + '" data-filter="' + f[0] + '">' + f[1] + "  " + n + "</button>";
    }).join("");
    document.getElementById("svc-filters").innerHTML = filterHtml
      + '<span class="hint">按分组筛选 · 点击行打开服务</span>';

    var list = state.services.filter(function (s) {
      return state.filter === "all" || s.group === state.filter;
    });
    document.getElementById("svc-table-meta").textContent = list.length + " 个服务 · 实时";

    var thead = '<div class="thead"><span>服务</span><span>分组</span><span>端口</span><span>探测</span><span>状态</span><span>入口</span><span>启动命令</span></div>';
    var trows = list.map(function (s) {
      var ok = s.status === "online";
      var href = entryOf(s);
      var entry = ok && href ? '<a href="' + esc(href) + '" target="_blank" rel="noreferrer">打开 ↗</a>' : '<span class="none">—</span>';
      return '<div class="trow"><div class="name"><i class="dot' + (ok ? " ok" : "") + '"></i><span>' + esc(s.name) + "</span></div>"
        + groupTag(s.group)
        + "<code>:" + s.port + "</code>"
        + '<span class="probe">' + esc(s.probe) + "</span>"
        + badge(ok)
        + "<div>" + entry + "</div>"
        + '<span class="cmdtext" title="' + esc(s.command) + '">' + esc(s.command) + "</span></div>";
    }).join("");
    document.getElementById("svc-table").innerHTML = thead + trows;
  }

  function renderTools() {
    var mcp = state.services.filter(function (s) { return s.id === "penpot-mcp"; })[0];
    var penpot = state.services.filter(function (s) { return s.id === "penpot"; })[0];
    var mcpOk = mcp && mcp.status === "online";
    var penpotUrl = penpot && penpot.url ? penpot.url : base(penpot ? penpot.port : 9001);

    document.getElementById("tool-mcp").innerHTML =
      '<div class="mcp-head"><h2>Penpot MCP</h2>' + badge(!!mcpOk) + "</div>"
      + '<div class="mcp-port">' + esc(mcp ? mcp.port : "4401") + "</div>"
      + '<div class="mcp-sub">MCP HTTP 端点</div>'
      + '<div class="kv"><span>模式</span><b>本地 · 免 key</b></div>'
      + '<div class="kv"><span>插件</span><b>localhost:4400</b></div>'
      + '<div class="kv"><span>启动</span><b>pnpm penpot:mcp</b></div>'
      + '<a class="mcp-open' + (mcpOk ? "" : " off") + '" href="' + esc(penpotUrl) + '" target="_blank" rel="noreferrer">打开 Penpot</a>';

    document.getElementById("tool-ports").innerHTML = state.services.map(function (s) {
      return '<div class="item"><span>' + esc(s.name) + "</span><code>:" + s.port + "</code></div>";
    }).join("");

    var server = state.services.filter(function (s) { return s.id === "server"; })[0];
    var links = [];
    if (server && server.links) links = links.concat(server.links);
    if (penpot && penpot.url) links.push({ label: "Penpot", href: penpot.url });
    var mailpit = state.services.filter(function (s) { return s.id === "mailpit"; })[0];
    if (mailpit && mailpit.url) links.push({ label: "Mailpit", href: mailpit.url });
    if (mcp && mcp.links && mcp.links.length) links.push({ label: "插件 manifest", href: mcp.links[0].href });

    document.getElementById("tool-links").innerHTML = links.map(function (l) {
      return '<a href="' + esc(l.href) + '" target="_blank" rel="noreferrer"><span>' + esc(l.label) + "</span><code>" + esc(l.href.replace(/^https?:\\/\\//, "")) + "</code></a>";
    }).join("");

    var strategy = [
      ["HTTP 请求", "应用 / Penpot / Mailpit", "1200ms"],
      ["TCP 连接", "Redis", "1200ms"],
      ["SELECT 1", "PostgreSQL", "1200ms"]
    ];
    document.getElementById("tool-strategy").innerHTML = strategy.map(function (s) {
      return '<div class="item"><span>' + esc(s[0]) + " <code>" + esc(s[1]) + "</code></span><code>" + esc(s[2]) + "</code></div>";
    }).join("");

    var env = [
      ["端口基址", server ? String(server.port) : "47100"],
      ["刷新间隔", "5s"],
      ["探测超时", "1200ms"],
      ["页面", "/api/dev"]
    ];
    document.getElementById("tool-env").innerHTML = env.map(function (e) {
      return '<div class="item"><span>' + esc(e[0]) + "</span><code>" + esc(e[1]) + "</code></div>";
    }).join("");
  }

  function renderCommands() {
    function build(containerId) {
      var box = document.getElementById(containerId);
      if (!box) return;
      box.innerHTML = COMMANDS.map(function (cmd) {
        return '<button type="button" class="cmd" data-copy="' + esc(cmd) + '"><span>' + esc(cmd) + '</span><span class="copy">复制</span></button>';
      }).join("");
    }
    build("ov-cmds");
    build("tool-cmds");
  }

  function renderAll() {
    if (!state.services.length) return;
    renderOverview();
    renderServices();
    renderTools();
    document.getElementById("foot-time").textContent = "最后更新 " + clock() + " · 自动刷新 5s";
  }

  function load() {
    var started = performance.now();
    fetch(API, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        state.ms = Math.round(performance.now() - started);
        state.services = data.services || [];
        renderAll();
        recordEvents();
      })
      .catch(function (err) {
        state.events.unshift({ time: clock(), text: "检测失败：" + err.message, tone: "off" });
        state.events = state.events.slice(0, 20);
        renderEvents();
      });
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + view);
    });
    if (location.hash !== "#" + view) {
      history.replaceState(null, "", "#" + view);
    }
  }

  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
  });

  document.getElementById("svc-filters").addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-filter]");
    if (!btn) return;
    state.filter = btn.getAttribute("data-filter");
    renderServices();
  });

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".cmd[data-copy]");
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var done = function () {
      btn.classList.add("copied");
      btn.querySelector(".copy").textContent = "已复制";
      setTimeout(function () {
        btn.classList.remove("copied");
        btn.querySelector(".copy").textContent = "复制";
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  });

  document.getElementById("refresh").addEventListener("click", load);

  var initial = (location.hash || "").replace("#", "");
  renderCommands();
  setView(initial === "services" || initial === "tools" ? initial : "overview");
  load();
  setInterval(load, REFRESH_MS);
})();
</script>
</body>
</html>`;
