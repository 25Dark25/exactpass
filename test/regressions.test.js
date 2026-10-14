// Regression tests for problems found in the 0.1.2 audit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildGroups, parseWordlist } from "../src/generate.js";

const cli = fileURLToPath(new URL("../bin/exactpass.js", import.meta.url));
const server = fileURLToPath(new URL("../serve.js", import.meta.url));
const run = (file, args) => spawnSync(process.execPath, [file, ...args], { encoding: "utf8", timeout: 10000, env: { ...process.env, EXACTPASS_LANG: "" } });

test("word list: rejects entries that look identical but differ (NFD, invisible or control characters)", () => {
  assert.throws(() => parseWordlist("caf\u00E9\ncafe\u0301\nxyz"), { code: "err.wordlist_nfc" });
  assert.throws(() => parseWordlist("abc\nabc\u200B\nxyz"), { code: "err.wordlist_chars" });
  assert.throws(() => parseWordlist("a\u0007b\ncd\nef"), { code: "err.wordlist_chars" });
});

test("word list: a line with several words is an error, not silently truncated", () => {
  assert.throws(() => parseWordlist("ice cream\nhot dog\ntea"), { code: "err.wordlist_line", params: { line: 1 } });
  assert.deepEqual(parseWordlist("11111\tabacus\n11112 abdomen\nzebra"), ["abacus", "abdomen", "zebra"]);
});

test("custom symbols must be in NFC form (U+212B ANGSTROM SIGN would look like U+00C5)", () => {
  assert.throws(() => buildGroups({ symbols: "\u212B!" }), { code: "err.alphabet_nfc" });
  assert.equal(buildGroups({ symbols: "\u00C5!" }).at(-1).length, 2);
});

test("CLI: errors from Node show a readable message, not only an internal code", () => {
  const unknown = run(cli, ["password", "--foo"]);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /--foo/);
  const missing = run(cli, ["passphrase", "--wordlist", "does-not-exist.txt"]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /does-not-exist\.txt/);
});

test("CLI: rejects extra arguments and options that belong to another mode", () => {
  for (const args of [["password", "extra"], ["password", "--words", "3"], ["password", "--separator", "x"], ["key", "--length", "20"], ["passphrase", "--wordlist", "x.txt", "--bytes", "8"]]) {
    const r = run(cli, args);
    assert.equal(r.status, 2, args.join(" "));
    assert.equal(r.stdout, "", args.join(" "));
  }
});

test("server: invalid ports fail with a clear message instead of a stack trace or a server that answers 403", () => {
  for (const port of ["abc", "0", "70000", "-1", "8080x"]) {
    const r = run(server, [port]);
    assert.equal(r.status, 1, `port ${port}`);
    assert.match(r.stderr, /between 1 and 65535/, `port ${port}`);
    assert.doesNotMatch(r.stderr, /at .*node:/, `port ${port}: stack trace`);
  }
});
