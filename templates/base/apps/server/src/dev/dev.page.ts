import { API_PREFIX } from "../../../../packages/shared/src/index";

/**
 * 开发导航页（单文件、无构建、无外部依赖）。
 *
 * 视觉：深色玻璃拟态（参考 Dribbble HR Dashboard），用 CSS backdrop-filter
 * 实现真正的毛玻璃；数据全部来自 `/api/dev/services`，无演示数据：
 * - KPI / 仪表盘 / 服务表格由探测结果实时计算
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
    --warn: #ffb077;
    --accent: #ff6b3d;
    --accent-2: #ff9d4d;
    --sans: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
    --mono: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    padding: 30px 24px 36px;
    color: var(--ink);
    font: 14px/1.5 var(--sans);
    -webkit-font-smoothing: antialiased;
    background:
      radial-gradient(900px 620px at 88% -8%, rgba(255, 107, 61, 0.32), transparent 62%),
      radial-gradient(760px 640px at -6% 48%, rgba(124, 92, 255, 0.26), transparent 62%),
      radial-gradient(760px 620px at 92% 108%, rgba(56, 189, 248, 0.18), transparent 62%),
      var(--bg);
    background-attachment: fixed;
  }

  .shell {
    position: relative;
    max-width: 1440px;
    margin: 0 auto;
    padding: 26px 32px 22px;
    border-radius: 30px;
    background: linear-gradient(180deg, rgba(20, 20, 24, 0.72), rgba(12, 12, 14, 0.66));
    border: 1px solid rgba(255, 255, 255, 0.13);
    box-shadow: 0 40px 120px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(28px) saturate(140%);
    -webkit-backdrop-filter: blur(28px) saturate(140%);
  }

  .top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .brand {
    width: 38px; height: 38px; flex: none;
    display: grid; place-items: center;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    box-shadow: 0 10px 24px rgba(255, 107, 61, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    font-weight: 700; font-size: 17px; color: #fff;
  }
  .nav { display: flex; align-items: center; gap: 4px; margin-left: 4px; }
  .nav button {
    border: 0; background: transparent; color: #b7b1a9;
    font: 500 12.5px/1 var(--sans);
    padding: 10px 15px; border-radius: 999px; cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .nav button:hover { color: var(--ink); background: rgba(255, 255, 255, 0.06); }
  .nav button.active { background: var(--ink); color: #111114; font-weight: 600; }

  .top-right { margin-left: auto; display: flex; align-items: center; gap: 14px; }
  .live { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: #b7b1a9; }
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
    border: 0; cursor: pointer;
    background: var(--ink); color: #111114;
    font: 600 12px/1 var(--sans);
    padding: 11px 18px; border-radius: 999px;
    transition: transform 0.15s, opacity 0.15s;
  }
  .refresh:hover { transform: translateY(-1px); }
  .refresh:active { transform: none; opacity: 0.85; }

  .kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
  .kpi {
    padding: 15px 18px; border-radius: 20px; min-height: 108px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.115), rgba(255, 255, 255, 0.035));
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
  }
  .kpi.accent {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-color: rgba(255, 255, 255, 0.26);
    box-shadow: 0 18px 44px rgba(255, 107, 61, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  .kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .kpi-label { font-size: 11px; color: var(--muted); }
  .kpi.accent .kpi-label { color: rgba(255, 255, 255, 0.88); }
  .kpi-value { display: block; margin-top: 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
  .kpi-sub {
    margin: 7px 0 0; font-size: 10.5px; color: var(--faint);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .kpi.accent .kpi-sub { color: rgba(255, 233, 224, 0.8); }

  .chip {
    font-style: normal; flex: none;
    font-size: 10px; padding: 3px 8px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.08); color: var(--muted);
  }
  .chip.ok { background: rgba(52, 211, 153, 0.14); color: var(--green-text); }
  .chip.warn { background: rgba(255, 107, 61, 0.18); color: #ffc1a6; }
  .chip.on-accent { background: rgba(255, 255, 255, 0.24); color: #3b1b0d; }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.56fr) minmax(0, 0.78fr) minmax(0, 0.78fr);
    gap: 16px; margin-top: 20px;
  }
  .card {
    position: relative; padding: 16px 20px 18px;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.028));
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
  }
  .card > header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .card h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .card .meta { font-size: 10px; color: var(--faint); }

  .rows { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
  .row {
    display: grid; grid-template-columns: 9px minmax(0, 1fr) auto 54px;
    align-items: center; gap: 10px;
    height: 40px; padding: 0 14px; border-radius: 12px;
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .row b { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row code { font-family: var(--mono); font-size: 10.5px; color: var(--muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #bdb8b0; flex: none; }
  .dot.ok { background: var(--green); box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.13); }
  .dot.warn { background: #ff8a6b; }

  .badge { font-size: 10px; padding: 3px 8px; border-radius: 999px; text-align: center; white-space: nowrap; }
  .badge.ok { background: rgba(52, 211, 153, 0.15); color: var(--green-text); }
  .badge.off { background: rgba(255, 107, 61, 0.18); color: #ffc1a6; }

  .gauge { position: relative; width: 240px; max-width: 100%; margin: 6px auto 0; }
  .gauge svg { display: block; width: 100%; height: auto; }
  .gauge-center {
    position: absolute; left: 0; right: 0; top: 60%;
    transform: translateY(-50%); text-align: center;
  }
  .gauge-center strong { font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
  .gauge-center span { display: block; margin-top: 3px; font-size: 10.5px; color: var(--faint); }
  .mini { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 20px; margin-top: 10px; }
  .mini div { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; font-size: 10px; color: var(--faint); }
  .mini b { font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--ink); }

  .events { list-style: none; margin: 8px 0 0; padding: 0; }
  .events li {
    display: grid; grid-template-columns: 56px 6px minmax(0, 1fr);
    align-items: center; gap: 10px;
    padding: 8px 0; font-size: 11.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .events li:last-child { border-bottom: 0; }
  .events time { font-family: var(--mono); font-size: 9.5px; color: var(--faint); }
  .events .dot { width: 6px; height: 6px; }
  .events .empty { padding: 14px 0; color: var(--faint); font-size: 11.5px; border: 0; display: block; }

  .panel-table { grid-column: 1 / 3; }
  .panel-cmds { grid-column: 3; }
  .table { margin-top: 6px; }
  .thead, .trow {
    display: grid; grid-template-columns: minmax(0, 1.5fr) 84px 92px 66px 72px;
    gap: 10px; align-items: center;
  }
  .thead {
    padding: 6px 0 8px; font-size: 9px; letter-spacing: 0.08em;
    color: var(--faint); text-transform: uppercase;
  }
  .trow { height: 30px; border-top: 1px solid rgba(255, 255, 255, 0.055); font-size: 11.5px; }
  .trow .name { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .trow .name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trow code { font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .trow .probe { font-size: 10px; color: var(--faint); }
  .trow a { color: var(--accent-2); text-decoration: none; font-size: 10.5px; }
  .trow a:hover { text-decoration: underline; }
  .trow .none { color: var(--faint); }

  .cmd {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; margin-bottom: 8px; padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px;
    background: rgba(255, 255, 255, 0.045);
    color: #b9b3aa; font: 400 10.5px/1.4 var(--mono);
    text-align: left; cursor: copy;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .cmd:hover { background: rgba(255, 255, 255, 0.08); }
  .cmd .copy { flex: none; font: 400 9px/1 var(--sans); color: #6e6a65; }
  .cmd.copied { border-color: rgba(52, 211, 153, 0.5); color: var(--green-text); }
  .cmd.copied .copy { color: var(--green-text); }
  .cmds-note { margin: 4px 0 0; font-size: 9.5px; color: var(--faint); }

  .note {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px;
    margin-top: 16px; padding: 13px 16px; border-radius: 14px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
    border: 1px solid rgba(255, 255, 255, 0.10);
    font-size: 10.5px; color: var(--muted);
  }
  .note i { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-2); flex: none; }
  .note .note-right { margin-left: auto; color: var(--faint); }
  .foot {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px;
    margin-top: 12px; font-size: 10px; color: var(--faint);
  }

  @media (max-width: 1180px) {
    .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid { grid-template-columns: 1fr 1fr; }
    .panel-apps { grid-column: 1 / 3; }
    .panel-table { grid-column: 1 / 3; }
    .panel-cmds { grid-column: 1 / 3; }
  }
  @media (max-width: 760px) {
    body { padding: 16px 12px 24px; }
    .shell { padding: 20px 16px 18px; border-radius: 22px; }
    .nav { order: 3; width: 100%; overflow-x: auto; padding-bottom: 2px; }
    .top-right { margin-left: auto; }
    .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .grid { grid-template-columns: 1fr; }
    .panel-apps, .panel-table, .panel-cmds { grid-column: 1; }
    .thead, .trow { grid-template-columns: minmax(0, 1.4fr) 70px 66px 64px; }
    .thead span:nth-child(3), .trow .probe { display: none; }
    .card { padding: 14px 16px 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .live i { animation: none; }
    .refresh, .cmd { transition: none; }
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .shell { background: #101014; }
    .card, .kpi { background: #17171a; }
  }
</style>
</head>
<body>
<main class="shell">
  <header class="top">
    <div class="brand" aria-hidden="true">S</div>
    <nav class="nav" aria-label="页面导航">
      <button type="button" class="active" data-target="top">概览</button>
      <button type="button" data-target="panel-apps">应用</button>
      <button type="button" data-target="panel-table">依赖</button>
      <button type="button" data-target="panel-events">事件</button>
    </nav>
    <div class="top-right">
      <span class="live"><i></i>自动刷新 5s</span>
      <button id="refresh" class="refresh" type="button">立即刷新</button>
    </div>
  </header>

  <section id="kpis" class="kpis" aria-label="概览指标"></section>

  <div class="grid">
    <section id="panel-apps" class="card panel-apps">
      <header>
        <h2>应用与工具</h2>
        <span id="apps-meta" class="meta"></span>
      </header>
      <div id="app-rows" class="rows"></div>
    </section>

    <section class="card panel-gauge">
      <header>
        <h2>运行概览</h2>
        <span id="updated" class="meta">检测中…</span>
      </header>
      <div class="gauge">
        <svg viewBox="0 0 240 140" role="img" aria-label="服务在线率">
          <defs>
            <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#38bdf8" />
              <stop offset="1" stop-color="#a78bfa" />
            </linearGradient>
          </defs>
          <path d="M30 125 A90 90 0 1 1 210 125" fill="none" stroke="#242428" stroke-width="18" stroke-linecap="round" />
          <path id="gauge-fill" d="M30 125 A90 90 0 1 1 210 125" fill="none" stroke="url(#gauge-grad)" stroke-width="18" stroke-linecap="round" stroke-dasharray="0 295" />
          <circle id="gauge-knob" cx="30" cy="125" r="8" fill="#ffffff" />
        </svg>
        <div class="gauge-center">
          <strong id="gauge-value">—</strong>
          <span>服务在线</span>
        </div>
      </div>
      <div id="mini" class="mini"></div>
    </section>

    <section id="panel-events" class="card panel-events">
      <header>
        <h2>最近事件</h2>
        <span class="live"><i></i>实时</span>
      </header>
      <ul id="events" class="events" aria-live="polite"></ul>
    </section>

    <section id="panel-table" class="card panel-table">
      <header>
        <h2>服务明细</h2>
        <span id="table-meta" class="meta"></span>
      </header>
      <div class="table">
        <div class="thead" aria-hidden="true">
          <span>服务</span><span>端口</span><span>探测</span><span>状态</span><span>入口</span>
        </div>
        <div id="table-rows"></div>
      </div>
    </section>

    <section id="panel-cmds" class="card panel-cmds">
      <header>
        <h2>快捷命令</h2>
        <span class="meta">点击复制</span>
      </header>
      <div id="cmd-rows" style="margin-top:10px"></div>
      <p class="cmds-note">插件 manifest：localhost:4400 · MCP：localhost:4401</p>
    </section>
  </div>

  <div class="note">
    <i></i>
    <span>端口约定：server 47100 · client +73 · admin +74 · portal +75 · Penpot MCP 4401</span>
    <span class="note-right">仅开发环境注册 · 生产访问返回 404</span>
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
  var state = { prev: null, events: [], ms: null };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(d) {
    d = d || new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function byGroup(services, group) {
    return services.filter(function (s) { return s.group === group; });
  }
  function onlineOf(list) {
    return list.filter(function (s) { return s.status === "online"; }).length;
  }
  function percent(part, total) {
    return total ? Math.round((part / total) * 1000) / 10 : 0;
  }

  function chip(text, tone) {
    var c = el("em", "chip " + tone, text);
    return c;
  }

  function kpiCard(label, value, chipText, chipTone, sub, accent) {
    var card = el("article", "kpi" + (accent ? " accent" : ""));
    var head = el("div", "kpi-head");
    head.append(el("span", "kpi-label", label));
    if (chipText) head.append(chip(chipText, chipTone));
    card.append(head, el("strong", "kpi-value", value), el("p", "kpi-sub", sub));
    return card;
  }

  function renderKpis(services, ms) {
    var apps = byGroup(services, "应用");
    var tools = byGroup(services, "工具");
    var deps = byGroup(services, "依赖服务");
    var total = services.length;
    var online = onlineOf(services);
    var box = $("kpis");
    box.textContent = "";

    [apps, tools, deps].forEach(function (list) {
      var name = list === apps ? "应用" : list === tools ? "工具" : "依赖服务";
      var count = onlineOf(list);
      var off = list.length - count;
      box.append(kpiCard(
        name,
        count + "/" + list.length,
        off ? off + " 离线" : "全部在线",
        off ? "warn" : "ok",
        list.map(function (s) { return s.name; }).join(" · "),
        false
      ));
    });

    box.append(kpiCard(
      "在线率",
      percent(online, total) + "%",
      online + "/" + total,
      online === total ? "ok" : "warn",
      "实时探测 · 5s 刷新",
      false
    ));

    box.append(kpiCard(
      "探测耗时",
      ms == null ? "—" : ms + "ms",
      "超时 1200ms",
      "on-accent",
      "并发探测",
      true
    ));
  }

  function renderRows(services) {
    var box = $("app-rows");
    box.textContent = "";
    var list = byGroup(services, "应用").concat(byGroup(services, "工具"));
    $("apps-meta").textContent = list.length + " 项";

    list.forEach(function (s) {
      var ok = s.status === "online";
      var row = el("div", "row");
      row.append(el("i", "dot" + (ok ? " ok" : "")));
      row.append(el("b", null, s.name));
      row.append(el("code", null, ":" + s.port));
      row.append(el("span", "badge " + (ok ? "ok" : "off"), ok ? "在线" : "离线"));
      if (!ok && s.command) row.title = "启动： " + s.command;
      box.append(row);
    });
  }

  function renderGauge(services) {
    var online = onlineOf(services);
    var total = services.length;
    var p = total ? online / total : 0;
    var arc = 283;
    var theta = (180 - 180 * p) * Math.PI / 180;
    $("gauge-fill").setAttribute("stroke-dasharray", (arc * p) + " " + (arc + 12));
    $("gauge-knob").setAttribute("cx", (120 + 90 * Math.cos(theta)).toFixed(1));
    $("gauge-knob").setAttribute("cy", (125 - 90 * Math.sin(theta)).toFixed(1));
    $("gauge-value").textContent = online + "/" + total;

    var mini = $("mini");
    mini.textContent = "";
    [
      ["应用", onlineOf(byGroup(services, "应用")) + "/" + byGroup(services, "应用").length],
      ["工具", onlineOf(byGroup(services, "工具")) + "/" + byGroup(services, "工具").length],
      ["依赖", onlineOf(byGroup(services, "依赖服务")) + "/" + byGroup(services, "依赖服务").length],
      ["耗时", state.ms == null ? "—" : state.ms + "ms"]
    ].forEach(function (pair) {
      var item = el("div");
      item.append(el("span", null, pair[0]), el("b", null, pair[1]));
      mini.append(item);
    });
  }

  function entryOf(s) {
    if (s.url) return s.url;
    if (s.links && s.links.length) return s.links[0].href;
    return null;
  }

  function renderTable(services) {
    var box = $("table-rows");
    box.textContent = "";
    $("table-meta").textContent = services.length + " 个服务";

    services.forEach(function (s) {
      var ok = s.status === "online";
      var row = el("div", "trow");
      var name = el("div", "name");
      name.append(el("i", "dot" + (ok ? " ok" : "")));
      name.append(el("span", null, s.name));
      row.append(name);
      row.append(el("code", null, ":" + s.port));
      row.append(el("span", "probe", s.probe));
      row.append(el("span", "badge " + (ok ? "ok" : "off"), ok ? "在线" : "离线"));
      var href = entryOf(s);
      if (href && ok) {
        var link = el("a", null, "打开 ↗");
        link.href = href;
        link.target = "_blank";
        link.rel = "noreferrer";
        row.append(link);
      } else {
        row.append(el("span", "none", "—"));
      }
      box.append(row);
    });
  }

  function renderEvents() {
    var box = $("events");
    box.textContent = "";
    if (!state.events.length) {
      box.append(el("li", "empty", "暂无事件，状态变化会记录在这里"));
      return;
    }
    state.events.slice(0, 6).forEach(function (e) {
      var item = el("li");
      var tone = e.tone === "ok" ? " ok" : e.tone === "off" ? " warn" : "";
      item.append(el("time", null, e.time));
      item.append(el("i", "dot" + tone));
      item.append(el("span", null, e.text));
      box.append(item);
    });
    if (state.events.length < 6) {
      box.append(el("li", "empty", "状态变化时自动记录"));
    }
  }

  function recordEvents(services) {
    var map = {};
    services.forEach(function (s) { map[s.id] = s; });

    if (!state.prev) {
      state.events.unshift({
        time: clock(),
        text: "开始监控 · " + services.length + " 个服务",
        tone: "info"
      });
    } else {
      services.forEach(function (s) {
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

  function render(services) {
    renderKpis(services, state.ms);
    renderRows(services);
    renderGauge(services);
    renderTable(services);
    recordEvents(services);
    $("updated").textContent = "更新于 " + clock();
    $("foot-time").textContent = "最后更新 " + clock() + " · 自动刷新 5s";
  }

  function fail(err) {
    $("updated").textContent = "检测失败";
    state.events.unshift({ time: clock(), text: "检测失败：" + err.message, tone: "off" });
    renderEvents();
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
        render(data.services || []);
      })
      .catch(fail);
  }

  var COMMANDS = [
    "pnpm dev",
    "pnpm api:generate",
    "pnpm lint",
    "pnpm --filter @starter/server test:e2e",
    "pnpm --filter @starter/server test:rls",
    "docker compose up -d"
  ];

  function renderCommands() {
    var box = $("cmd-rows");
    COMMANDS.forEach(function (text) {
      var btn = el("button", "cmd");
      btn.type = "button";
      btn.setAttribute("data-cmd", text);
      btn.append(el("span", null, text), el("span", "copy", "复制"));
      btn.addEventListener("click", function () {
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
      box.append(btn);
    });
  }

  function bindNav() {
    document.querySelectorAll(".nav button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".nav button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var id = btn.getAttribute("data-target");
        if (id === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        var target = $(id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  $("refresh").addEventListener("click", load);
  renderCommands();
  bindNav();
  load();
  setInterval(load, REFRESH_MS);
})();
</script>
</body>
</html>`;
