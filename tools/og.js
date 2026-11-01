/* 生成分享缩略图：node tools/og.js → assets/og.png（1200×630）
 * 用本机 Chrome 无头模式截封面，微信/QQ 分享时会用它当缩略图。
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9334;
const ROOT = path.join(__dirname, "..");
const FILE_URL = "file:///" + path.join(ROOT, "index.html").replace(/\\/g, "/");
const OUT = path.join(ROOT, "assets", "og.png");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, "--disable-gpu",
    "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--user-data-dir=" + path.join(process.env.TEMP, "dsh-og-profile"),
    "--window-size=1200,630", "about:blank"
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
      width: 1200, height: 630, deviceScaleFactor: 1, mobile: false
    });
    await send("Page.navigate", { url: FILE_URL });
    await sleep(1400);
    // 缩略图里不需要页脚小字，避免被裁
    await send("Runtime.evaluate", {
      expression: "(function(){ var f=document.querySelector('.home-foot'); if(f) f.style.display='none'; return 1; })()"
    });
    await sleep(200);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, Buffer.from(data, "base64"));
    console.log("已生成", path.relative(ROOT, OUT));
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error("失败：", e.message); process.exit(1); });
