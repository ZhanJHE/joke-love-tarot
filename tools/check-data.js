/* 数据自检：node tools/check-data.js
 * 校验题库完整性、牌面均衡、SVG 生成可用。不依赖浏览器。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, Math, Object, Array, JSON };
vm.createContext(sandbox);
for (const f of ["tarot/assets/js/data.js", "tarot/assets/js/art.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
}

// 顶层 const 不挂在 context 对象上，用表达式取回来
const api = vm.runInContext("({ CARDS, QUIZ, DIMS, COPY, cardSVG, cardBackSVG, MOTIFS })", sandbox);
const { CARDS, QUIZ, DIMS, COPY, cardSVG, cardBackSVG, MOTIFS } = api;
const errors = [];
const warn = [];

if (QUIZ.length !== 24) warn.push(`题目数量是 ${QUIZ.length}，原设计是 24`);

const counts = Object.fromEntries(Object.keys(CARDS).map((k) => [k, 0]));
let optionTotal = 0;

QUIZ.forEach((q, i) => {
  if (!q.label || !q.title) errors.push(`第 ${i + 1} 题缺 label 或 title`);
  if (q.opts.length !== 3) errors.push(`第 ${i + 1} 题选项数是 ${q.opts.length}`);
  q.opts.forEach(([text, key], j) => {
    optionTotal++;
    if (!text || !text.trim()) errors.push(`第 ${i + 1} 题第 ${j + 1} 个选项没文案`);
    if (!CARDS[key]) errors.push(`第 ${i + 1} 题第 ${j + 1} 个选项指向不存在的牌面：${key}`);
    else counts[key]++;
  });
  const keys = q.opts.map((o) => o[1]);
  if (new Set(keys).size !== new Set(q.opts.map((o) => o[1])).size) errors.push(`第 ${i + 1} 题有重复牌面`);
});

Object.entries(counts).forEach(([k, v]) => {
  const expect = optionTotal / Object.keys(CARDS).length;
  if (v !== expect) warn.push(`牌面 ${CARDS[k].n} 出现 ${v} 次，均衡应为 ${expect}`);
});

Object.entries(CARDS).forEach(([k, c]) => {
  ["n", "e", "t", "c", "c2", "d", "pair", "combo", "buddy", "buddyWhy"].forEach((f) => {
    if (!c[f]) errors.push(`${k} 缺字段 ${f}`);
  });
  if (c.tags.length !== 3) warn.push(`${c.n} 的标签不是 3 个`);
  if (c.pair && !CARDS[c.pair]) errors.push(`${k} 的 pair 指向不存在：${c.pair}`);
  if (c.buddy && !CARDS[c.buddy]) errors.push(`${k} 的 buddy 指向不存在：${c.buddy}`);
  if (c.pair && CARDS[c.pair] && CARDS[c.pair].pair !== k) warn.push(`${c.n} 与 ${CARDS[c.pair].n} 的配对不是双向的`);
});

DIMS.forEach(([k]) => { if (!CARDS[k]) errors.push(`DIMS 指向不存在：${k}`); });
if (DIMS.length !== Object.keys(CARDS).length) warn.push("DIMS 数量和牌面数量不一致");

Object.keys(CARDS).forEach((k) => {
  const svg = cardSVG(k);
  if (!svg.startsWith("<svg")) errors.push(`${k} 生成的 SVG 不合法`);
  if (!MOTIFS[k]) errors.push(`${k} 缺插画`);
  if (/NaN|undefined/.test(svg)) errors.push(`${k} 的 SVG 里有 NaN/undefined`);
});
if (/NaN|undefined/.test(cardBackSVG())) errors.push("牌背 SVG 里有 NaN/undefined");
if (!COPY.title || !COPY.start) errors.push("COPY 文案不完整");

const lines = [];
lines.push(`题目 ${QUIZ.length} 道，选项 ${optionTotal} 个`);
lines.push("牌面分布：" + Object.entries(counts).map(([k, v]) => `${CARDS[k].n} ${v}`).join(" / "));
lines.push(errors.length ? `错误 ${errors.length} 条` : "错误 0 条");
warn.forEach((w) => lines.push("提醒：" + w));
errors.forEach((e) => lines.push("错误：" + e));
console.log(lines.join("\n"));
process.exit(errors.length ? 1 : 0);
