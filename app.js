import { FIREBASE } from "./firebase-config.js";
const $ = s => document.querySelector(s), root = document.documentElement;
const J = k => JSON.parse(localStorage.getItem(k) || "[]");

/* theme */
root.dataset.theme = localStorage.theme || "teal";
$("#themeBtn").onclick = () => { root.dataset.theme = root.dataset.theme === "teal" ? "rose" : "teal"; localStorage.theme = root.dataset.theme; beep(700, .1); };

/* sound (WebAudio, no files needed) */
let on = localStorage.snd !== "off", ctx;
function beep(f = 440, d = .06, t = "square") {
  if (!on) return;
  try { ctx = ctx || new AudioContext(); const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = t; o.frequency.value = f; g.gain.value = .04; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d); } catch (e) {}
}
const sb = $("#sndBtn"), lbl = () => sb.textContent = on ? "SOUND: ON" : "SOUND: OFF"; lbl();
sb.onclick = () => { on = !on; localStorage.snd = on ? "on" : "off"; lbl(); beep(880); };
document.addEventListener("click", e => { if (e.target.closest("a,button")) beep(520, .05); });

/* typing intro */
const words = "sudo reveal --layers  # the code, the story, the bones beneath", ty = $("#typed");
if (matchMedia("(prefers-reduced-motion: reduce)").matches) ty.textContent = words;
else { let i = 0; const id = setInterval(() => { ty.textContent = words.slice(0, ++i); if (i >= words.length) clearInterval(id); }, 55); }

/* drifting dust */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const c = $("#rain"), x = c.getContext("2d"); let p = [];
  const rs = () => { c.width = innerWidth; c.height = innerHeight; p = Array.from({ length: 90 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.6 + .3, v: Math.random() * .4 + .1 })); }; rs(); addEventListener("resize", rs);
  setInterval(() => { x.clearRect(0, 0, c.width, c.height); x.fillStyle = getComputedStyle(root).getPropertyValue("--dust");
    p.forEach(d => { d.x += d.v; d.y -= d.v * .4; if (d.x > c.width) d.x = 0; if (d.y < 0) d.y = c.height; x.beginPath(); x.arc(d.x, d.y, d.r, 0, 6.3); x.fill(); }); }, 50);
}

/* data layer: Firebase if configured, otherwise demo mode (this browser only) */
let db, fs;
if (FIREBASE.apiKey && !FIREBASE.apiKey.startsWith("PASTE")) {
  try {
    const v = "https://www.gstatic.com/firebasejs/10.12.2/";
    const app = await import(v + "firebase-app.js"); fs = await import(v + "firebase-firestore.js");
    db = fs.getFirestore(app.initializeApp(FIREBASE));
  } catch (e) { console.warn("Firebase failed, demo mode", e); db = null; }
}
const list = (el, items, fmt) => { el.textContent = ""; items.forEach(it => { const l = document.createElement("li"); fmt(l, it); el.append(l); }); };

/* visitor counter (counts once per browser tab session) */
(async () => {
  let n = null;
  try {
    if (db) { const r = fs.doc(db, "meta", "visits");
      if (!sessionStorage.v) { await fs.setDoc(r, { count: fs.increment(1) }, { merge: true }); sessionStorage.v = 1; }
      n = (await fs.getDoc(r)).data().count;
    } else { n = +localStorage.vc || 0; if (!sessionStorage.v) { n++; localStorage.vc = n; sessionStorage.v = 1; } }
  } catch (e) { console.warn(e); }
  const t = n == null ? "------" : String(n).padStart(6, "0");
  $("#visits").textContent = t; $("#visits2").textContent = t;
})();

/* scoreboard (one per game) */
const COL = { snake: "snake", term: "scores" }, LS = { snake: "sn", term: "sc" };
let cur = "snake", last = 0, lastGame = "snake";
async function showBoard() {
  let s = [];
  if (db) { try { s = (await fs.getDocs(fs.query(fs.collection(db, COL[cur]), fs.orderBy("score", "desc"), fs.limit(10)))).docs.map(d => d.data()); } catch (e) {} }
  else s = J(LS[cur]);
  const b = $("#board");
  if (!s.length) { b.textContent = ""; const l = document.createElement("li"); l.textContent = "no scores yet"; b.append(l); return; }
  list(b, s, (l, r) => l.textContent = `${r.name} — ${r.score}`);
}
function finish(game, score) { if (!score) return; last = score; lastGame = game; $("#saveForm").hidden = false; $("#pname").focus(); }
$("#saveForm").onsubmit = async e => {
  e.preventDefault(); const name = $("#pname").value.trim().slice(0, 20); if (!name || !last) return;
  if (db) { try { await fs.addDoc(fs.collection(db, COL[lastGame]), { name, score: last }); } catch (err) { console.warn(err); } }
  else { const a = J(LS[lastGame]); a.push({ name, score: last }); a.sort((p, q) => q.score - p.score); localStorage.setItem(LS[lastGame], JSON.stringify(a.slice(0, 10))); }
  last = 0; $("#saveForm").hidden = true; beep(880, .15); showBoard();
};
document.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
  cur = b.dataset.g; $("#snakeBox").hidden = cur !== "snake"; $("#termBox").hidden = cur !== "term"; $("#saveForm").hidden = true; last = 0;
  document.querySelectorAll("[data-g]").forEach(x => x.setAttribute("aria-pressed", x === b)); snInit(); showBoard();
});

/* snake */
const cv = $("#snake"), g2 = cv.getContext("2d"), N = 18, S = cv.width / N, DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
let sn, dir, nd, food, sc, alive, tick, msg;
function snInit() { clearInterval(tick); sn = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]; dir = nd = { x: 1, y: 0 }; food = { x: 13, y: 9 }; sc = 0; alive = false; msg = "PRESS START"; $("#sscore").textContent = 0; draw(); }
function snStart() { snInit(); alive = true; last = 0; $("#saveForm").hidden = true; place(); tick = setInterval(step, 120); draw(); }
function place() { do { food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } while (sn.some(s => s.x === food.x && s.y === food.y)); }
function step() {
  dir = nd; const h = { x: sn[0].x + dir.x, y: sn[0].y + dir.y };
  if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || sn.some(s => s.x === h.x && s.y === h.y)) { alive = false; clearInterval(tick); msg = "GAME OVER: " + sc; beep(120, .4, "sawtooth"); draw(); finish("snake", sc); return; }
  sn.unshift(h);
  if (h.x === food.x && h.y === food.y) { sc += 10; $("#sscore").textContent = sc; beep(760, .08); place(); } else sn.pop();
  draw();
}
function draw() {
  const cs = getComputedStyle(root); g2.fillStyle = "#0a090b"; g2.fillRect(0, 0, cv.width, cv.height);
  g2.fillStyle = cs.getPropertyValue("--acc2"); g2.beginPath(); g2.arc(food.x * S + S / 2, food.y * S + S / 2, S / 2 - 3, 0, 6.3); g2.fill();
  sn.forEach((s, i) => { g2.fillStyle = i ? cs.getPropertyValue("--acc") : cs.getPropertyValue("--fg"); g2.fillRect(s.x * S + 1, s.y * S + 1, S - 2, S - 2); });
  if (!alive) { g2.fillStyle = "rgba(10,9,11,.7)"; g2.fillRect(0, 150, cv.width, 60); g2.fillStyle = cs.getPropertyValue("--fg"); g2.font = "bold 24px monospace"; g2.textAlign = "center"; g2.fillText(msg, cv.width / 2, 188); }
}
function turn(x, y) { if (!alive || (x === -dir.x && y === -dir.y)) return; nd = { x, y }; }
$("#snStart").onclick = snStart;
document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => turn(...DIR[b.dataset.d]));
addEventListener("keydown", e => {
  const k = { ArrowUp: "u", w: "u", ArrowDown: "d", s: "d", ArrowLeft: "l", a: "l", ArrowRight: "r", d: "r" }[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k || cur !== "snake" || !alive || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; e.preventDefault(); turn(...DIR[k]);
});
let tx, tY;
cv.addEventListener("touchstart", e => { tx = e.touches[0].clientX; tY = e.touches[0].clientY; }, { passive: true });
cv.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - tY; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; turn(...DIR[Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u")]); });

/* hack the terminal */
const out = $("#out"), inp = $("#guess"); let code, tries, t0, over;
const say = (t, c) => { const p = document.createElement("p"); p.textContent = t; if (c) p.className = c; out.append(p); out.scrollTop = out.scrollHeight; };
function start() {
  code = [...Array(10).keys()].sort(() => Math.random() - .5).slice(0, 4).join("");
  tries = 8; t0 = Date.now(); over = false; out.textContent = ""; say("> ACCESS DENIED. Crack the 4-digit code."); $("#tries").textContent = tries; inp.disabled = false;
  if (cur === "term") { $("#saveForm").hidden = true; last = 0; inp.focus(); }
}
$("#restart").onclick = start;
$("#guessForm").onsubmit = e => {
  e.preventDefault(); if (over) return;
  const g = inp.value.trim(); inp.value = "";
  if (!/^\d{4}$/.test(g) || new Set(g).size < 4) { say("> INVALID: enter 4 different digits.", "bad"); beep(150, .15, "sawtooth"); return; }
  tries--; let h = 0, n = 0;
  [...g].forEach((c, i) => { if (c === code[i]) h++; else if (code.includes(c)) n++; });
  say(`> ${g}   HIT:${h}  NEAR:${n}`); beep(300 + h * 150); $("#tries").textContent = tries;
  if (h === 4) {
    over = true; const s = tries * 100 + Math.max(0, 120 - Math.round((Date.now() - t0) / 1000)) * 5;
    say(`> ACCESS GRANTED. Score: ${s}`, "good"); [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, .12), i * 120));
    inp.disabled = true; finish("term", s);
  } else if (tries === 0) { over = true; say(`> LOCKED OUT. The code was ${code}.`, "bad"); beep(120, .4, "sawtooth"); inp.disabled = true; }
};

/* guestbook */
async function showReviews() {
  let r = [];
  if (db) { try { r = (await fs.getDocs(fs.query(fs.collection(db, "reviews"), fs.orderBy("t", "desc"), fs.limit(20)))).docs.map(d => d.data()); } catch (e) {} }
  else r = J("rv");
  const ul = $("#reviews");
  if (!r.length) { ul.textContent = ""; const l = document.createElement("li"); l.className = "dim"; l.textContent = "no messages yet. be the first."; ul.append(l); return; }
  list(ul, r, (l, x) => { const b = document.createElement("b"); b.textContent = x.name; l.append(b, document.createElement("br"), document.createTextNode(x.msg)); });
}
$("#revForm").onsubmit = async e => {
  e.preventDefault(); const name = $("#rname").value.trim().slice(0, 30), msg = $("#rmsg").value.trim().slice(0, 300); if (!name || !msg) return;
  if (db) { try { await fs.addDoc(fs.collection(db, "reviews"), { name, msg, t: fs.serverTimestamp() }); } catch (err) { console.warn(err); } }
  else { const a = J("rv"); a.unshift({ name, msg }); localStorage.rv = JSON.stringify(a.slice(0, 20)); }
  e.target.reset(); beep(880, .15); showReviews();
};

/* copy buttons (mailto/tel links do nothing without a mail or phone app) */
document.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => {
  const t = b.dataset.copy; let ok = true;
  try { await navigator.clipboard.writeText(t); } catch (e) { const i = document.createElement("textarea"); i.value = t; document.body.append(i); i.select(); try { ok = document.execCommand("copy"); } catch (_) { ok = false; } i.remove(); }
  b.textContent = ok ? "copied!" : "select and copy"; setTimeout(() => b.textContent = "copy", 1800);
});

start(); snInit(); showBoard(); showReviews();
