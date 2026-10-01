import { randomBelow, systemSource } from "./rng.js";
import { countPasswords, log2Big } from "./entropy.js";
import { ExactpassError as E } from "./i18n.js";

export const GROUPS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};
const LOOKALIKES = new Set(Array.from("0O1lI|"));
const MAX_LEN = 512;
const MAX_ATTEMPTS = 100_000; // planPassword guarantees acceptance >= 0.1%: P(exhausting this) <= e^-100
const dedupe = (s) => [...new Set(Array.from(s))];

/** The threshold must be a finite number > 0: NaN/0/negative values would silently disable the main guarantee. */
export function assertMinBits(minBits) {
  if (typeof minBits !== "number" || !Number.isFinite(minBits) || minBits <= 0) throw new E("err.minbits");
  return minBits;
}

/** Disjoint character groups. The REAL alphabet size (after filters) is what counts for the entropy. */
export function buildGroups({ useLower = true, useUpper = true, useDigits = true, useSymbols = true, symbols = GROUPS.symbols, excludeLookalikes = false, alphabet } = {}) {
  const raw = alphabet !== undefined
    ? [dedupe(alphabet)]
    : [useLower && GROUPS.lower, useUpper && GROUPS.upper, useDigits && GROUPS.digits, useSymbols && symbols].filter(Boolean).map(dedupe);
  if (alphabet !== undefined && alphabet.normalize("NFC") !== alphabet) throw new E("err.alphabet_nfc");
  const seen = new Set();
  const groups = raw.map((g) => g.filter((c) => {
    if (/[\s\p{C}\p{M}]/u.test(c)) throw new E("err.alphabet_chars");
    if (seen.has(c) || (excludeLookalikes && LOOKALIKES.has(c))) return false;
    seen.add(c);
    return true;
  }));
  if (groups.some((g) => g.length === 0)) throw new E("err.group_empty");
  if (groups.flat().length < 2) throw new E("err.alphabet_size");
  return groups;
}

export function planPassword(opts = {}) {
  const { length, requireEach = true } = opts;
  const minBits = assertMinBits(opts.minBits ?? 128);
  const groups = buildGroups(opts);
  const sizes = groups.map((g) => g.length);
  const need = requireEach ? groups.length : 1;
  const bitsFor = (L) => log2Big(countPasswords(sizes, L, requireEach));

  let L = length;
  if (L === undefined) { // shortest length that reaches minBits with the exact entropy
    L = need;
    while (bitsFor(L) < minBits) if (++L > MAX_LEN) throw new E("err.unreachable", { minBits, max: MAX_LEN });
  }
  if (!Number.isInteger(L) || L < need || L > MAX_LEN) throw new E("err.length", { min: need, max: MAX_LEN });

  const count = countPasswords(sizes, L, requireEach);
  const bits = log2Big(count);
  if (bits < minBits) throw new E("err.below_min", { bits: bits.toFixed(1), minBits });
  const total = BigInt(sizes.reduce((a, b) => a + b, 0)) ** BigInt(L);
  if (count * 1000n < total) throw new E("err.sparse");
  return { groups, length: L, bits, requireEach };
}

/** Uniform over the valid set: sample over the WHOLE alphabet and reject the entire string if it breaks the rule. */
export function sampleConstrained(groups, length, requireEach, source = systemSource) {
  const all = groups.flat();
  const sets = groups.map((g) => new Set(g));
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const chars = Array.from({ length }, () => all[randomBelow(all.length, source)]);
    if (!requireEach || sets.every((s) => chars.some((c) => s.has(c)))) return chars.join("");
  }
  throw new E("err.sampling");
}

export function generatePassword(opts = {}, source = systemSource) {
  const plan = planPassword(opts);
  return {
    kind: "password",
    value: sampleConstrained(plan.groups, plan.length, plan.requireEach, source),
    bits: plan.bits, length: plan.length, alphabetSize: plan.groups.flat().length, warnings: [],
  };
}

/** Accepts one word per line or the Diceware format "11111<TAB>word". Rejects duplicates (they lower the real entropy). */
export function parseWordlist(text) {
  const words = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/\s+/).pop());
  const dup = words.length - new Set(words).size;
  if (dup > 0) throw new E("err.duplicates", { n: dup });
  return words;
}

/**
 * Sardinas-Patterson: does every text built by concatenating elements of `code` split in exactly ONE way?
 * With code = words + separator, this means different word sequences give different strings
 * (the condition for n*log2(W) to be the exact entropy of the STRING and not just of the sequence).
 */
export function isUniquelyDecodable(code) {
  const C = new Set(code);
  if (C.size !== code.length || C.has("")) return false;
  const sorted = [...C].sort();
  const withPrefix = (p) => { // elements of C that start with p
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < p) lo = mid + 1; else hi = mid; }
    const out = [];
    for (let i = lo; i < sorted.length && sorted[i].startsWith(p); i++) out.push(sorted[i]);
    return out;
  };
  let S = new Set(); // S1: dangling suffixes of pairs (u a proper prefix of v)
  for (const v of C) for (let k = 1; k < v.length; k++) if (C.has(v.slice(0, k))) S.add(v.slice(k));
  const seen = new Set();
  while (S.size > 0) {
    for (const x of S) if (C.has(x)) return false;
    const key = [...S].sort().join("\u0000");
    if (seen.has(key)) return true;
    seen.add(key);
    const next = new Set();
    for (const x of S) {
      for (let k = 1; k < x.length; k++) if (C.has(x.slice(0, k))) next.add(x.slice(k)); // c·w = x
      for (const c of withPrefix(x)) if (c.length > x.length) next.add(c.slice(x.length)); // x·w = c
    }
    S = next;
  }
  return true;
}

export function generatePassphrase({ words, minBits, separator = "-", capitalize = false, wordlist } = {}, source = systemSource) {
  const min = assertMinBits(minBits ?? 128);
  if (typeof separator !== "string") throw new E("err.separator_type");
  if (!Array.isArray(wordlist) || wordlist.length < 2 || new Set(wordlist).size !== wordlist.length) throw new E("err.wordlist");
  const forms = wordlist.map((w) => (capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w)); // deterministic: adds no entropy
  if (new Set(forms).size !== forms.length) throw new E("err.capitalize_merge");
  const perWord = Math.log2(forms.length);
  const n = words ?? Math.ceil(min / perWord - 1e-9);
  if (!Number.isInteger(n) || n < 1 || n > 64) throw new E("err.words");
  const bits = n * perWord;
  if (bits < min - 1e-9) throw new E("err.words_below_min", { n, size: forms.length, bits: bits.toFixed(1), minBits: min });
  const exact = isUniquelyDecodable(forms.map((w) => w + separator));
  const value = Array.from({ length: n }, () => forms[randomBelow(forms.length, source)]).join(separator);
  return { kind: "passphrase", value, bits, words: n, listSize: forms.length, warnings: exact ? [] : ["warn.separator_ambiguous"] };
}

export function generateKey({ bytes = 32, format = "hex", minBits } = {}, source = systemSource) {
  const min = assertMinBits(minBits ?? 128);
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > 1024) throw new E("err.bytes");
  if (bytes * 8 < min) throw new E("err.bytes_below_min", { bytes, bits: bytes * 8, minBits: min });
  const raw = source.randomBytes(bytes);
  if (raw.length !== bytes) throw new Error("The random source returned an unexpected length.");
  const b64 = () => { let bin = ""; for (const b of raw) bin += String.fromCharCode(b); return btoa(bin); };
  const enc = {
    hex: () => Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join(""),
    base64: b64,
    base64url: () => b64().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  }[format];
  if (!enc) throw new E("err.format");
  return { kind: "key", value: enc(), bits: bytes * 8, bytes, warnings: [] };
}
