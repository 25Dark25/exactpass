import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBelow } from "../src/rng.js";
import { countPasswords, log2Big } from "../src/entropy.js";
import { buildGroups, planPassword, sampleConstrained, generatePassword, generatePassphrase, generateKey, isUniquelyDecodable, parseWordlist } from "../src/generate.js";
import { CATALOGS, LANGS, t } from "../src/i18n.js";

const cli = fileURLToPath(new URL("../bin/exactpass.js", import.meta.url));
const eff = new URL("../wordlists/eff_large_wordlist.txt", import.meta.url);
const fixed = (...vals) => { let i = 0; return { randomBytes: () => { const v = vals[i++]; return new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]); } }; };

test("randomBelow: exact accept/reject boundary", () => {
  for (const n of [3, 5, 6, 7, 10, 1000, 7776, 2 ** 31 + 1]) {
    const limit = 2 ** 32 - (2 ** 32 % n);
    assert.equal(randomBelow(n, fixed(limit - 1)), (limit - 1) % n, `n=${n}: limit-1 must be accepted`);
    assert.equal(randomBelow(n, fixed(limit, 5)), 5 % n, `n=${n}: limit must be rejected`);
  }
});

test("randomBelow: a stuck source fails instead of hanging", () => {
  assert.throws(() => randomBelow(3, { randomBytes: () => new Uint8Array([255, 255, 255, 255]) }), /faulty/);
});

test("invalid threshold fails closed (NaN, 0, negative, Infinity, text); null means the safe default", () => {
  for (const bad of [NaN, 0, -5, Infinity, "128"]) {
    assert.throws(() => generatePassword({ length: 6, minBits: bad }), { code: "err.minbits" });
    assert.throws(() => generateKey({ bytes: 1, minBits: bad }), { code: "err.minbits" });
    assert.throws(() => generatePassphrase({ words: 1, minBits: bad, wordlist: ["a", "b"] }), { code: "err.minbits" });
  }
  assert.throws(() => generatePassword({ length: 6, minBits: null }), { code: "err.below_min" });
});

test("exact counting: two independent methods agree with the real sizes (L=20)", () => {
  const L = 20, fact = (n) => (n <= 1n ? 1n : n * fact(n - 1n));
  let total = 0n;
  for (let a = 1; a <= L - 3; a++) for (let b = 1; b <= L - a - 2; b++) for (let c = 1; c <= L - a - b - 1; c++) {
    const d = L - a - b - c;
    total += fact(BigInt(L)) / (fact(BigInt(a)) * fact(BigInt(b)) * fact(BigInt(c)) * fact(BigInt(d))) * 26n ** BigInt(a) * 26n ** BigInt(b) * 10n ** BigInt(c) * 24n ** BigInt(d);
  }
  assert.equal(countPasswords([26, 26, 10, 24], L, true), total);
});

test("exact counting with 4 groups matches brute force", () => {
  const groups = [["a", "b"], ["1"], ["X"], ["#"]], all = groups.flat();
  let n = 0;
  const rec = (s) => { if (s.length === 5) { if (groups.every((g) => g.some((c) => s.includes(c)))) n++; return; } for (const c of all) rec(s + c); };
  rec("");
  assert.equal(countPasswords([2, 1, 1, 1], 5, true), BigInt(n));
});

const groups2 = [["a", "b"], ["1"]];
const fracTwoOnes = (sampler, N = 20000) => { let k = 0; for (let i = 0; i < N; i++) if (sampler().split("1").length - 1 === 2) k++; return k / N; };
const biased = () => { // the tempting algorithm: one forced character per group + filler + shuffle
  const all = groups2.flat(), ch = groups2.map((g) => g[randomBelow(g.length)]);
  while (ch.length < 4) ch.push(all[randomBelow(all.length)]);
  for (let i = ch.length - 1; i > 0; i--) { const j = randomBelow(i + 1); [ch[i], ch[j]] = [ch[j], ch[i]]; }
  return ch.join("");
};
test("negative control: the statistical criterion DOES detect a biased sampler", () => {
  // Alphabet {a,b | 1}, length 4 -> 64 valid strings; 24 of them have exactly two '1' (37.5%). The biased algorithm gives about 44.4%.
  assert.equal(countPasswords([2, 1], 4, true), 64n);
  const good = fracTwoOnes(() => sampleConstrained(groups2, 4, true));
  const bad = fracTwoOnes(biased);
  assert.ok(Math.abs(good - 0.375) < 0.02, `good sampler: ${good}`);
  assert.ok(Math.abs(bad - 0.375) > 0.02, `biased sampler NOT detected: ${bad} (expected about 0.444)`);
});

test("key: hex/base64/base64url match the bytes; source length is checked", () => {
  const raw = Uint8Array.from({ length: 256 }, (_, i) => i), src = { randomBytes: () => raw };
  for (const f of ["hex", "base64", "base64url"]) assert.equal(generateKey({ bytes: 256, format: f }, src).value, Buffer.from(raw).toString(f));
  assert.throws(() => generateKey({ bytes: 32 }, { randomBytes: () => new Uint8Array(5) }), /unexpected length/);
  assert.equal(generateKey({ bytes: 1024 }).bits, 8192);
  assert.throws(() => generateKey({ format: "nope" }), { code: "err.format" });
});

test("groups never vanish silently; custom alphabet is strict (spaces, combining marks, NFC)", () => {
  assert.throws(() => buildGroups({ symbols: "abc" }), { code: "err.group_empty" });
  assert.throws(() => buildGroups({ alphabet: "ab c" }), { code: "err.alphabet_chars" });
  assert.throws(() => buildGroups({ alphabet: "ab\u0301" }), { code: "err.alphabet_chars" });
  assert.throws(() => buildGroups({ alphabet: "\u212Bx" }), { code: "err.alphabet_nfc" });
  assert.deepEqual(buildGroups({ alphabet: "aabbc" }), [["a", "b", "c"]]);
});

test("Sardinas-Patterson: known codes", () => {
  assert.equal(isUniquelyDecodable(["0", "10", "11"]), true);
  assert.equal(isUniquelyDecodable(["0", "01", "11"]), true);
  assert.equal(isUniquelyDecodable(["a", "ab", "ba"]), false);
});

test("passphrase warns when the separator makes the string ambiguous; capitalization cannot merge words", () => {
  assert.deepEqual(generatePassphrase({ wordlist: ["alpha", "beta", "gamma", "delta"], words: 4, minBits: 8, separator: " " }).warnings, []);
  assert.deepEqual(generatePassphrase({ wordlist: ["a", "ab", "ba", "c"], words: 2, minBits: 2, separator: "" }).warnings, ["warn.separator_ambiguous"]);
  assert.throws(() => generatePassphrase({ wordlist: ["apple", "Apple"], words: 1, minBits: 1, capitalize: true }), { code: "err.capitalize_merge" });
});

test("EFF list (if present in wordlists/): 7776 unique words, valid dice codes, unambiguous with '-' and ' '", (t) => {
  if (!existsSync(eff)) return t.skip("wordlists/eff_large_wordlist.txt is not present");
  const text = readFileSync(eff, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 7776);
  assert.ok(lines.every((l) => /^[1-6]{5}\s+\S+$/.test(l)), "invalid dice format");
  const words = parseWordlist(text);
  assert.equal(words.length, 7776);
  for (const sep of ["-", " "]) assert.equal(isUniquelyDecodable(words.map((w) => w + sep)), true, `separator ${JSON.stringify(sep)}`);
});

test("i18n: every English message has a Spanish one with the same placeholders, and vice versa", () => {
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const en = Object.keys(CATALOGS.en).sort(), es = Object.keys(CATALOGS.es).sort();
  assert.deepEqual(es, en);
  for (const k of en) assert.equal(ph(CATALOGS.es[k]), ph(CATALOGS.en[k]), `placeholders differ for ${k}`);
  assert.deepEqual(LANGS, ["en", "es"]);
  assert.equal(t("xx", "err.minbits"), CATALOGS.en["err.minbits"]); // unknown language falls back to English
});

test("CLI: valid JSON, secret only on stdout, fail closed with exit code 2, English by default and Spanish on request", () => {
  const run = (args, env = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env: { ...process.env, EXACTPASS_LANG: "", ...env } });
  const ok = run(["password", "--json"]);
  assert.equal(ok.status, 0);
  const j = JSON.parse(ok.stdout);
  assert.ok(j.bits >= 128 && j.value.length === j.length && j.reference.includes("AES-128") && Array.isArray(j.warnings));
  const plain = run(["password", "--no-symbols"]);
  assert.equal(plain.stdout.trim().split("\n").length, 1);
  assert.match(plain.stderr, /Exact entropy/);
  assert.match(run(["password", "--no-symbols", "--lang", "es"]).stderr, /Entropía exacta/);
  assert.match(run(["password", "--no-symbols"], { EXACTPASS_LANG: "es" }).stderr, /Entropía exacta/);
  const bad = run(["password", "--length", "8"]);
  assert.equal(bad.status, 2); assert.equal(bad.stdout, ""); assert.match(bad.stderr, /^Error: .*only .* bits/);
  assert.match(run(["password", "--length", "8", "--lang", "es"]).stderr, /^Error: .*solo .* bits/);
  for (const args of [["password", "--min-bits", "abc"], ["nope"], ["password", "--lang", "fr"], []]) assert.equal(run(args).status, 2, args.join(" "));
});

test("fuzz (deterministic) of planPassword/generatePassword: invariants hold", () => {
  let s = 12345;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  let ok = 0, rejected = 0;
  for (let i = 0; i < 400; i++) {
    const opts = {
      useLower: rnd() < 0.8, useUpper: rnd() < 0.8, useDigits: rnd() < 0.8, useSymbols: rnd() < 0.8,
      excludeLookalikes: rnd() < 0.4, requireEach: rnd() < 0.7,
      length: rnd() < 0.4 ? undefined : 1 + Math.floor(rnd() * 40), minBits: pick([1, 20, 64, 80, 128, 192, 256, 400]),
    };
    let plan;
    try { plan = planPassword(opts); } catch (e) { assert.ok(e instanceof Error && e.code); rejected++; continue; }
    const r = generatePassword(opts), chars = Array.from(r.value), alphabet = new Set(plan.groups.flat());
    assert.ok(r.bits >= opts.minBits, "threshold not met");
    assert.equal(chars.length, plan.length);
    assert.ok(chars.every((c) => alphabet.has(c)));
    if (opts.requireEach) for (const g of plan.groups) assert.ok(chars.some((c) => g.includes(c)));
    ok++;
  }
  assert.ok(ok > 100 && rejected > 20, `insufficient coverage: ok=${ok} rejected=${rejected}`);
});

const shannon = (counts, N) => -[...counts.values()].reduce((a, c) => a + (c / N) * Math.log2(c / N), 0);
const tally = (N, f) => { const m = new Map(); for (let i = 0; i < N; i++) { const v = f(); m.set(v, (m.get(v) ?? 0) + 1); } return m; };

test("reported entropy equals the empirical Shannon entropy (password with required classes)", () => {
  const N = 80000, bits = log2Big(countPasswords([2, 1], 4, true)); // exactly 6 bits
  assert.ok(Math.abs(shannon(tally(N, () => sampleConstrained(groups2, 4, true)), N) - bits) < 0.01);
});

test("reported entropy equals the empirical Shannon entropy (passphrase and custom alphabet)", () => {
  const list = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const pp = () => generatePassphrase({ wordlist: list, words: 2, minBits: 6, separator: " " });
  assert.ok(Math.abs(shannon(tally(50000, () => pp().value), 50000) - pp().bits) < 0.01);
  const pw = () => generatePassword({ alphabet: "abc", length: 4, minBits: 6 });
  assert.ok(Math.abs(shannon(tally(60000, () => pw().value), 60000) - pw().bits) < 0.01);
});
