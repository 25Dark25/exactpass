#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { generatePassword, generatePassphrase, generateKey, parseWordlist } from "../src/generate.js";
import { estimate } from "../src/entropy.js";
import { LANGS, ExactpassError as E, t } from "../src/i18n.js";

let lang = "en";
const int = (name, v) => {
  if (v === undefined) return undefined;
  if (!/^\d+$/.test(v)) throw new E("cli.err.int", { name });
  return Number(v);
};
const num = (name, v) => {
  if (v === undefined) return undefined;
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) throw new E("cli.err.num", { name });
  return x;
};

try {
  const { values: v, positionals: [mode] } = parseArgs({
    allowPositionals: true,
    options: {
      "min-bits": { type: "string" }, length: { type: "string" }, words: { type: "string" }, bytes: { type: "string" },
      wordlist: { type: "string" }, separator: { type: "string" }, format: { type: "string" }, lang: { type: "string" },
      rate: { type: "string" }, qrate: { type: "string" },
      "no-symbols": { type: "boolean" }, "exclude-lookalikes": { type: "boolean" }, "no-require-each": { type: "boolean" },
      capitalize: { type: "boolean" }, json: { type: "boolean" }, help: { type: "boolean" },
    },
  });
  const wanted = v.lang || process.env.EXACTPASS_LANG || "en"; // an empty value counts as unset
  if (!LANGS.includes(wanted)) throw new E("cli.err.lang", { lang: wanted });
  lang = wanted;
  if (v.help || !mode) { console.log(t(lang, "cli.help")); process.exit(v.help ? 0 : 2); }

  const minBits = num("min-bits", v["min-bits"]) ?? 128;
  let r, sha;
  if (mode === "password") {
    r = generatePassword({ length: int("length", v.length), minBits, useSymbols: !v["no-symbols"], excludeLookalikes: v["exclude-lookalikes"], requireEach: !v["no-require-each"] });
  } else if (mode === "passphrase") {
    if (!v.wordlist) throw new E("cli.err.wordlist");
    const raw = readFileSync(v.wordlist);
    sha = createHash("sha256").update(raw).digest("hex");
    r = generatePassphrase({ words: int("words", v.words), minBits, separator: v.separator, capitalize: v.capitalize, wordlist: parseWordlist(raw.toString("utf8")) });
  } else if (mode === "key") {
    r = generateKey({ bytes: int("bytes", v.bytes), format: v.format, minBits });
  } else throw new E("cli.err.mode", { mode });

  const est = estimate(r.bits, { rate: num("rate", v.rate), qrate: num("qrate", v.qrate), lang });
  if (v.json) {
    console.log(JSON.stringify({ ...r, ...est, ...(sha ? { wordlistSha256: sha } : {}) }, null, 2));
  } else {
    console.log(r.value);
    const bits = r.bits.toFixed(2);
    const rows = [
      [t(lang, "cli.l.entropy"), t(lang, "cli.entropy", { bits })],
      [t(lang, "cli.l.reference"), est.reference],
      [t(lang, "cli.l.classical"), t(lang, "cli.classical", { log: est.classicalLog2Guesses.toFixed(1), time: est.classicalTime, rate: est.classicalRate.toExponential(0) })],
      [t(lang, "cli.l.grover"), t(lang, "cli.grover", { log: est.groverLog2Iterations.toFixed(1) }) + (est.groverTime ? t(lang, "cli.grover_t", { time: est.groverTime }) : t(lang, "cli.grover_hint"))],
      ...(sha ? [[t(lang, "cli.l.sha"), sha]] : []),
      ...r.warnings.map((c) => [t(lang, "cli.l.warning"), t(lang, c)]),
    ];
    const pad = Math.max(...rows.map(([k]) => k.length));
    console.error("\n" + rows.map(([k, val]) => `${k.padEnd(pad)} : ${val}`).join("\n") + "\n" + t(lang, "cli.assumptions"));
  }
} catch (e) {
  console.error(`${t(lang, "cli.err.prefix")} ${e.code ? t(lang, e.code, e.params) : e.message}`);
  process.exit(2);
}
