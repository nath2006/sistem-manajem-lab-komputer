import test from "node:test";
import assert from "node:assert/strict";
const mod = await import("../scripts/qr-review-state.mjs").catch(() => ({}));
test("owned fixture cleanup recognizes Windows signal exit as well as numeric exit", () => {
  assert.equal(typeof mod.processExited, "function");
  assert.equal(
    mod.processExited({ exitCode: null, signalCode: "SIGTERM" }),
    true,
  );
  assert.equal(mod.processExited({ exitCode: 0, signalCode: null }), true);
  assert.equal(mod.processExited({ exitCode: null, signalCode: null }), false);
});
