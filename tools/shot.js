/* 塔罗测评专项截图：node tools/shot.js
 * 用本机 Chrome 的无头模式跑一遍问答流程并截图，输出到 开发文档/预览/。
 * 全站页面检查见 tools/check-pages.js。只用于开发验证，不参与部署。
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "开发文档", "预览");
const FILE_URL = "file:///" + path.join(ROOT, "tarot", "index.html").replace(/\\/g, "/");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + path.join(process.env.TEMP, "dsh-shot-profile"),
    "--window-size=560,900",
    "about:blank"
  ], { stdio: "ignore" });

  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(250);
      try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        target = list.find((t) => t.type === "page");
      } catch (e) { /* 还没起来 */ }
    }
    if (!target) throw new Error("连不上 Chrome 调试端口");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 0;
    const pending = new Map();
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    });
    await new Promise((res, rej) => {
      ws.addEventListener("open", res);
      ws.addEventListener("error", rej);
    });

    const send = (method, params) => new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result)));
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });

    await send("Page.enable");
    await send("Runtime.enable");

    const evaluate = async (expression, awaitPromise) => {
      const r = await send("Runtime.evaluate", {
        expression, awaitPromise: !!awaitPromise, returnByValue: true, userGesture: true
      });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result && r.result.value;
    };

    const goto = async (url) => {
      await send("Page.navigate", { url });
      await sleep(900);
    };

    const shot = async (name) => {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const file = path.join(OUT, name);
      fs.writeFileSync(file, Buffer.from(data, "base64"));
      console.log("截图", name);
    };

    // 1. 封面
    await goto(FILE_URL);
    await shot("01-cover.png");

    // 2. 答题页
    await evaluate("document.querySelector('#startBtn').click()");
    await sleep(700);
    await shot("02-quiz.png");

    // 3. 按固定随机种子选答案，跑完 24 题 → 结果页（避免每题都选第一个造成八张牌全部并列）
    await evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      let seed = 20261101;
      const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let i = 0; i < 30; i++) {
        const opts = document.querySelectorAll('.opt');
        if (!opts.length) break;
        opts[Math.floor(rnd() * opts.length)].click();
        await wait(420);
        if (document.querySelector('#result').classList.contains('active')) break;
      }
      return document.querySelector('#resName').textContent;
    })()`, true);
    await sleep(900);
    await shot("03-result.png");
    console.log("结果牌面：", await evaluate("document.querySelector('#resName').textContent"));
    console.log("得分：", await evaluate("document.querySelector('#chart').textContent.replace(/\\\\s+/g,' ')"));

    // 3b. 结果页滚到底：八维图、配对、按钮
    await evaluate("document.querySelector('.res-wrap').scrollTop = 99999");
    await sleep(400);
    await shot("03b-result-bottom.png");

    // 4. 图鉴
    await evaluate("document.querySelector('#galleryBtn').click()");
    await sleep(600);
    await shot("04-gallery.png");

    // 5. 分享链接还原
    await goto(FILE_URL + "?r=sun");
    await shot("05-shared.png");

    // 6. 控制台报错收集
    const errs = await evaluate("window.__errs || []");
    console.log("页面错误：", JSON.stringify(errs));

    // 7. 手机尺寸再跑一遍（390 × 844）
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true
    });
    await goto(FILE_URL);
    await shot("06-mobile-cover.png");
    await evaluate("document.querySelector('#startBtn').click()");
    await sleep(700);
    await shot("07-mobile-quiz.png");
    await evaluate(`(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      let seed = 20261101;
      const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let i = 0; i < 30; i++) {
        const opts = document.querySelectorAll('.opt');
        if (!opts.length) break;
        opts[Math.floor(rnd() * opts.length)].click();
        await wait(420);
        if (document.querySelector('#result').classList.contains('active')) break;
      }
    })()`, true);
    await sleep(800);
    await shot("08-mobile-result.png");
    await evaluate("document.querySelector('.res-wrap').scrollTop = 99999");
    await sleep(500);
    await shot("09-mobile-result-bottom.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((e) => {
  console.error("失败：", e.message);
  process.exit(1);
});
