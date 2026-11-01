/* 全站自检：node tools/check-pages.js [baseUrl]
 *
 * 无头 Chrome 依次打开首页、关于、7 个游戏，做结构断言和一次交互冒烟，
 * 收集 console 报错与未捕获异常，每页截图到 开发文档/预览/站点/。
 * 不传参数时用本地 file://，传线上地址就检查线上。
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9336;
const ROOT = path.join(__dirname, "..");

const arg = process.argv[2] || "";
const FILE_BASE = "file:///" + ROOT.replace(/\\/g, "/") + "/";
const BASE = arg || FILE_BASE;
const IS_REMOTE = /^https?:/i.test(BASE);
const OUT = path.join(ROOT, "开发文档", "预览", IS_REMOTE ? "站点-线上" : "站点");
// file:// 下目录不会自动加载 index.html，统一补上文件名
const url = (p) => BASE + p + (p === "" || p.endsWith("/") ? "index.html" : "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 每个页面：进入后等一会儿，跑断言，最后截图 */
const CASES = [
  {
    name: "01-home",
    path: "",
    label: "首页",
    async run(ev) {
      const n = await ev("document.querySelectorAll('.card').length");
      if (n !== 8) throw new Error("卡片数 " + n + "，应为 8");
      const links = await ev("document.querySelectorAll('a.card').length");
      if (links !== 8) throw new Error("可点卡片数 " + links + "，应为 8");
      const last = await ev("document.querySelectorAll('.card')[7].getAttribute('href')");
      if (!/about/.test(last)) throw new Error("右下角不是关于：" + last);
      const names = await ev("Array.from(document.querySelectorAll('.card-name')).map(e=>e.textContent).join(' / ')");
      console.log("   卡片：" + names);
    }
  },
  {
    name: "02-about",
    path: "about/",
    label: "关于",
    async run(ev) {
      const prose = await ev("!!document.querySelector('.prose')");
      if (!prose) throw new Error("缺少正文容器");
      const links = await ev("document.querySelectorAll('.prose a').length");
      if (links < 6) throw new Error("正文里的链接偏少：" + links);
      const qr = await ev("(document.querySelector('.donate-qr')||{}).getAttribute ? document.querySelector('.donate-qr').getAttribute('src') : ''");
      if (!/pay\.png/.test(qr || "")) throw new Error("赞赏码图没挂上");
      // 图是懒加载的，先滚到它那里再判断有没有真的解码出来
      await ev("document.querySelector('.donate-qr').scrollIntoView({block:'center'})");
      await sleep(700);
      const loaded = await ev("(function(){var i=document.querySelector('.donate-qr');return !!(i && i.complete && i.naturalWidth>0);})()");
      if (!loaded) throw new Error("赞赏码图没加载出来");
    }
  },
  {
    name: "03-tetris",
    path: "tetris/",
    label: "俄罗斯方块",
    async run(ev) {
      const w = await ev("document.getElementById('board').width");
      if (!w) throw new Error("画布没有尺寸");
      await ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))");
      await sleep(150);
      await ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}))");
      await sleep(150);
      const hud = await ev("document.getElementById('score').textContent");
      if (hud === null) throw new Error("分数栏缺失");
    }
  },
  {
    name: "04-wheel",
    path: "wheel/",
    label: "恋爱转盘",
    async run(ev) {
      const w = await ev("document.getElementById('wheel').width");
      if (!w) throw new Error("画布没有尺寸");
      await ev("document.getElementById('spin').click()");
      await sleep(4600);
      const res = await ev("document.getElementById('resText').textContent");
      if (!res) throw new Error("转完没有出结果");
      console.log("   转盘结果：" + res);
    }
  },
  {
    name: "05-tarot",
    path: "tarot/",
    label: "恋爱塔罗",
    async run(ev) {
      const n = await ev("QUIZ.length");
      if (n !== 24) throw new Error("题目数 " + n);
      const cards = await ev("Object.keys(CARDS).length");
      if (cards !== 8) throw new Error("牌面数 " + cards);
      const back = await ev("!!document.querySelector('.cover-back')");
      if (!back) throw new Error("缺少返回合集的入口");
      const donate = await ev("!!document.querySelector('.donate')");
      if (donate) throw new Error("赞赏码还在，应该先屏蔽");
    }
  },
  {
    name: "06-2048",
    path: "2048/",
    label: "2048",
    async run(ev) {
      const cells = await ev("document.querySelectorAll('.cell').length");
      if (cells !== 16) throw new Error("格子数 " + cells);
      const before = await ev("document.querySelectorAll('.cell:not(:empty)').length");
      if (before !== 2) throw new Error("开局数字块数不对：" + before);
      // 单个方向可能刚好贴着边不动，四个方向都试一遍
      for (const key of ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"]) {
        await ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'" + key + "',bubbles:true}))");
        await sleep(160);
      }
      const after = await ev("document.querySelectorAll('.cell:not(:empty)').length");
      if (after < 3) throw new Error("走了四步还是 " + after + " 块数字，没生成新块");
    }
  },
  {
    name: "07-memory",
    path: "memory/",
    label: "记忆翻牌",
    async run(ev) {
      const n = await ev("document.querySelectorAll('.mem-card').length");
      if (n !== 16) throw new Error("牌数 " + n);
      await ev("document.querySelectorAll('.mem-card')[0].click()");
      await sleep(120);
      await ev("document.querySelectorAll('.mem-card')[1].click()");
      await sleep(200);
      const flipped = await ev("document.querySelectorAll('.mem-card.flipped,.mem-card.matched').length");
      if (flipped < 1) throw new Error("点击后没有翻面");
      const moves = await ev("document.getElementById('moves').textContent");
      if (moves !== "1") throw new Error("步数没记上：" + moves);
    }
  },
  {
    name: "08-snake",
    path: "snake/",
    label: "贪吃蛇",
    async run(ev) {
      const w = await ev("document.getElementById('board').width");
      if (!w) throw new Error("画布没有尺寸");
      await ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))");
      await sleep(500);
      const score = await ev("document.getElementById('score').textContent");
      if (score === null) throw new Error("分数栏缺失");
    }
  },
  {
    name: "09-minesweeper",
    path: "minesweeper/",
    label: "扫雷",
    async run(ev) {
      const n = await ev("document.querySelectorAll('.ms-cell').length");
      if (n !== 81) throw new Error("格子数 " + n);
      await ev("document.querySelectorAll('.ms-cell')[40].click()");
      await sleep(250);
      const open = await ev("document.querySelectorAll('.ms-cell.open').length");
      if (open < 1) throw new Error("点开后没有挖开的格子");
      const boom = await ev("document.querySelectorAll('.ms-cell.boom').length");
      if (boom > 0) throw new Error("第一次点击就踩雷了");
      console.log("   一挖挖开 " + open + " 格");
    }
  }
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log("目标：" + BASE);

  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${PORT}`, "--disable-gpu",
    "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--user-data-dir=" + path.join(process.env.TEMP, "dsh-check-profile"),
    "--window-size=390,900", "about:blank"
  ], { stdio: "ignore" });

  let ws;
  let failures = 0;

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

    ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    let errors = [];

    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
      if (m.method === "Runtime.exceptionThrown") {
        errors.push(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description
          || m.params.exceptionDetails.text);
      }
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
        errors.push(m.params.args.map((a) => a.value || a.description || "").join(" "));
      }
    });

    await new Promise((res, rej) => {
      ws.addEventListener("open", res);
      ws.addEventListener("error", rej);
    });

    const send = (method, params) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result)));
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });

    const ev = async (expr, awaitPromise) => {
      const r = await send("Runtime.evaluate", {
        expression: expr, awaitPromise: !!awaitPromise, returnByValue: true, userGesture: true
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || "evaluate 失败");
      return r.result && r.result.value;
    };

    const shot = async (name) => {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(data, "base64"));
    };

    for (const c of CASES) {
      errors = [];
      const target_ = url(c.path);
      await send("Page.navigate", { url: target_ });
      await sleep(IS_REMOTE ? 2200 : 1100);

      let ok = true;
      let msg = "";
      try {
        await c.run(ev);
      } catch (e) {
        ok = false;
        msg = e.message;
      }

      const hardErrors = errors.filter((e) => e && !/favicon/i.test(e));
      if (hardErrors.length) {
        ok = false;
        msg = (msg ? msg + " / " : "") + "页面报错：" + hardErrors[0].split("\n")[0];
      }

      await shot(c.name);
      console.log((ok ? "✓ " : "✗ ") + c.label + (ok ? "" : "  → " + msg));
      if (!ok) failures++;
    }

    // 关于页滚到底，确认赞赏码位置
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await send("Page.navigate", { url: url("about/") });
    await sleep(1200);
    await ev("window.scrollTo(0, document.body.scrollHeight)");
    await sleep(400);
    await shot("02b-about-donate");
    console.log("✓ 关于页底部截图");

    // 首页另截一张桌面尺寸
    await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: url("") });
    await sleep(1000);
    await shot("00-home-desktop");
    console.log("✓ 首页桌面截图");

    // 老分享链接：根路径 + ?r=牌面，应转发到 tarot 并直接显示结果
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await send("Page.navigate", { url: url("") + "?r=moon" });
    await sleep(1500);
    const landed = await ev("location.pathname + location.search");
    const shown = await ev("document.querySelector('#resName') ? document.querySelector('#resName').textContent : ''");
    const okRedirect = /tarot/.test(landed) && shown === "月亮";
    console.log((okRedirect ? "✓ " : "✗ ") + "老链接转发 → " + landed + " 显示：" + shown);
    if (!okRedirect) failures++;
    await shot("10-old-link-redirect");

    ws.close();
  } finally {
    if (ws) { try { ws.close(); } catch (e) {} }
    chrome.kill();
  }

  console.log(failures ? `\n${failures} 个页面有问题` : "\n全部通过");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("失败：" + e.message);
  process.exit(1);
});
