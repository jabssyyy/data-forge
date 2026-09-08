"use strict";
// Optional browser regression check: npm install --prefix /tmp/dataforge-tools playwright
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/private/tmp/dataforge-tools/node_modules/playwright",
);
const url = process.env.TEST_URL || "http://127.0.0.1:8000/";
const output =
  process.env.TEST_OUTPUT || path.resolve(__dirname, "../test-results");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(
    () =>
      state.result &&
      !state.result.pending &&
      transformerModels.untrained &&
      neuronCells.length === 1024,
  );
  await page.waitForFunction(() =>
    document.querySelector("#comparisonResults table"),
  );
  const initial = await page.evaluate(() => ({
    ratio: document.querySelector("#roRatio").textContent,
    word: state.word,
    ms: state.result.ms,
    grid: document.querySelectorAll("#neuronGrid .active").length,
    expected: state.result.activeCounts[state.layer][state.selectedToken],
    cacheEntries: computeCache.size,
  }));
  assert.strictEqual(initial.word, "mmgtfhhe");
  assert.strictEqual(initial.ratio, "3.10×");
  assert.strictEqual(initial.grid, initial.expected);
  await page.screenshot({
    path: path.join(output, "desktop.png"),
    fullPage: true,
  });
  const offline = await page.locator("#comparisonResults").innerText();

  // Both DOM grids must reflect every measured neuron at all fixture tokens/layers.
  let checked = 0;
  for (const kind of ["trained", "untrained"]) {
    await page.evaluate((kind) => setWeights(kind), kind);
    await page.waitForFunction(
      (kind) =>
        state.result &&
        !state.result.pending &&
        state.weights === kind &&
        models[kind],
      kind,
    );
    await page.waitForTimeout(200);
    checked += await page.evaluate(() => {
      let count = 0;
      for (let layer = 0; layer < 4; layer++) {
        setLayer(layer);
        for (let t = 0; t < state.result.T; t++) {
          selectToken(t);
          const bdh = document.querySelectorAll("#neuronGrid .active").length;
          const transformer = document.querySelectorAll(
            "#transformerGrid .active",
          ).length;
          if (bdh !== state.result.activeCounts[layer][t])
            throw new Error("BDH grid mismatch");
          if (transformer !== liveTransformerResult().activeCounts[layer][t])
            throw new Error("Transformer grid mismatch");
          count++;
        }
      }
      return count;
    });
  }
  assert.strictEqual(checked, 616);

  // The guide must restore known state, including layer 2 for the random control.
  await page.locator("#guideNext").click();
  await page.waitForFunction(
    () =>
      state.repeats === 1 &&
      state.layer === 2 &&
      state.weights === "trained" &&
      state.result.T === 21,
  );
  assert.match(await page.locator("#roRatio").innerText(), /—|–|N\/A/);
  await page.locator("#guideNext").click();
  await page.waitForFunction(
    () => state.repeats === 8 && state.result.T === 77,
  );
  await page.locator("#guideNext").click();
  await page.waitForFunction(() => state.layer === 0);
  await page.locator("#guideNext").click();
  await page.waitForFunction(
    () => state.layer === 2 && state.weights === "untrained",
  );
  await page.waitForTimeout(200);
  assert.strictEqual(await page.locator("#roRatio").innerText(), "1.04×");
  await page.locator("#guideNext").click();
  assert(await page.locator("#guide").isHidden());
  assert.strictEqual(
    await page.locator("#comparisonResults").innerText(),
    offline,
  );

  await page.evaluate(() => selectToken(0));
  assert.strictEqual(await page.locator("#neuronGrid .active").count(), 0);
  await page.locator("#playTokens").click();
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => state.selectedToken > 0));
  await page.locator("#playTokens").click();
  const stoppedAt = await page.evaluate(() => state.selectedToken);
  await page.waitForTimeout(200);
  assert.strictEqual(await page.evaluate(() => state.selectedToken), stoppedAt);

  // Sequence shrink clamps selection and no-repeat means remain unavailable.
  await page.evaluate(() => selectToken(76));
  await page.locator("#repeatSlider").fill("1");
  await page.locator("#repeatSlider").dispatchEvent("input");
  await page.waitForFunction(() => state.result && state.result.T === 21);
  assert(await page.evaluate(() => state.selectedToken < state.result.T));
  assert.strictEqual(
    await page.locator("#comparisonResults").innerText(),
    offline,
  );
  await page.locator("#tabSandbox").click();
  await page.locator("#sandboxInput").fill("a".repeat(96));
  await page.locator("#sandboxInput").dispatchEvent("input");
  await page.waitForFunction(() => state.result && state.result.T === 96);
  assert(await page.locator("#offdistBanner").isVisible());

  await page.locator("#tabInstrument").click();
  await page.locator("#repeatSlider").fill("8");
  await page.locator("#repeatSlider").dispatchEvent("input");
  await page.locator('[data-weights="trained"]').click();
  await page.locator('[data-layer="2"]').click();
  await page.waitForFunction(() => state.result && state.result.T === 77);
  const viewports = [];
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const width of [380, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      const metrics = await page.evaluate(() => ({
        body: document.documentElement.scrollWidth,
        viewport: innerWidth,
        gridColumns: getComputedStyle(
          document.querySelector("#neuronGrid"),
        ).gridTemplateColumns.split(" ").length,
      }));
      assert(
        metrics.body <= metrics.viewport,
        `Overflow ${theme} ${width}: ${JSON.stringify(metrics)}`,
      );
      if (width === 380) assert.strictEqual(metrics.gridColumns, 16);
      viewports.push({ theme, width, ...metrics });
      if (width !== 768)
        await page.screenshot({
          path: path.join(output, `${theme}-${width}.png`),
          fullPage: true,
        });
    }
  }
  assert.deepStrictEqual(errors, []);
  // Fetch failures must produce an honest unavailable state, not fake live values.
  const failed = await browser.newPage();
  await failed.route("**/weights_trained.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await failed.goto(url);
  await failed.waitForFunction(() =>
    document.querySelector("#chartStatus").textContent.includes("503"),
  );
  assert.strictEqual(await failed.locator("#roRatio").innerText(), "—");
  assert(await failed.locator("#playTokens").isDisabled());
  await failed.close();
  const report = {
    passed: true,
    browser: browser.version(),
    url,
    initial,
    gridStatesChecked: checked,
    viewports,
    pageErrors: errors,
    checks: [
      "both grids all layers/tokens/weights",
      "guide states",
      "offline immutability",
      "play/pause",
      "sequence shrink",
      "sandbox96",
      "light/dark",
      "380px/768px/1440px",
      "reduced motion",
      "weight failure",
    ],
    realPhoneTest: "not performed; browser viewport emulation only",
  };
  fs.writeFileSync(
    path.join(output, "browser-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
