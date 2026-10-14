// Regression tests for problems found in the 0.1.3 audit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildGroups, generateKey, generatePassphrase, generatePassword, parseWordlist } from "../src/generate.js";

const cli = fileURLToPath(new URL("../bin/exactpass.js", import.meta.url));
const run = (args, env = {}) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 10000, env: { ...process.env, EXACTPASS_LANG: "", ...env } });

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
