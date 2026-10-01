// Randomness: only crypto.getRandomValues (the system CSPRNG). Never Math.random.
const webcrypto = globalThis.crypto;
if (!webcrypto?.getRandomValues) throw new Error("crypto.getRandomValues is not available (use Node >= 20 or a modern browser).");

export const systemSource = {
  randomBytes(n) {
    const out = new Uint8Array(n); // n <= 65536 (getRandomValues limit)
    webcrypto.getRandomValues(out);
    return out;
  },
};

const TWO32 = 2 ** 32;
const MAX_REJECTIONS = 10_000; // acceptance >= 50% per attempt (worst case n = 2^31 + 1): false alarm probability <= 2^-10000

/** Uniform integer in [0, n) by rejection sampling: no modulo bias. */
export function randomBelow(n, source = systemSource) {
  if (!Number.isSafeInteger(n) || n < 1 || n > TWO32) throw new RangeError("n must be an integer in [1, 2^32].");
  if (n === 1) return 0;
  const limit = TWO32 - (TWO32 % n); // largest multiple of n that fits in 2^32
  for (let attempt = 0; attempt < MAX_REJECTIONS; attempt++) {
    const b = source.randomBytes(4);
    if (b.length !== 4) throw new Error("The random source returned an unexpected length.");
    const v = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    if (v < limit) return v % n;
  }
  throw new Error("The random source looks faulty: too many consecutive rejections.");
}
