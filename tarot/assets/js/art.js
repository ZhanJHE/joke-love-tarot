/* 牌面插画：全部是手写的内联 SVG，没有外部图片依赖。
 * 想换成自己的画，替换 MOTIFS 里对应函数返回的 SVG 片段即可，坐标系是 120 × 180。
 */

const ROMAN = {
  moon: "XVIII", sun: "XIX", star: "XVII", priestess: "II",
  empress: "III", lovers: "VI", hermit: "IX", magician: "I"
};

/* 多角星路径 */
function starPath(cx, cy, outer, inner, n, rot) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 180) * ((rot || 0) + (i * 180) / n);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}

/* 太阳十二芒 */
function rays(cx, cy, r1, r2, n) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (Math.PI / 180) * (i * (360 / n) - 90);
    d += `M${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}` +
         `L${(cx + r2 * Math.cos(a)).toFixed(1)} ${(cy + r2 * Math.sin(a)).toFixed(1)}`;
  }
  return d;
}

/* 四角闪光（凹边菱形），比十字更像星 */
function sparkle(cx, cy, r) {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r}` +
         `Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}

/* 牌面图形，坐标 0 0 120 180，可见区大致 x 20..100 y 40..150 */
const MOTIFS = {
  // 月亮：弯月 + 星点 + 水波
  moon: () => `
    <g transform="translate(2,0)">
      <path d="M78 56 A32 32 0 1 0 78 120 A24 24 0 1 1 78 56 Z"/>
    </g>
    <path d="${sparkle(90, 66, 7)}"/>
    <path d="${sparkle(34, 60, 4.5)}"/>
    <path d="M26 132 q8 -7 16 0 t16 0 t16 0 t16 0"/>
    <path d="M26 142 q8 -7 16 0 t16 0 t16 0 t16 0"/>
  `,

  // 太阳：圆 + 芒
  sun: () => `
    <circle cx="60" cy="90" r="21"/>
    <path d="${rays(60, 90, 28, 37, 12)}"/>
    <circle cx="60" cy="90" r="7"/>
  `,

  // 星星：八角星 + 点缀
  star: () => `
    <path d="${starPath(60, 90, 33, 13, 8, -90)}"/>
    <path d="${sparkle(88, 60, 6)}"/>
    <path d="${sparkle(30, 114, 5)}"/>
    <path d="${sparkle(84, 128, 3.5)}"/>
    <path d="${sparkle(32, 62, 3.5)}"/>
  `,

  // 女祭司：双柱 + 拱 + 新月冠
  priestess: () => `
    <path d="M32 70 V140 M88 70 V140"/>
    <path d="M32 70 Q60 38 88 70"/>
    <path d="M40 140 H80"/>
    <path d="M52 96 a8 8 0 1 0 16 0 a11 11 0 0 1 -16 0 Z"/>
    <path d="M28 76 h8 M84 76 h8 M28 134 h8 M84 134 h8"/>
    <path d="M60 112 V128"/>
  `,

  // 皇后：冠 + 果实
  empress: () => `
    <path d="M40 74 L52 88 L60 64 L68 88 L80 74 L80 100 L40 100 Z"/>
    <circle cx="60" cy="124" r="15"/>
    <path d="M60 124 v-9 M60 124 l8 5 M60 124 l-8 5"/>
    <path d="M34 146 h52"/>
  `,

  // 恋人：拱门 + 相交圆 + 心
  lovers: () => `
    <path d="M34 142 V96 A26 26 0 0 1 86 96 V142"/>
    <circle cx="48" cy="114" r="13"/>
    <circle cx="72" cy="114" r="13"/>
    <path d="M60 84 C52 76 42 80 42 88 C42 96 52 101 60 107 C68 101 78 96 78 88 C78 80 68 76 60 84 Z"/>
    <path d="M34 142 h52"/>
  `,

  // 隐者：兜帽 + 提灯 + 杖
  hermit: () => `
    <path d="M60 48 C42 48 36 74 39 104 L81 104 C84 74 78 48 60 48 Z"/>
    <path d="M52 114 h16 v16 h-16 z"/>
    <circle cx="60" cy="122" r="11" stroke-dasharray="2 4"/>
    <path d="M90 66 V146"/>
    <path d="M28 152 h44"/>
  `,

  // 魔术师：无限符号 + 杖 + 台
  magician: () => `
    <circle cx="49" cy="104" r="12"/>
    <circle cx="71" cy="104" r="12"/>
    <path d="M60 62 V140"/>
    <path d="${starPath(60, 56, 12, 4, 4, -90)}"/>
    <path d="M36 140 h48"/>
    <path d="${sparkle(30, 79, 4.5)}"/>
  `
};

const MOTIF_COLOR = key => (CARDS[key] && CARDS[key].c) || "#8A7763";

/* 一张完整的牌 */
function cardSVG(key, cls) {
  const c = CARDS[key];
  return `<svg class="card-art ${cls || ""}" viewBox="0 0 120 180" role="img" aria-label="${c.n}">
    <rect x="1" y="1" width="118" height="178" rx="3" class="ca-bg"/>
    <rect x="6.5" y="6.5" width="107" height="167" rx="1.5" class="ca-in"/>
    <circle cx="12" cy="12" r=".9" class="ca-dot"/><circle cx="108" cy="12" r=".9" class="ca-dot"/>
    <circle cx="12" cy="168" r=".9" class="ca-dot"/><circle cx="108" cy="168" r=".9" class="ca-dot"/>
    <text x="60" y="27" class="ca-roman">${ROMAN[key]}</text>
    <g class="ca-motif" style="color:${c.c}">${MOTIFS[key]()}</g>
    <text x="60" y="164" class="ca-name" style="fill:${c.c2 || c.c}">${c.n}</text>
  </svg>`;
}

/* 牌背：深底 + 金线网格 + 星 */
function cardBackSVG(cls) {
  let dots = "";
  for (let y = 30; y <= 150; y += 12) {
    for (let x = 30; x <= 90; x += 12) {
      dots += `<circle cx="${x}" cy="${y}" r=".8"/>`;
    }
  }
  return `<svg class="card-art ${cls || ""}" viewBox="0 0 120 180" role="img" aria-label="牌背">
    <rect x="1" y="1" width="118" height="178" rx="3" class="cb-bg"/>
    <rect x="6.5" y="6.5" width="107" height="167" rx="1.5" class="cb-in"/>
    <g class="cb-dots">${dots}</g>
    <rect x="16" y="16" width="88" height="148" class="cb-in2"/>
    <path d="${starPath(60, 90, 24, 9, 8, -90)}" class="cb-star"/>
    <circle cx="60" cy="90" r="3" class="cb-core"/>
  </svg>`;
}
