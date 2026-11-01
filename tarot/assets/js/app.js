/* 恋爱塔罗 · 交互逻辑
 * 数据在 data.js，插画在 art.js。这个文件只负责流程、计分、分享。
 */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const screens = {
    cover: $("#cover"),
    quiz: $("#quiz"),
    result: $("#result"),
    gallery: $("#gallery")
  };

  let idx = 0;
  let answers = {};
  let locked = false;
  let currentKey = null;
  let sharedView = false;

  /* ---------- 计分 ---------- */

  function tally() {
    const s = {};
    Object.keys(answers).forEach((i) => {
      const k = answers[i];
      s[k] = (s[k] || 0) + 1;
    });
    return s;
  }

  function pickWinners() {
    const s = tally();
    const rows = Object.entries(s).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return { main: "moon", extras: [], scores: s };
    const top = rows[0][1];
    const tied = rows.filter((r) => r[1] === top).map((r) => r[0]);
    // 并列时随机挑一个当主牌，其余显示为"还带点"
    for (let i = tied.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tied[i], tied[j]] = [tied[j], tied[i]];
    }
    return { main: tied[0], extras: tied.slice(1), scores: s };
  }

  /* ---------- 屏幕切换 ---------- */

  function show(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    if (name === "result") $(".res-wrap").scrollTop = 0;
    if (name === "quiz") $(".q-wrap").scrollTop = 0;
    if (name === "gallery") $(".g-list").scrollTop = 0;
  }

  /* ---------- 答题 ---------- */

  function renderQ() {
    const q = QUIZ[idx];
    locked = false;
    $("#progText").textContent = `${idx + 1} / ${QUIZ.length}`;
    $("#barFill").style.width = `${((idx + 1) / QUIZ.length) * 100}%`;
    $("#prevBtn").style.visibility = idx === 0 ? "hidden" : "visible";
    $("#qLabel").textContent = q.label;
    $("#qTitle").textContent = q.title;
    $("#qArt").innerHTML = cardBackSVG();

    const opts = $("#opts");
    opts.innerHTML = "";
    q.opts.forEach(([text, key]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.innerHTML = `<span class="dot"></span><span>${text}</span>`;
      b.addEventListener("click", () => choose(idx, key, b));
      opts.appendChild(b);
    });

    requestAnimationFrame(() => {
      const wrap = $(".q-wrap");
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(8px)";
      requestAnimationFrame(() => {
        wrap.style.transition = "opacity .3s ease, transform .3s cubic-bezier(.16,1,.3,1)";
        wrap.style.opacity = "1";
        wrap.style.transform = "none";
      });
    });
  }

  function choose(i, key, btn) {
    if (locked) return;
    locked = true;
    answers[i] = key;
    document.querySelectorAll(".opt").forEach((o) => o.classList.remove("pick"));
    btn.classList.add("pick");
    setTimeout(() => {
      if (i < QUIZ.length - 1) {
        idx = i + 1;
        renderQ();
      } else {
        idx = QUIZ.length;
        showResult();
      }
    }, 260);
  }

  function goBack() {
    if (idx === 0) return;
    delete answers[idx - 1];
    delete answers[idx];
    idx = Math.max(0, idx - 1);
    renderQ();
  }

  /* ---------- 结果 ---------- */

  function showResult() {
    const { main, extras, scores } = pickWinners();
    currentKey = main;
    sharedView = false;
    renderResult(main, extras, scores, false);
    show("result");
  }

  function renderResult(key, extras, scores, isShared) {
    const c = CARDS[key];
    const badge = $("#sharedBadge");
    const chartBlock = $(".chart-block");

    screens.result.classList.toggle("shared", !!isShared);
    badge.classList.toggle("show", !!isShared);
    badge.textContent = `${COPY.sharedBadge}「${c.n} · ${c.t}」`;

    $("#banner").style.background =
      `linear-gradient(180deg, ${hexA(c.c, .22)} 0%, ${hexA(c.c, .05)} 58%, transparent 100%)`;
    $("#resArt").innerHTML = cardSVG(key);
    $("#resLabel").textContent = isShared ? "朋友的恋爱牌面" : COPY.resultLabel;
    $("#resName").textContent = c.n;
    $("#resTitle").textContent = "—— " + c.t;
    $("#resDesc").textContent = c.d;
    $("#resTags").innerHTML = c.tags.map((t) => `<span class="tag">${t}</span>`).join("");

    const sub = (extras || []).slice(0, 2);
    if (!isShared && sub.length) {
      $("#subCats").innerHTML = sub
        .map((k) => `<div class="sub-cat">你身上还带点 <b>${CARDS[k].n}</b> 的影子（${CARDS[k].t}）</div>`)
        .join("");
      $("#subCats").style.display = "flex";
    } else {
      $("#subCats").innerHTML = "";
      $("#subCats").style.display = "none";
    }

    const p = CARDS[c.pair];
    const b = CARDS[c.buddy];
    $("#pairLine").innerHTML = `最佳配对：<b>${p.n} · ${p.t}</b>（${c.combo}）`;
    $("#buddyLine").innerHTML = `最佳友伴：<b>${b.n}</b>（${c.buddyWhy}）`;

    if (chartBlock) chartBlock.style.display = isShared ? "none" : "";
    renderChart(scores || {});

    $("#againBtn").textContent = isShared ? COPY.startForShare : COPY.again;
    $("#shareNote").textContent = isShared ? "让朋友也抽一张，看看你们配不配" : COPY.shareNote;
  }

  function renderChart(scores) {
    const max = Math.max(1, ...Object.values(scores));
    $("#chart").innerHTML = DIMS.map(([k, label]) => {
      const v = scores[k] || 0;
      const h = Math.round((v / max) * 100);
      return `<div class="bar-item">
        <div class="bar-track"><div class="bar-fill" style="height:${h}%"></div></div>
        <div class="bar-label">${label}</div>
        <div class="bar-val">${v}</div>
      </div>`;
    }).join("");
  }

  /* ---------- 图鉴 ---------- */

  function renderGallery() {
    const order = DIMS.map((d) => d[0]);
    $("#galleryList").innerHTML = order.map((k) => {
      const c = CARDS[k];
      const p = CARDS[c.pair];
      return `<div class="g-card">
        <div class="g-art">${cardSVG(k)}</div>
        <div class="g-body">
          <div class="g-name">${c.n} · ${c.t}</div>
          <div class="g-sub">${c.e}</div>
          <div class="g-tags">${c.tags.map((t) => `<span class="g-tag">${t}</span>`).join("")}</div>
          <div class="g-desc">${c.d}</div>
          <div class="g-pair">最佳配对：${p.n}（${c.combo}）｜最佳友伴：${CARDS[c.buddy].n}</div>
        </div>
      </div>`;
    }).join("");
  }

  /* ---------- 分享 ---------- */

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function baseUrl() {
    const u = new URL(location.href);
    u.search = "";
    u.hash = "";
    return u.href;
  }

  function resultUrl(key) {
    const u = new URL(baseUrl());
    u.searchParams.set("r", key);
    return u.href;
  }

  function shareText(key) {
    const c = CARDS[key];
    return `我抽到的是「${c.n} · ${c.t}」，你也来抽一张`;
  }

  function copyText(text) {
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(reject);
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  async function onShare() {
    const key = currentKey || "moon";
    const url = resultUrl(key);
    const text = shareText(key);
    if (navigator.share) {
      try {
        await navigator.share({ title: COPY.title, text, url });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      await copyText(`${text} ${url}`);
      alert("已复制，去微信 / 小红书粘贴发送吧");
    } catch (e) {
      alert(`长按复制这个链接：${url}`);
    }
  }

  /* ---------- 启动 ---------- */

  function startQuiz() {
    answers = {};
    idx = 0;
    const u = new URL(location.href);
    if (u.searchParams.has("r")) {
      u.searchParams.delete("r");
      history.replaceState(null, "", u.href);
    }
    renderQ();
    show("quiz");
  }

  function initCover() {
    $(".kicker").textContent = COPY.kicker;
    $(".wordmark").textContent = COPY.wordmark;
    $(".cover-sub").textContent = COPY.sub;
    $("#startBtn").textContent = COPY.start;
    $(".hint").textContent = COPY.hint;
    document.title = COPY.title;
    $("#stage").innerHTML =
      cardBackSVG("stack-1") + cardBackSVG("stack-2") + cardBackSVG("stack-3");
  }

  function boot() {
    initCover();

    $("#startBtn").addEventListener("click", startQuiz);
    $("#prevBtn").addEventListener("click", goBack);
    $("#againBtn").addEventListener("click", startQuiz);
    $("#shareBtn").addEventListener("click", onShare);
    $("#galleryBtn").addEventListener("click", () => {
      renderGallery();
      show("gallery");
    });
    $("#galleryBack").addEventListener("click", () => {
      if (currentKey) show("result");
      else show("cover");
    });

    document.addEventListener("keydown", (e) => {
      if (!screens.quiz.classList.contains("active") || locked) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 3) {
        const btns = document.querySelectorAll(".opt");
        if (btns[n - 1]) btns[n - 1].click();
      } else if (e.key === "ArrowLeft") {
        goBack();
      }
    });

    // 分享进来的链接：?r=moon
    const key = new URL(location.href).searchParams.get("r");
    if (key && CARDS[key]) {
      currentKey = key;
      sharedView = true;
      renderResult(key, [], {}, true);
      show("result");
    } else {
      show("cover");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
