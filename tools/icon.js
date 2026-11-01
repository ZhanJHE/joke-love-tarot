/* 生成主屏幕图标：node tools/icon.js → assets/icon-180.png
 * 手机「添加到主屏幕」用这张，内容跟 favicon 一致：深底 + 金色八角星。
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9337;
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "icon-180.png");
const SIZE = 180;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${SIZE}px;height:${SIZE}px;overflow:hidden;background:#2B2533}
  svg{display:block}
</style></head><body>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#2B2533"/>
  <path d="M90 34 L101 79 L146 90 L101 101 L90 146 L79 101 L34 90 L79 79 Z"
        fill="none" stroke="#C9A96A" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="90" cy="90" r="7" fill="#C9A96A"/>
</svg>
</body></html>`;

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, "--disable-gpu",
    "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--user-data-dir=" + path.join(process.env.TEMP, "dsh-icon-profile"),
    `--window-size=${SIZE},${SIZE}`, "about:blank"
  ], { stdio: "ignore" });

  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(250);
      try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        target = list.find((t) => t.type === "page");
      } catch (e) {}
    }
    if (!target) throw new Error("连不上 Chrome 调试端口");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    });
    await new Promise((res, rej) => {
      ws.addEventListener("open", res);
      ws.addEventListener("error", rej);
    });
    const send = (method, params) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });

    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: SIZE, height: SIZE, deviceScaleFactor: 2, mobile: false
    });
    await send("Page.navigate", {
      url: "data:text/html;charset=utf-8," + encodeURIComponent(html)
    });
    await sleep(900);

    const { data } = await send("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, Buffer.from(data, "base64"));
    console.log("已生成", path.relative(ROOT, OUT));
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error("失败：" + e.message); process.exit(1); });
