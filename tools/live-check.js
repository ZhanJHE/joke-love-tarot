/* 线上自检：node tools/live-check.js [url]
 * 直接调用 tools/check-pages.js 指向线上地址，检查全站页面 + 截图。
 */
const { spawnSync } = require("child_process");
const path = require("path");

const LIVE = process.argv[2] || "https://zhanjhe.github.io/joke-love-tarot/";
const script = path.join(__dirname, "check-pages.js");

const r = spawnSync(process.execPath, [script, LIVE], { stdio: "inherit" });
process.exit(r.status === null ? 1 : r.status);
