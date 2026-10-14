// Regression tests for problems found in the 0.1.3 audit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateKey } from "../src/generate.js";

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
