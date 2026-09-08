"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/private/tmp/dataforge-tools/node_modules/playwright",
);
(async () => {
  assert(process.env.TEST_URL, "Set TEST_URL to the immutable release preview");
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const report = {
    url: process.env.TEST_URL,
    checked_at: new Date().toISOString(),
    errors: [],
    checks: [],
  };
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto(report.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    report.confirmation =
      (await page.getByText("One more step", { exact: true }).count()) > 0;
    if (report.confirmation)
      await page
        .getByRole("button", { name: "Open the page", exact: true })
        .click();
    await page.waitForFunction(
      () =>
        typeof state !== "undefined" &&
        state.result &&
        !state.result.pending &&
        transformerModels.trained,
      null,
      { timeout: 60000 },
    );
    assert.equal(await page.locator("#roRatio").textContent(), "3.10×");
    report.checks.push("Both trained models loaded; canonical ratio preserved");
    await page.locator("#memoryLab").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      document.querySelector(".memory-graph__node"),
    );
    await page.locator("#memoryModeDecay").click();
    await page.waitForFunction(
      () =>
        typeof memoryLabController !== "undefined" &&
        memoryLabController.analysis?.trace.decay < 1 &&
        document.querySelector("#memoryLab").getAttribute("aria-busy") ===
          "false",
    );
    report.checks.push("Public graph and full-model experimental decay loaded");
    await page.locator('button[data-weights="untrained"]').click();
    await page.waitForFunction(
      () =>
        state.result?.weights === "untrained" && transformerModels.untrained,
    );
    report.checks.push("Random-weight controls loaded");
    const pdfs = [];
    for (const file of ["docs/concept-summary.pdf", "docs/blog.pdf"]) {
      const url = new URL(file, report.url).href;
      const response = await page.request.get(url);
      assert(response.ok());
      const body = await response.body();
      assert.equal(body.subarray(0, 5).toString(), "%PDF-");
      const digest = bytes => createHash('sha256').update(bytes).digest('hex');
      const sha256 = digest(body);
      assert.equal(sha256, digest(fs.readFileSync(file)));
      pdfs.push({file, url, bytes: body.length, sha256, matchesLocal: true});
      report.checks.push(file + " downloaded and matches verified local PDF");
    }
    assert.equal(report.errors.length, 0);
    report.passed = true;
    fs.writeFileSync('docs/public-pdf-verification.json', JSON.stringify({checked_at: report.checked_at, passed: true, files: pdfs}, null, 2) + '\n');
    fs.writeFileSync(
      "docs/public-preview-check.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
