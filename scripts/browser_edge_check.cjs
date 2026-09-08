"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("assert");
const {
  chromium,
} = require("/private/tmp/dataforge-tools/node_modules/playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const results = {
    runtime: "Headless Google Chrome via Playwright",
    url: "http://127.0.0.1:8000/",
    checks: [],
    errors: [],
  };
  const fresh = async () => {
    const p = await browser.newPage({ reducedMotion: "reduce" });
    p.on("pageerror", (e) => results.errors.push(e.message));
    return p;
  };
  const ready = (p) =>
    p.waitForFunction(
      () =>
        state.result &&
        !state.result.pending &&
        state.result.weights === state.weights,
    );
  const check = async (name, fn) => {
    try {
      await fn();
      results.checks.push({ name, passed: true });
    } catch (e) {
      results.checks.push({ name, passed: false, error: e.message });
    }
  };
  await check(
    "Delayed untrained BDH failure cannot overwrite newer trained selection",
    async () => {
      const p = await fresh();
      let release;
      const held = new Promise((r) => (release = r));
      let requested = false;
      await p.route("**/weights_untrained.json", async (route) => {
        requested = true;
        await held;
        await route.fulfill({ status: 503, body: "delayed failure" });
      });
      await p.goto(results.url);
      await ready(p);
      await p.locator('button[data-weights="untrained"]').click();
      await p.waitForTimeout(100);
      assert(requested);
      await p.locator('button[data-weights="trained"]').click();
      release();
      await ready(p);
      await p.waitForTimeout(300);
      assert.deepStrictEqual(
        await p.evaluate(() => ({
          kind: state.weights,
          result: state.result.weights,
          status: el.status.hidden,
        })),
        { kind: "trained", result: "trained", status: true },
      );
      await p.close();
    },
  );
  await check(
    "Initial delayed trained load preserves user-selected untrained state",
    async () => {
      const p = await fresh();
      let release;
      const held = new Promise((r) => (release = r));
      await p.route("**/weights_trained.json", async (route) => {
        await held;
        await route.continue();
      });
      await p.goto(results.url);
      await p.locator('button[data-weights="untrained"]').click();
      await ready(p);
      release();
      await p.waitForTimeout(400);
      await ready(p);
      assert.deepStrictEqual(
        await p.evaluate(() => ({
          kind: state.weights,
          result: state.result.weights,
          status: el.status.hidden,
        })),
        { kind: "untrained", result: "untrained", status: true },
      );
      await p.close();
    },
  );
  await check(
    "Missing Transformer exposes retry and recovers while BDH stays valid",
    async () => {
      const p = await fresh();
      let fail = true;
      await p.route("**/weights_transformer.json", async (route) => {
        if (fail) await route.fulfill({ status: 503, body: "unavailable" });
        else await route.continue();
      });
      await p.goto(results.url);
      await ready(p);
      await p.locator("#retryTransformer").waitFor({ state: "visible" });
      assert.match(
        await p.locator("#transformerLiveStat").innerText(),
        /unavailable/i,
      );
      assert.strictEqual(
        await p.evaluate(() => state.result.weights),
        "trained",
      );
      fail = false;
      await p.locator("#retryTransformer").click();
      await p.waitForFunction(
        () =>
          transformerModels.trained &&
          document.querySelector("#retryTransformer").hidden,
      );
      assert.match(await p.locator("#transformerLiveStat").innerText(), /LIVE/);
      await p.close();
    },
  );
  await check(
    "Layer and weight radio arrows update selection and roving tab stop",
    async () => {
      const p = await fresh();
      await p.goto(results.url);
      await ready(p);
      await p.locator("#layerSeg button.is-active").focus();
      await p.keyboard.press("ArrowRight");
      await ready(p);
      assert.strictEqual(await p.evaluate(() => state.layer), 3);
      assert.strictEqual(
        await p.locator('#layerSeg button[tabindex="0"]').count(),
        1,
      );
      assert.strictEqual(
        await p
          .locator('#layerSeg button[aria-checked="true"]')
          .getAttribute("data-layer"),
        "3",
      );
      await p.locator("#weightsSeg button.is-active").focus();
      await p.keyboard.press("ArrowRight");
      await ready(p);
      assert.strictEqual(await p.evaluate(() => state.weights), "untrained");
      assert.strictEqual(
        await p.locator('#weightsSeg button[tabindex="0"]').count(),
        1,
      );
      assert.strictEqual(
        await p.evaluate(() => document.activeElement.dataset.weights),
        "untrained",
      );
      await p.keyboard.press("Home");
      await ready(p);
      assert.strictEqual(await p.evaluate(() => state.weights), "trained");
      await p.keyboard.press("Tab");
      assert.notStrictEqual(
        await p.evaluate(() => document.activeElement.dataset.weights),
        "untrained",
      );
      await p.close();
    },
  );
  await browser.close();
  fs.writeFileSync(
    path.join(__dirname, "../docs/browser-edge-check.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
  if (results.errors.length || results.checks.some((x) => !x.passed))
    process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
