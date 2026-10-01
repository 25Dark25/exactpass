import { generatePassword, generatePassphrase, generateKey, parseWordlist } from "../src/generate.js";
import { estimate } from "../src/entropy.js";
import { ExactpassError, t } from "../src/i18n.js";

const $ = (id) => document.getElementById(id);
const SCALE = 288; // full scale of the ruler (bits)
let lang = new URLSearchParams(location.search).get("lang") === "es" ? "es" : "en";
let mode = "password", wordlist = null, listHash = "", secret = "", masked = false, clipTimer;
let view = null;      // what the result area shows: { r, minBits } or { error }
let wlMsg = { key: "ui.wl.searching", params: {} };
const T = (key, params) => t(lang, key, params);
const msg = (e) => (e.code ? T(e.code, e.params) : e.message);

const int = (id, errKey) => {
  const v = $(id).value.trim();
  if (v === "") return undefined;
  if (!/^\d+$/.test(v)) throw new ExactpassError(errKey);
  return Number(v);
};
const pos = (id, errKey) => {
  const v = $(id).value.trim();
  if (v === "") return undefined;
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) throw new ExactpassError(errKey);
  return x;
};

function showSecret() {
  $("value").textContent = masked ? "•".repeat(Math.min(secret.length, 64)) : secret;
  $("toggle").textContent = T(masked ? "ui.show" : "ui.hide");
}

function render(r, minBits) {
  secret = r.value; showSecret();
  const est = estimate(r.bits, { rate: pos("rate", "ui.err.rate"), qrate: pos("qrate", "ui.err.qrate"), lang });
  $("fill").style.width = `${Math.min(r.bits / SCALE, 1) * 100}%`;
  $("minmark").style.left = `${Math.min(minBits / SCALE, 1) * 100}%`;
  $("ruler").setAttribute("aria-label", T("ui.ruler", { bits: r.bits.toFixed(1), min: minBits }));
  const detail = r.kind === "password" ? T("ui.d.password", { len: r.length, size: r.alphabetSize })
    : r.kind === "passphrase" ? T("ui.d.passphrase", { words: r.words, size: r.listSize, hash: listHash.slice(0, 16) })
    : T("ui.d.key", { bytes: r.bytes });
  const rows = [
    [T("ui.s.entropy"), `${r.bits.toFixed(2)} bits`],
    [T("ui.s.composition"), detail],
    [T("ui.s.reference"), est.reference],
    [T("ui.s.classical"), T("ui.classical", { log: est.classicalLog2Guesses.toFixed(1), time: est.classicalTime, rate: est.classicalRate.toExponential(0) })],
    [T("ui.s.grover"), T("ui.grover", { log: est.groverLog2Iterations.toFixed(1) }) + (est.groverTime ? T("ui.grover_t", { time: est.groverTime }) : T("ui.grover_hint"))],
    ...r.warnings.map((c) => [T("ui.s.warning"), T(c)]),
  ];
  $("stats").replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v;
    return [dt, dd];
  }));
  $("result").hidden = false; $("error").hidden = true;
}

function refreshView() {
  if (!view) return;
  if (view.error) {
    $("result").hidden = true; secret = "";
    $("error").textContent = msg(view.error); $("error").hidden = false;
  } else {
    try { render(view.r, view.minBits); } catch (e) { view = { error: e }; refreshView(); }
  }
}

function clearResult() { view = null; secret = ""; $("result").hidden = true; $("error").hidden = true; $("note").textContent = ""; }

function applyLang() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = T(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-ph]")) el.placeholder = T(el.dataset.i18nPh);
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", T(el.dataset.i18nLabel));
  $("lang").textContent = lang === "en" ? "ES" : "EN";
  $("lang").lang = lang === "en" ? "es" : "en";
  $("lang").setAttribute("aria-label", T("ui.lang_switch"));
  $("wlstatus").textContent = T(wlMsg.key, wlMsg.params);
  $("note").textContent = "";
  showSecret(); refreshView();
}

function setMode(m) {
  mode = m;
  for (const b of document.querySelectorAll("[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === m));
  for (const p of ["password", "passphrase", "key"]) $(`panel-${p}`).hidden = p !== m;
  clearResult();
}

function generate() {
  clearResult();
  try {
    const minBits = Number($("minbits").value);
    let r;
    if (mode === "password") {
      r = generatePassword({
        length: int("length", "ui.err.length"), minBits,
        useLower: $("lower").checked, useUpper: $("upper").checked, useDigits: $("digits").checked, useSymbols: $("symbols").checked,
        excludeLookalikes: $("lookalikes").checked, requireEach: $("each").checked,
      });
    } else if (mode === "passphrase") {
      if (!wordlist) throw new ExactpassError("ui.wl.needed");
      r = generatePassphrase({ words: int("words", "ui.err.words"), minBits, separator: $("sep").value, capitalize: $("cap").checked, wordlist });
    } else {
      r = generateKey({ bytes: int("bytes", "ui.err.bytes"), format: $("fmt").value, minBits });
    }
    masked = false;
    view = { r, minBits };
  } catch (e) {
    view = { error: e };
  }
  refreshView();
}

async function useList(buf) {
  wordlist = null;
  const list = parseWordlist(new TextDecoder().decode(buf)); // throws on duplicates
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  listHash = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  wordlist = list;
  wlMsg = { key: "ui.wl.loaded", params: { n: list.length, bits: Math.log2(list.length).toFixed(2), hash: listHash.slice(0, 16) } };
  $("wlstatus").textContent = T(wlMsg.key, wlMsg.params);
}

const wlError = (e) => { wlMsg = e.code ? { key: e.code, params: e.params } : { key: "ui.raw", params: { m: e.message } }; $("wlstatus").textContent = T(wlMsg.key, wlMsg.params); };

for (const b of document.querySelectorAll("[data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode));
$("gen").addEventListener("click", generate);
$("toggle").addEventListener("click", () => { masked = !masked; showSecret(); });
$("lang").addEventListener("click", () => { lang = lang === "en" ? "es" : "en"; applyLang(); });
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("input:not([type=file]):not([type=checkbox])")) generate(); });

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(secret);
    $("note").textContent = T("ui.copied");
    clearTimeout(clipTimer);
    clipTimer = setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 30000);
  } catch {
    $("note").textContent = T("ui.copy_blocked");
  }
});

$("wl").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try { await useList(await f.arrayBuffer()); } catch (err) { wlError(err); }
});

applyLang();
fetch("wordlists/eff_large_wordlist.txt")
  .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("missing"))))
  .then(useList)
  .catch((err) => { if (err.message === "missing") { wlMsg = { key: "ui.wl.missing", params: {} }; $("wlstatus").textContent = T(wlMsg.key); } else wlError(err); });
