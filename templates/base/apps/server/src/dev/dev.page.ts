import { API_PREFIX } from "../../../../packages/shared/src/index";

/**
 * 开发导航页（单文件、无构建、无外部依赖）。
 * 数据由 `/api/dev/services` 提供，页面每 5 秒轮询一次。
 */
export const renderDevPage = (): string => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>本地开发服务</title>
<style>
  :root {
    --bg: #f4f1ec;
    --card: #ffffff;
    --ink: #191817;
    --muted: #77726b;
    --line: #e6e1d9;
    --accent: linear-gradient(135deg, #ff6b3d, #ff9d4d);
    --online: #1fb26a;
    --offline: #bdb8b0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(900px 420px at 85% -8%, rgba(255, 138, 76, 0.18), transparent 70%),
      var(--bg);
    color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 56px 24px 48px; }
  .top { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end; justify-content: space-between; }
  .eyebrow {
    margin: 0 0 10px;
    font-size: 11px;
    letter-spacing: 0.18em;
    color: var(--muted);
    text-transform: uppercase;
  }
  h1 { margin: 0; font-size: 34px; font-weight: 650; letter-spacing: -0.02em; }
  .sub { margin: 10px 0 0; color: var(--muted); font-size: 14px; }
  .meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--muted); }
  .meta button {
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--ink);
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }
  .meta button:hover { border-color: #cfc8bd; transform: translateY(-1px); }
  .group { margin-top: 40px; }
  .group-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
  .group-head h3 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; color: var(--muted); }
  .count { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 14px; }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 18px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 1px 0 rgba(25, 24, 23, 0.03);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
  }
  .card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(25, 24, 23, 0.07); }
  .card.offline { background: #faf8f5; }
  .card-head { display: flex; align-items: center; gap: 9px; }
  .card-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .port { margin-left: auto; font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .dot.online { background: var(--online); box-shadow: 0 0 0 4px rgba(31, 178, 106, 0.16); }
  .dot.offline { background: var(--offline); }
  .state { margin: 0; font-size: 12.5px; color: var(--muted); }
  .links { display: flex; flex-wrap: wrap; gap: 8px; }
  .links a {
    text-decoration: none;
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 12.5px;
    border: 1px solid var(--line);
    color: var(--ink);
    transition: border-color 0.15s;
  }
  .links a:hover { border-color: #c9c2b7; }
  .links a.open { border: 0; background: var(--accent); color: #fff; }
  .cmd {
    margin-top: 2px;
    width: 100%;
    text-align: left;
    border: 1px dashed #dcd5ca;
    background: #f7f3ee;
    color: #6b6459;
    border-radius: 10px;
    padding: 8px 10px;
    font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    cursor: copy;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s;
  }
  .cmd:hover { border-color: #c9c2b7; color: var(--ink); }
  .cmd[data-copied="1"] { border-style: solid; border-color: var(--online); color: var(--online); }
  .empty, .error { color: var(--muted); font-size: 14px; }
  .error { color: #d1432b; }
  .foot {
    margin-top: 48px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted);
  }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>
<main class="wrap">
  <header class="top">
    <div>
      <p class="eyebrow">local dev</p>
      <h1>本地开发服务</h1>
      <p class="sub">每 5 秒自动检测；灰色表示未启动，点击命令可复制。</p>
    </div>
    <div class="meta">
      <span id="updated">检测中…</span>
      <button id="refresh" type="button">立即刷新</button>
    </div>
  </header>
  <div id="groups"><p class="empty">正在检测…</p></div>
  <footer class="foot">
    <span>端口约定：server 47100 · client +73 · admin +74 · portal +75</span>
    <span>仅开发环境注册，生产环境返回 404</span>
  </footer>
</main>
<script>
(function () {
  var API = "${API_PREFIX}/dev/services";
  var GROUP_ORDER = ["应用", "依赖服务"];
  var groupsEl = document.getElementById("groups");
  var updatedEl = document.getElementById("updated");
  var refreshEl = document.getElementById("refresh");

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function link(href, label, primary) {
    var a = el("a", primary ? "open" : "link", label);
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    return a;
  }

  function renderCard(svc) {
    var card = el("article", "card " + svc.status);

    var head = el("div", "card-head");
    head.append(el("span", "dot " + svc.status));
    head.append(el("h2", null, svc.name));
    head.append(el("span", "port", ":" + svc.port));
    card.append(head);

    card.append(
      el("p", "state", svc.status === "online" ? "运行中 · " + svc.probe : "未启动 · 探测 " + svc.probe),
    );

    var links = el("div", "links");
    if (svc.url && svc.status === "online") {
      links.append(link(svc.url, "打开 " + svc.url.replace(/^https?:\\/\\//, ""), true));
    }
    (svc.links || []).forEach(function (item) {
      links.append(link(item.href, item.label, false));
    });
    if (links.childNodes.length) card.append(links);

    if (svc.status === "offline") {
      var cmd = el("button", "cmd", svc.command);
      cmd.type = "button";
      cmd.title = "点击复制";
      cmd.addEventListener("click", function () {
        var done = function () {
          cmd.dataset.copied = "1";
          cmd.textContent = "已复制：" + svc.command;
          setTimeout(function () {
            delete cmd.dataset.copied;
            cmd.textContent = svc.command;
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(svc.command).then(done, done);
        } else {
          done();
        }
      });
      card.append(cmd);
    }

    return card;
  }

  function render(services) {
    groupsEl.textContent = "";
    GROUP_ORDER.forEach(function (group) {
      var list = services.filter(function (svc) { return svc.group === group; });
      if (!list.length) return;

      var section = el("section", "group");
      var head = el("div", "group-head");
      head.append(el("h3", null, group));
      var online = list.filter(function (svc) { return svc.status === "online"; }).length;
      head.append(el("span", "count", online + " / " + list.length + " 在线"));
      section.append(head);

      var grid = el("div", "grid");
      list.forEach(function (svc) { grid.append(renderCard(svc)); });
      section.append(grid);
      groupsEl.append(section);
    });
  }

  function load() {
    fetch(API, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        render(data.services || []);
        updatedEl.textContent = "更新于 " + new Date(data.checkedAt).toLocaleTimeString("zh-CN", { hour12: false });
      })
      .catch(function (err) {
        groupsEl.textContent = "";
        groupsEl.append(el("p", "error", "检测失败：" + err.message));
        updatedEl.textContent = "检测失败";
      });
  }

  refreshEl.addEventListener("click", load);
  load();
  setInterval(load, 5000);
})();
</script>
</body>
</html>`;
