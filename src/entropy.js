// Exact entropy (BigInt counting) and estimates with explicit assumptions.
import { t } from "./i18n.js";

/** log2 of a positive BigInt, accurate to double precision without overflowing. */
export function log2Big(n) {
  if (n <= 0n) throw new RangeError("log2Big requires n > 0.");
  const bits = n.toString(2).length;
  const shift = Math.max(0, bits - 53);
  return Math.log2(Number(n >> BigInt(shift))) + shift;
}

/**
 * Number of strings of `length` over DISJOINT groups with sizes `sizes`.
 * With requireEach: only those containing at least one character of every group (exact inclusion-exclusion).
 */
export function countPasswords(sizes, length, requireEach) {
  const total = sizes.reduce((a, b) => a + b, 0);
  if (!requireEach) return BigInt(total) ** BigInt(length);
  const k = sizes.length;
  let sum = 0n;
  for (let mask = 0; mask < 1 << k; mask++) {
    let removed = 0, parity = 0;
    for (let i = 0; i < k; i++) if (mask & (1 << i)) { removed += sizes[i]; parity ^= 1; }
    const term = BigInt(total - removed) ** BigInt(length);
    sum += parity ? -term : term;
  }
  return sum;
}

const LOG2_YEAR = Math.log2(365.25 * 24 * 3600);

export function fmtDuration(log2Sec, lang = "en") {
  if (log2Sec > 100) return t(lang, "est.pow", { x: ((log2Sec - LOG2_YEAR) * Math.log10(2)).toFixed(1) });
  let s = 2 ** log2Sec;
  if (s < 1) return t(lang, "est.lt1s");
  for (const [unit, div] of [["est.s", 60], ["est.m", 60], ["est.h", 24], ["est.d", 365.25]]) {
    if (s < div) return `${s.toFixed(1)} ${t(lang, unit)}`;
    s /= div;
  }
  return s >= 1e6 ? t(lang, "est.sci", { x: s.toExponential(1) }) : `${s.toFixed(1)} ${t(lang, "est.y")}`;
}

export function referenceLevel(bits, lang = "en") {
  return t(lang, bits >= 256 ? "est.ref.256" : bits >= 192 ? "est.ref.192" : bits >= 128 ? "est.ref.128" : "est.ref.low");
}

/**
 * Assumptions: the secret is uniform and the attacker knows the method and the alphabet/list.
 * Classical: expected guesses ~ 2^(bits-1) at `rate` guesses/s (depends on the KDF and hardware).
 * Grover (optimal for unstructured search): ~ (pi/4)*2^(bits/2) SEQUENTIAL iterations.
 * `qrate` (iterations/s) has no sensible default: time is only computed if you provide it.
 */
export function estimate(bits, { rate = 1e12, qrate, lang = "en" } = {}) {
  const classicalLog2Guesses = Math.max(bits - 1, 0);
  const groverLog2Iterations = bits / 2 + Math.log2(Math.PI / 4);
  return {
    reference: referenceLevel(bits, lang),
    classicalLog2Guesses,
    classicalTime: fmtDuration(classicalLog2Guesses - Math.log2(rate), lang),
    classicalRate: rate,
    groverLog2Iterations,
    groverTime: qrate ? fmtDuration(groverLog2Iterations - Math.log2(qrate), lang) : null,
  };
}
