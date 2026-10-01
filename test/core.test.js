import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBelow } from "../src/rng.js";
import { countPasswords, log2Big, estimate } from "../src/entropy.js";
import { generatePassword, generatePassphrase, generateKey, parseWordlist } from "../src/generate.js";

const fixed = (...vals) => { let i = 0; return { randomBytes: () => { const v = vals[i++]; return new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]); } }; };

test("randomBelow rejects values in the biased zone", () => {
  // n=3 -> limit 2^32-1; 0xFFFFFFFF must be discarded and the next value used (4 % 3 = 1)
  assert.equal(randomBelow(3, fixed(0xFFFFFFFF, 4)), 1);
});

test("randomBelow is uniform (n=6, 60000 samples, within 5.5 sigma)", () => {
  const c = new Array(6).fill(0);
  for (let i = 0; i < 60000; i++) c[randomBelow(6)]++;
  for (const x of c) assert.ok(x > 9500 && x < 10500, `count out of range: ${c}`);
});

test("countPasswords matches brute force", () => {
  const groups = [["a", "b"], ["X", "Y"], ["1"]], all = groups.flat();
  let brute = 0;
  const rec = (s) => {
    if (s.length === 4) { if (groups.every((g) => g.some((c) => s.includes(c)))) brute++; return; }
    for (const c of all) rec(s + c);
  };
  rec("");
  assert.equal(countPasswords([2, 2, 1], 4, true), BigInt(brute));
  assert.equal(countPasswords([2, 2, 1], 4, false), 625n);
});

test("log2Big", () => {
  assert.equal(log2Big(2n ** 128n), 128);
  assert.ok(Math.abs(log2Big(10n) - Math.log2(10)) < 1e-12);
});

test("default password reaches 128 exact bits and contains every class", () => {
  const p = generatePassword();
  assert.ok(p.bits >= 128 && p.value.length === p.length);
  assert.match(p.value, /[a-z]/); assert.match(p.value, /[A-Z]/); assert.match(p.value, /[0-9]/);
});

test("fails closed below the minimum", () => {
  assert.throws(() => generatePassword({ length: 8 }), { code: "err.below_min" });
  assert.doesNotThrow(() => generatePassword({ length: 8, minBits: 40 }));
  assert.throws(() => generateKey({ bytes: 8 }), { code: "err.bytes_below_min" });
});

test("passphrase: exact entropy and duplicate rejection", () => {
  const list = ["a", "b", "c", "d", "e", "f", "g", "h"];
  assert.equal(generatePassphrase({ wordlist: list, words: 4, minBits: 12 }).bits, 12);
  assert.throws(() => parseWordlist("a\nb\na"), { code: "err.duplicates" });
  assert.deepEqual(parseWordlist("11111\tabacus\n11112\tabdomen"), ["abacus", "abdomen"]);
});

test("key: 32-byte hex", () => {
  const k = generateKey();
  assert.match(k.value, /^[0-9a-f]{64}$/); assert.equal(k.bits, 256);
});

test("estimate: Grover is about (pi/4)*2^(n/2)", () => {
  assert.ok(Math.abs(estimate(128).groverLog2Iterations - (64 + Math.log2(Math.PI / 4))) < 1e-12);
});

test("parseWordlist tolerates BOM and CRLF (files saved on Windows)", () => {
  assert.deepEqual(parseWordlist("\uFEFFabacus\r\nabdomen\r\n"), ["abacus", "abdomen"]);
});
