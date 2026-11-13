import { FIREBASE } from "./firebase-config.js";
const $ = s => document.querySelector(s), root = document.documentElement;
const J = k => JSON.parse(localStorage.getItem(k) || "[]");

/* theme */
root.dataset.theme = localStorage.theme || "matrix";
$("#themeBtn").onclick = () => { root.dataset.theme = root.dataset.theme === "matrix" ? "neon" : "matrix"; localStorage.theme = root.dataset.theme; beep(700, .1); };

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
const words = "whoami && cat roles.txt  # cse student | film director | poet", ty = $("#typed");
if (matchMedia("(prefers-reduced-motion: reduce)").matches) ty.textContent = words;
else { let i = 0; const id = setInterval(() => { ty.textContent = words.slice(0, ++i); if (i >= words.length) clearInterval(id); }, 55); }

/* matrix rain */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const c = $("#rain"), x = c.getContext("2d"); let drops;
  const rs = () => { c.width = innerWidth; c.height = innerHeight; drops = Array(Math.floor(c.width / 16)).fill(1); }; rs(); addEventListener("resize", rs);
  setInterval(() => { x.fillStyle = "rgba(0,0,0,.08)"; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = getComputedStyle(root).getPropertyValue("--rain"); x.font = "14px monospace";
    drops.forEach((y, i) => { x.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), i * 16, y * 16); drops[i] = y * 16 > c.height && Math.random() > .975 ? 0 : y + 1; }); }, 60);
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

/* scoreboard */
async function scores() {
  if (db) { try { return (await fs.getDocs(fs.query(fs.collection(db, "scores"), fs.orderBy("score", "desc"), fs.limit(10)))).docs.map(d => d.data()); } catch (e) { return []; } }
  return J("sc");
}
async function showBoard() {
  const s = await scores(); const b = $("#board");
  if (!s.length) { b.textContent = ""; const l = document.createElement("li"); l.textContent = "no scores yet"; b.append(l); return; }
  list(b, s, (l, r) => l.textContent = `${r.name} — ${r.score}`);
}

/* game: hack the terminal */
const out = $("#out"), inp = $("#guess"); let code, tries, t0, over, last = 0;
const say = (t, c) => { const p = document.createElement("p"); p.textContent = t; if (c) p.className = c; out.append(p); out.scrollTop = out.scrollHeight; };
function start() {
  code = [...Array(10).keys()].sort(() => Math.random() - .5).slice(0, 4).join("");
  tries = 8; t0 = Date.now(); over = false; last = 0; out.textContent = "";
  say("> ACCESS DENIED. Crack the 4-digit code (no repeated digits).");
  $("#tries").textContent = tries; $("#saveForm").hidden = true; inp.disabled = false; inp.focus();
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
    over = true; last = tries * 100 + Math.max(0, 120 - Math.round((Date.now() - t0) / 1000)) * 5;
    say(`> ACCESS GRANTED. Score: ${last}`, "good"); [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, .12), i * 120));
    inp.disabled = true; $("#saveForm").hidden = false; $("#pname").focus();
  } else if (tries === 0) { over = true; say(`> LOCKED OUT. The code was ${code}.`, "bad"); beep(120, .4, "sawtooth"); inp.disabled = true; }
};
$("#saveForm").onsubmit = async e => {
  e.preventDefault(); const name = $("#pname").value.trim().slice(0, 20); if (!name || !last) return;
  if (db) { try { await fs.addDoc(fs.collection(db, "scores"), { name, score: last }); } catch (err) { console.warn(err); } }
  else { const a = J("sc"); a.push({ name, score: last }); a.sort((p, q) => q.score - p.score); localStorage.sc = JSON.stringify(a.slice(0, 10)); }
  last = 0; $("#saveForm").hidden = true; say("> score saved.", "good"); showBoard();
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

start(); showBoard(); showReviews();
