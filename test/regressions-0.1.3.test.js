// Regression tests for problems found in the 0.1.3 audit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGroups, decodeWordlist, generateKey, generatePassphrase, generatePassword, isUniquelyDecodable, parseWordlist } from "../src/generate.js";

const cli = fileURLToPath(new URL("../bin/exactpass.js", import.meta.url));
const serverJs = fileURLToPath(new URL("../serve.js", import.meta.url));
// Self-contained data: the tests must not depend on wordlists/eff_large_wordlist.txt being present.
const SAMPLE = Array.from({ length: 7776 }, (_, i) => `w${i.toString(36)}`); // 7776 unique ASCII words, like the EFF list
/** Writes `words` to a temporary list file, calls fn(path) and removes the file. */
function withListFile(words, fn) {
  const dir = mkdtempSync(join(tmpdir(), "exactpass-"));
  try {
    const file = join(dir, "list.txt");
    writeFileSync(file, words.join("\n") + "\n");
    return fn(file);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
// The CLI's own output is under test: color settings of the terminal running the tests must not reach it
// (Node 24 warns on stderr when FORCE_COLOR and NO_COLOR are both set).
const childEnv = (extra = {}) => {
  const env = { ...process.env, EXACTPASS_LANG: "", ...extra };
  for (const k of ["FORCE_COLOR", "NO_COLOR", "NODE_DISABLE_COLORS"]) delete env[k];
  return env;
};
const run = (args, env = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 10000, env: childEnv(env) });

test("key: format names inherited from Object.prototype are rejected, not used as encoders (fail closed)", () => {
  for (const format of ["constructor", "toString", "isPrototypeOf", "valueOf", "__proto__", "hasOwnProperty"]) {
    assert.throws(() => generateKey({ format }), { code: "err.format" }, format);
    const r = run(["key", "--format", format]);
    assert.equal(r.status, 2, format);
    assert.equal(r.stdout, "", format);
  }
});

test("CLI: mode names inherited from Object.prototype give the normal 'unknown mode' error", () => {
  for (const mode of ["constructor", "__proto__", "toString"]) {
    const r = run([mode, "--length", "5"]);
    assert.equal(r.status, 2, mode);
    assert.equal(r.stdout, "", mode);
    assert.match(r.stderr, /^Error: Unknown mode: /, mode);
  }
});

test("word list: default-ignorable characters that are not control characters are rejected too", () => {
  // U+FE0F variation selector, U+034F grapheme joiner, U+180B Mongolian FVS (marks); U+3164 / U+FFA0 Hangul fillers (letters)
  for (const c of ["\uFE0F", "\u034F", "\u180B", "\u3164", "\uFFA0"]) {
    assert.throws(() => parseWordlist(`abc\nabc${c}\nxyz`), { code: "err.wordlist_chars", params: { line: 2 } }, `U+${c.codePointAt(0).toString(16)}`);
  }
});

test("API: passphrase word lists get the same checks as parseWordlist (types, NFC, invisible characters)", () => {
  const bad = {
    "distinct objects that print the same": Array.from({ length: 7776 }, () => ({})),
    "number and string that print the same": [1, "1"],
    "NFC and NFD forms of the same word": ["caf\u00e9", "cafe\u0301"],
    "invisible variation selector": ["abc", "abc\uFE0F"],
    "empty word": ["", "a"],
    "word with a space": ["ice cream", "tea"],
  };
  for (const [name, wordlist] of Object.entries(bad)) {
    assert.throws(() => generatePassphrase({ wordlist, words: 8, minBits: 1 }), (e) => /^err\.wordlist_/.test(e.code), name);
  }
});

test("API: alphabet and symbol entries must be single code points (multi-character entries make sequences collide)", () => {
  // ["ab","a","b"]: "ab"+"a"+"b" and "a"+"b"+"ab" are the same string, so 27 sequences give only 26 strings
  assert.throws(() => buildGroups({ alphabet: ["ab", "a", "b"] }), { code: "err.alphabet_entry" });
  assert.throws(() => generatePassword({ alphabet: ["ab", "a", "b"], length: 3, minBits: 1, requireEach: false }), { code: "err.alphabet_entry" });
  assert.throws(() => buildGroups({ symbols: ["!!", "@"] }), { code: "err.alphabet_entry" });
  assert.throws(() => buildGroups({ alphabet: [1, 2] }), { code: "err.alphabet_entry" });
  assert.deepEqual(buildGroups({ alphabet: ["x", "y", "\u{1F600}"] }), [["x", "y", "\u{1F600}"]]); // one astral code point is fine
});

test("passphrase: the separator cannot contain line breaks, control, invisible or non-NFC characters", () => {
  const wordlist = ["alpha", "beta", "gamma", "delta"];
  for (const separator of ["\n", "\r\n", "\t", "\u001b[8m", "\u200B", "\uFE0F", "\u2028", "\u2029", "\u0085", "e\u0301"]) {
    assert.throws(() => generatePassphrase({ wordlist, words: 3, minBits: 1, separator }), (e) => /^err\.separator_/.test(e.code), JSON.stringify(separator));
  }
  for (const separator of ["-", " ", "", "_", "\u00B7", ". "]) assert.doesNotThrow(() => generatePassphrase({ wordlist, words: 3, minBits: 1, separator }), JSON.stringify(separator));
  withListFile(SAMPLE, (file) => {
    assert.equal(run(["passphrase", "--wordlist", file, "--separator", "-"]).status, 0); // the list itself is fine
    const r = run(["passphrase", "--wordlist", file, "--separator", "\n"]);
    assert.equal(r.status, 2);
    assert.equal(r.stdout, ""); // the secret must never be split over several lines
    assert.match(r.stderr, /separator/);
  });
});

// Sardinas-Patterson as shipped in 0.1.3 (sequence of whole sets S1, S2, ...): the reference for the new implementation.
function referenceUD(code) {
  const C = new Set(code);
  if (C.size !== code.length || C.has("")) return false;
  let S = new Set();
  for (const v of C) for (let k = 1; k < v.length; k++) if (C.has(v.slice(0, k))) S.add(v.slice(k));
  const seen = new Set();
  while (S.size > 0) {
    for (const x of S) if (C.has(x)) return false;
    const key = [...S].sort().join("\u0000");
    if (seen.has(key)) return true;
    seen.add(key);
    const next = new Set();
    for (const x of S) {
      for (let k = 1; k < x.length; k++) if (C.has(x.slice(0, k))) next.add(x.slice(k));
      for (const c of C) if (c.length > x.length && c.startsWith(x)) next.add(c.slice(x.length));
    }
    S = next;
  }
  return true;
}

test("Sardinas-Patterson: same answer as the 0.1.3 algorithm on random codes", () => {
  let s = 2024;
  const rnd = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s % n; };
  let ud = 0, notUd = 0;
  for (let i = 0; i < 4000; i++) {
    const letters = "abc".slice(0, 2 + rnd(2)), size = 2 + rnd(6), code = new Set();
    while (code.size < size) code.add(Array.from({ length: 1 + rnd(5) }, () => letters[rnd(letters.length)]).join(""));
    const c = [...code], want = referenceUD(c);
    assert.equal(isUniquelyDecodable(c), want, JSON.stringify(c));
    want ? ud++ : notUd++;
  }
  assert.ok(ud > 300 && notUd > 300, `coverage: ${ud} UD, ${notUd} not UD`);
});

test("Sardinas-Patterson: no exponential blow-up on cyclic codes that pass the word-list checks", () => {
  // Words X, X-u1, u1-u2, ..., up-u1 for p = 2, 3, 5, ..., 23: with separator "-" the sets S1, S2, ... cycle with period
  // 2*3*5*...*23 = 223092870. The 0.1.3 algorithm needed 86 s and 1.5 GB, then failed with "Set maximum size exceeded".
  const script = `
    import { parseWordlist, generatePassphrase } from ${JSON.stringify(new URL("../src/generate.js", import.meta.url).href)};
    let cp = 0x4E00; const ch = () => String.fromCodePoint(cp++);
    const words = [];
    for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23]) {
      const X = ch(), u = Array.from({ length: p }, ch);
      words.push(X, X + "-" + u[0]);
      for (let i = 0; i < p; i++) words.push(u[i] + "-" + u[(i + 1) % p]);
    }
    const r = generatePassphrase({ wordlist: parseWordlist(words.join("\\n")), words: 2, minBits: 1 });
    console.log(String(words.length) + " " + JSON.stringify(r.warnings));`; // one string: under FORCE_COLOR a number would be colored
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 10000 });
  assert.equal(r.status, 0, `status ${r.status} after ${Date.now() - t0} ms: ${r.stderr}`);
  assert.equal(r.stdout.trim(), "118 []"); // uniquely decodable: no warning
});

test("CLI: without a mode the usage goes to stderr (stdout stays empty on every error); --help still uses stdout", () => {
  const none = run([]);
  assert.equal(none.status, 2);
  assert.equal(none.stdout, ""); // pw=$(exactpass) must not capture the help text as a password
  assert.match(none.stderr, /exactpass <password\|passphrase\|key>/);
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /exactpass <password\|passphrase\|key>/);
});

test("passphrase: without --words, an unreachable minimum says so instead of blaming the number of words", () => {
  assert.throws(() => generatePassphrase({ wordlist: SAMPLE, minBits: 1000 }), { code: "err.words_unreachable", params: { minBits: 1000, max: 64, size: 7776 } });
  assert.throws(() => generatePassphrase({ wordlist: ["a", "b"] }), { code: "err.words_unreachable" });
  assert.throws(() => generatePassphrase({ wordlist: SAMPLE, words: 65 }), { code: "err.words" }); // an explicit value keeps its message
  withListFile(SAMPLE, (file) => assert.match(run(["passphrase", "--wordlist", file, "--min-bits", "1000"]).stderr, /Cannot reach 1000 bits/));
});

test("word list files: invalid UTF-8 and UTF-16 are rejected with an encoding message, not decoded into look-alikes", () => {
  const latin1 = Uint8Array.from([0x61, 0xf1, 0x6f, 0x0a, 0x78, 0x79, 0x7a]); // "a\u00F1o\nxyz" in Latin-1: "a\uFFFDo" if decoded loosely
  const utf16bom = Uint8Array.from([0xff, 0xfe, 0x61, 0x00, 0x0a, 0x00, 0x62, 0x00]); // what PowerShell 5.1 Out-File writes
  const utf16 = Uint8Array.from([0x61, 0x00, 0x0a, 0x00, 0x62, 0x00]);
  assert.throws(() => decodeWordlist(latin1), { code: "err.wordlist_encoding" });
  assert.throws(() => decodeWordlist(utf16bom), { code: "err.wordlist_utf16" });
  assert.throws(() => decodeWordlist(utf16), { code: "err.wordlist_utf16" });
  assert.equal(decodeWordlist(new TextEncoder().encode("\uFEFFa\u00F1o\nca\u00F1a\n")), "a\u00F1o\nca\u00F1a\n"); // UTF-8 (with BOM) is fine
  const dir = mkdtempSync(join(tmpdir(), "exactpass-"));
  try {
    const file = join(dir, "latin1.txt");
    writeFileSync(file, latin1);
    const r = run(["passphrase", "--wordlist", file, "--words", "2", "--min-bits", "1"]);
    assert.equal(r.status, 2);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /UTF-8/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/** Starts serve.js on `port`; resolves to { stop } once it listens, or to null if the port cannot be used here. */
function startServer(port) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [serverJs, String(port)], { stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => { child.kill(); resolve(null); }, 5000);
    child.stdout.on("data", (d) => { if (/listening/.test(d)) { clearTimeout(timer); resolve({ stop: () => new Promise((r) => { child.on("exit", r); child.kill(); }) }); } });
    child.on("exit", () => { clearTimeout(timer); resolve(null); }); // EACCES / EADDRINUSE
  });
}
/** GET with an explicit Host header (fetch() silently drops it: Host is a forbidden header name). Resolves to the status. */
const get = (port, path = "/", host = `127.0.0.1:${port}`) => new Promise((resolve, reject) => {
  request({ host: "127.0.0.1", port, path, headers: { host } }, (res) => { res.resume(); resolve(res.statusCode); }).on("error", reject).end();
});
async function startOnFreePort() {
  for (let i = 0; i < 10; i++) {
    const port = 20000 + Math.floor(Math.random() * 40000);
    const s = await startServer(port);
    if (s) return { ...s, port };
  }
  throw new Error("no free port");
}

test("server: on port 80 the Host header without a port (what browsers send) is accepted", async (t) => {
  const s = await startServer(80);
  if (!s) return t.skip("cannot listen on port 80 here (needs privileges)");
  try {
    for (const host of ["127.0.0.1", "localhost", "127.0.0.1:80"]) assert.equal(await get(80, "/", host), 200, host);
    assert.equal(await get(80, "/", "evil.example"), 403);
  } finally { await s.stop(); }
});

test("server: on other ports the Host header must still carry the port", async () => {
  const s = await startOnFreePort();
  try {
    assert.equal(await get(s.port), 200);
    for (const host of ["127.0.0.1", "localhost", "127.0.0.1:80"]) assert.equal(await get(s.port, "/", host), 403, host);
  } finally { await s.stop(); }
});

test("server: a symbolic link in wordlists/ is not followed (only regular files are served)", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "exactpass-"));
  const target = join(dir, "outside.txt"), link = fileURLToPath(new URL(`../wordlists/zz-symlink-test-${process.pid}.txt`, import.meta.url));
  writeFileSync(target, "outside the whitelist\n");
  try {
    try { symlinkSync(target, link); } catch { return t.skip("cannot create symbolic links here (read-only folder, or Windows without Developer Mode or admin rights)"); }
    const s = await startOnFreePort();
    try {
      assert.equal(await get(s.port, `/wordlists/zz-symlink-test-${process.pid}.txt`), 404);
      assert.equal(await get(s.port, "/"), 200); // the server itself works
    } finally { await s.stop(); }
  } finally { rmSync(link, { force: true }); rmSync(dir, { recursive: true, force: true }); }
});

test("CLI: language tags are matched on their primary subtag, case-insensitively (es-ES, ES, es_ES.UTF-8)", () => {
  for (const value of ["es-ES", "ES", "es_ES.UTF-8", "es-419"]) {
    const r = run(["password", "--no-symbols"], { EXACTPASS_LANG: value });
    assert.equal(r.status, 0, value);
    assert.match(r.stderr, /Entrop\u00EDa exacta/, value);
    assert.match(run(["password", "--no-symbols", "--lang", value]).stderr, /Entrop\u00EDa exacta/, `--lang ${value}`);
  }
  assert.match(run(["password", "--no-symbols", "--lang", "EN-us"]).stderr, /Exact entropy/);
  for (const value of ["fr", "fr-ES", "C", "e"]) assert.equal(run(["--help"], { EXACTPASS_LANG: value }).status, 2, value); // unknown stays an error
});

test("passphrase --capitalize: a list whose capitalized forms are not NFC is rejected (look-alike forms would count twice)", () => {
  // "\u0390x".toUpperCase() of the first letter gives U+0399 U+0308 U+0301, which is not NFC; its NFC form equals
  // the capitalized "\u03AA\u0301x", so the two list entries would look the same but count as 2 words.
  assert.throws(() => generatePassphrase({ wordlist: ["\u0390x", "\u03AA\u0301x"], words: 1, minBits: 1, capitalize: true }), { code: "err.capitalize_nfc", params: { line: 1 } });
  assert.throws(() => generatePassphrase({ wordlist: ["zzz", "\u0390x"], words: 1, minBits: 1, capitalize: true }), { code: "err.capitalize_nfc", params: { line: 2 } });
  assert.doesNotThrow(() => generatePassphrase({ wordlist: ["\u0390x", "zzz"], words: 1, minBits: 1 })); // without --capitalize nothing changes
  assert.doesNotThrow(() => generatePassphrase({ wordlist: SAMPLE, capitalize: true }));
});

test("word lists, separators and alphabets cannot start with a character that combines with the text before it", () => {
  // "e" + "\u0301" + "\u00E9" and "\u00E9" + "e" + "\u0301" are different sequences but the same text after NFC (and on screen)
  assert.throws(() => parseWordlist("e\n\u00E9\n\u0301"), { code: "err.wordlist_start", params: { line: 3 } });
  assert.throws(() => generatePassphrase({ wordlist: ["e", "\u00E9", "\u0301x"], words: 3, minBits: 1, separator: "" }), { code: "err.wordlist_start", params: { line: 3 } });
  assert.throws(() => parseWordlist("\u1100\n\uAC00\n\u1161x"), { code: "err.wordlist_start", params: { line: 3 } }); // Hangul vowel jamo
  assert.throws(() => generatePassphrase({ wordlist: ["e", "x"], words: 2, minBits: 1, separator: "\u0301" }), { code: "err.separator_start" });
  assert.throws(() => buildGroups({ alphabet: "\u1100\u1161\uAC00" }), { code: "err.alphabet_chars" }); // 27 strings, 26 after NFC
  if ("\u{16D63}\u{16D67}".normalize("NFC") !== "\u{16D63}\u{16D67}") { // Kirat Rai (Unicode 16): a letter, not a mark, that composes
    assert.throws(() => parseWordlist("\u{16D63}\n\u{16D67}a"), { code: "err.wordlist_start", params: { line: 2 } });
  }
  // marks inside a word, or a separator that only contains them after a base character, are fine
  assert.deepEqual(parseWordlist("caf\u00E9\nx\u0323\u0302y"), ["caf\u00E9", "x\u0323\u0302y"]);
  assert.doesNotThrow(() => generatePassphrase({ wordlist: ["a", "b"], words: 2, minBits: 1, separator: "\u00B7" }));
});

test("property: every accepted list keeps its word sequences distinct and stable under NFC", () => {
  const pool = ["e", "\u00E9", "\u0301", "\u0323", "a", "\u1100", "\u1161", "\uAC00", "\u11A8", "x", "\u0390", "\u0399"];
  let s = 99, accepted = 0, rejected = 0;
  const rnd = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s % n; };
  for (let i = 0; i < 3000; i++) {
    const words = new Set();
    while (words.size < 2 + rnd(4)) words.add(Array.from({ length: 1 + rnd(3) }, () => pool[rnd(pool.length)]).join("").normalize("NFC"));
    const sep = ["", "-", "x", "\u0301", "\u00E9"][rnd(5)];
    let r;
    try { r = generatePassphrase({ wordlist: [...words], words: 2, minBits: 1, separator: sep }); } catch { rejected++; continue; }
    accepted++;
    if (r.warnings.length) continue; // ambiguous separator: the figure is already reported as an upper bound
    const texts = [...words].flatMap((a) => [...words].map((b) => a + sep + b));
    for (const t of texts) assert.equal(t.normalize("NFC"), t, JSON.stringify({ words: [...words], sep, t }));
    assert.equal(new Set(texts.map((t) => t.normalize("NFC"))).size, texts.length, JSON.stringify({ words: [...words], sep }));
  }
  assert.ok(accepted > 300 && rejected > 300, `coverage: ${accepted} accepted, ${rejected} rejected`);
});

test("API: an alphabet or symbols that is neither a string nor an array gives a project error, not a TypeError", () => {
  for (const bad of [null, 5, {}, true]) {
    assert.throws(() => buildGroups({ alphabet: bad }), { code: "err.alphabet_entry" }, `alphabet ${String(bad)}`);
    assert.throws(() => buildGroups({ symbols: bad }), { code: "err.alphabet_entry" }, `symbols ${String(bad)}`);
  }
  assert.throws(() => buildGroups({ symbols: "" }), { code: "err.group_empty" }); // an empty group never vanishes silently
  assert.throws(() => buildGroups({ symbols: false }), { code: "err.alphabet_entry" });
  assert.equal(buildGroups({ useSymbols: false, symbols: null }).length, 3); // ignored when symbols are off
});
