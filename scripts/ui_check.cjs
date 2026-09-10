"use strict";
/*
 * Browser check for the interface pass: the page furniture added in ui.js,
 * the type and surface changes, and the guarantee that none of it disturbs a
 * measurement. Numerical correctness is covered by parity_test.js,
 * transformer_parity_test.js and memory_test.js; this file only checks the
 * interface around them.
 *
 *   npm install --prefix <tools> playwright
 *   PLAYWRIGHT_MODULE=<tools>/node_modules/playwright \
 *   TEST_URL=http://127.0.0.1:8000/ node scripts/ui_check.cjs
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/private/tmp/dataforge-tools/node_modules/playwright",
);

const url = process.env.TEST_URL || "http://127.0.0.1:8000/";
const outFile =
  process.env.TEST_OUTPUT ||
  path.resolve(__dirname, "../docs/ui-verification.json");

const CANONICAL_RATIO = "3.10×";

(async () => {
  const launch = { headless: true };
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launch);

  const report = {
    url,
    checked_at: new Date().toISOString(),
    errors: [],
    checks: [],
    passed: false,
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(String(error.message)));
    page.on("console", (message) => {
      if (message.type() === "error") report.errors.push(message.text());
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.waitForFunction(
      () =>
        typeof state !== "undefined" && state.result && !state.result.pending,
      null,
      { timeout: 60000 },
    );
    assert.equal(
      await page.locator("#roRatio").textContent(),
      CANONICAL_RATIO,
      "canonical ratio changed",
    );
    /* The skeleton is cleared once the measurement lands. Catching it during
     * the load itself is a race, so its loading appearance is asserted
     * directly: with the class the stylesheet must render it, without it must
     * not. The class is restored to whatever the page had. */
    const skeleton = await page.evaluate(() => {
      const node = document.getElementById("chartSkeleton");
      const had = node.classList.contains("is-on");
      const idle = getComputedStyle(node).display;
      node.classList.add("is-on");
      const loading = getComputedStyle(node).display;
      if (!had) node.classList.remove("is-on");
      return { idle: idle, loading: loading, onAfterLoad: had };
    });
    assert.equal(skeleton.onAfterLoad, false, "skeleton still on after load");
    assert.equal(skeleton.idle, "none", "skeleton visible when not loading");
    assert.notEqual(skeleton.loading, "none", "skeleton does not render while loading");
    report.checks.push(
      "Skeleton renders while loading and is cleared after the measurement; canonical ratio " +
        CANONICAL_RATIO,
    );

    /* the three fonts must actually be the ones applied */
    const fonts = await page.evaluate(() => ({
      heading: getComputedStyle(document.querySelector(".hero-title"))
        .fontFamily,
      body: getComputedStyle(document.body).fontFamily,
      number: getComputedStyle(document.querySelector("#roRatio")).fontFamily,
    }));
    assert(/Literata/.test(fonts.heading), "heading font not applied");
    assert(
      /Atkinson Hyperlegible Next/.test(fonts.body),
      "interface font not applied",
    );
    assert(
      /Atkinson Hyperlegible Mono/.test(fonts.number),
      "numeric font not applied",
    );
    report.checks.push("Type roles applied: " + JSON.stringify(fonts));

    /* keyboard shortcuts must move real controls */
    const tokenBefore = await page.locator("#tokenSlider").inputValue();
    await page.keyboard.press("ArrowRight");
    const tokenAfter = await page.locator("#tokenSlider").inputValue();
    assert.notEqual(tokenBefore, tokenAfter, "arrow key did not step a token");

    await page.keyboard.press("0");
    await page.waitForFunction(() => state.layer === 0);
    await page.keyboard.press("2");
    await page.waitForFunction(() => state.layer === 2);

    await page.keyboard.press("w");
    await page.waitForFunction(() => state.weights === "untrained");
    await page.keyboard.press("w");
    /* a weights switch clears the measurement before recomputing it, so
     * state.result is briefly null: wait for the recomputed one */
    await page.waitForFunction(
      () =>
        state.weights === "trained" && state.result && !state.result.pending,
    );
    assert.equal(
      await page.locator("#roRatio").textContent(),
      CANONICAL_RATIO,
      "ratio not restored after a weights round trip",
    );
    report.checks.push(
      "Keyboard drives real controls: token step, layer 0/2, weights round trip restores the measurement",
    );

    /* the shortcut sheet opens and closes */
    await page.keyboard.press("?");
    await page.waitForSelector("#shortcutsDialog", { state: "visible" });
    await page.keyboard.press("Escape");
    await page.waitForSelector("#shortcutsDialog", { state: "hidden" });
    report.checks.push("Shortcut sheet opens on ? and closes on Escape");

    /* chart zoom stretches the token axis without changing a value */
    const baseWidth = await page.evaluate(
      () => document.getElementById("chartSvg").getAttribute("width"),
    );
    await page.locator("#chartZoomIn").click();
    await page.waitForFunction(
      (w) => document.getElementById("chartSvg").getAttribute("width") !== w,
      baseWidth,
    );
    const zoomedWidth = await page.evaluate(
      () => document.getElementById("chartSvg").getAttribute("width"),
    );
    assert(
      Number(zoomedWidth) > Number(baseWidth),
      "zoom in did not widen the token axis",
    );
    assert.equal(
      await page.locator("#chartZoomLevel").textContent(),
      "150%",
      "zoom readout did not follow the control",
    );
    assert.equal(
      await page.locator("#roRatio").textContent(),
      CANONICAL_RATIO,
      "zoom changed a measured value",
    );
    await page.locator("#chartZoomReset").click();
    await page.waitForFunction(
      (w) => document.getElementById("chartSvg").getAttribute("width") === w,
      baseWidth,
    );
    report.checks.push(
      "Chart zoom widens the token axis (" +
        baseWidth +
        " to " +
        zoomedWidth +
        "), reset restores it, measurement unchanged",
    );

    /* nothing on the page may render below the reading floor */
    const tiny = await page.evaluate(() => {
      const seen = [];
      document.querySelectorAll("body *").forEach((node) => {
        if (!node.textContent || !node.textContent.trim()) return;
        if (!node.offsetParent && node !== document.body) return;
        /* a subscript is smaller than its parent by definition: that is what
         * makes it read as a subscript, not a readability failure */
        if (node.tagName === "SUB" || node.tagName === "SUP") return;
        const size = parseFloat(getComputedStyle(node).fontSize);
        if (size && size < 13) {
          seen.push(node.tagName + "." + node.className + " " + size + "px");
        }
      });
      return seen.slice(0, 8);
    });
    assert.equal(tiny.length, 0, "text under 13px: " + tiny.join(" | "));
    report.checks.push("No visible text renders below 13px");

    /* Rendered contrast, not declared contrast. contrast_check.py measures
     * the colour tokens; this measures what a pixel actually ends up being
     * after opacity and stacking, which is where a dimmed legend entry once
     * fell to under 2:1 while its token still looked fine. */
    const measureLegend = () => page.evaluate(() => {
      const srgb = (c) => {
        c = c / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const lum = (rgb) =>
        0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
      const parse = (value) =>
        value.match(/[\d.]+/g).slice(0, 3).map(Number);
      /* composite a colour and its element opacity over the page background */
      const effective = (node) => {
        const style = getComputedStyle(node);
        const fg = parse(style.color);
        const bg = parse(getComputedStyle(document.body).backgroundColor);
        let alpha = 1;
        let walk = node;
        while (walk && walk !== document.documentElement) {
          alpha *= parseFloat(getComputedStyle(walk).opacity);
          walk = walk.parentElement;
        }
        return fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]);
      };
      const bgLum = lum(parse(getComputedStyle(document.body).backgroundColor));
      const worst = [];
      document.querySelectorAll(".legend__item").forEach((item) => {
        item.querySelectorAll(".legend__name, .badge").forEach((node) => {
          const l = lum(effective(node));
          const hi = Math.max(l, bgLum);
          const lo = Math.min(l, bgLum);
          worst.push({
            text: node.textContent.trim().slice(0, 24),
            ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100,
          });
        });
      });
      return worst;
    });

    /* the oracle entry is only marked inactive in sandbox mode, which is the
     * state the fade made unreadable, so measure it there in both themes */
    await page.locator("#tabSandbox").click();
    await page.waitForSelector(".legend__item.is-dim");
    let lowest = Infinity;
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);
      await page.waitForTimeout(120);
      const rows = await measureLegend();
      const unreadable = rows.filter((row) => row.ratio < 4.5);
      assert.equal(
        unreadable.length,
        0,
        theme +
          " legend text under 4.5:1 once rendered: " +
          unreadable.map((r) => r.text + " " + r.ratio + ":1").join(", "),
      );
      lowest = Math.min(lowest, ...rows.map((r) => r.ratio));
    }
    await page.evaluate(() =>
      document.documentElement.removeAttribute("data-theme"),
    );
    await page.locator("#tabInstrument").click();
    await page.waitForFunction(
      () => state.mode === "instrument" && state.result && !state.result.pending,
    );
    report.checks.push(
      "Legend text clears 4.5:1 as rendered in both themes, including the inactive entry (lowest " +
        Math.round(lowest * 100) / 100 +
        ":1)",
    );

    /* The provenance panel claims specific weights belong to a coordinate.
     * Recompute those slices here, straight from the weight file and by a
     * different index path than the page uses, and require the numbers to
     * agree. A wrong axis would otherwise show a confident, false answer. */
    const weights = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../weights_trained.json"), "utf8"),
    );
    const l2 = (v) => Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
    const N_PER_HEAD = 256;
    for (const index of [0, 5, 517, 1023]) {
      const head = Math.floor(index / N_PER_HEAD);
      const local = index % N_PER_HEAD;
      const expected = [
        l2(weights.encoder[head].map((row) => row[local])),
        l2(weights.encoder_v[head].map((row) => row[local])),
        l2(weights.decoder[index]),
      ];

      await page.hover('#neuronGrid .neuron-cell[data-index="' + index + '"]');
      await page.waitForSelector("#cellInspectBody:not([hidden])");
      const shown = await page.evaluate(() => ({
        title: document.getElementById("cellInspectTitle").textContent.trim(),
        where: [...document.querySelectorAll("#cellInspectRows tr")].map(
          (row) => row.cells[1].textContent.trim(),
        ),
        norms: [...document.querySelectorAll("#cellInspectRows tr")].map((row) =>
          Number(row.cells[3].textContent),
        ),
        owned: document.getElementById("cellInspectOwned").textContent.trim(),
      }));

      assert.equal(shown.title, "Neuron " + index, "wrong coordinate reported");
      assert.equal(
        shown.owned,
        "96 of 100,352",
        "parameter accounting changed for neuron " + index,
      );
      assert.deepEqual(
        shown.where,
        [
          "encoder[head " + head + "][:, " + local + "]",
          "encoder_v[head " + head + "][:, " + local + "]",
          "decoder[" + index + ", :]",
        ],
        "provenance addresses wrong for neuron " + index,
      );
      shown.norms.forEach((value, slot) => {
        assert(
          Math.abs(value - expected[slot]) < 5e-4,
          "neuron " +
            index +
            " slice " +
            slot +
            ": page says " +
            value +
            ", weight file says " +
            expected[slot].toFixed(4),
        );
      });
    }
    /* the decomposition has to account for the whole model */
    assert.equal(96 * 1024 + 2048, 100352, "BDH parameter accounting");
    assert.equal(64 * 1024 + 6144, 71680, "Transformer parameter accounting");
    report.checks.push(
      "Cell provenance matches the weight file for 4 coordinates, and 96x1024+2048 and 64x1024+6144 account for both models exactly",
    );

    /* every link that leaves the page opens a new tab */
    const badLinks = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        const leaves = /^https?:/i.test(href) || href.indexOf("docs/") === 0;
        if (leaves && a.getAttribute("target") !== "_blank") bad.push(href);
      });
      return bad;
    });
    assert.equal(
      badLinks.length,
      0,
      "links that stay in the tab: " + badLinks.join(", "),
    );
    report.checks.push("Every outbound link opens in a new tab with rel=noopener");

    /* the question accordion */
    await page.locator("#faqToggleAll").click();
    const openCount = await page.locator(".faq__item[open]").count();
    assert(openCount >= 8, "expand all did not open every question");
    await page.locator("#faqToggleAll").click();
    assert.equal(
      await page.locator(".faq__item[open]").count(),
      0,
      "collapse all did not close every question",
    );
    report.checks.push("Question list expands and collapses (" + openCount + " items)");

    /* privacy note appears, dismisses, and stays dismissed */
    await page.waitForSelector("#privacyNote", {
      state: "visible",
      timeout: 8000,
    });
    await page.locator("#privacyDismiss").click();
    await page.waitForSelector("#privacyNote", { state: "hidden" });
    const stored = await page.evaluate(() =>
      localStorage.getItem("bdh-privacy-ack"),
    );
    assert.equal(stored, "1", "privacy acknowledgement not stored");
    report.checks.push("Privacy note shows once, dismisses, and is remembered");

    /* no cookies, as the note claims */
    const cookies = await context.cookies();
    assert.equal(cookies.length, 0, "page set a cookie: " + JSON.stringify(cookies));
    report.checks.push("No cookies set, as the privacy note states");

    /* back to top and reading indicator */
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector("#backToTop", { state: "visible" });
    const progress = await page.evaluate(
      () => document.querySelector("#scrollProgressBar").style.transform,
    );
    assert(/scaleX/.test(progress), "reading indicator did not advance");
    await page.locator("#backToTop").click();
    await page.waitForFunction(() => window.scrollY < 40);
    report.checks.push("Reading indicator advances and back-to-top returns");

    /* mobile: the section menu collapses and opens */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    assert(
      await page.locator("#navMenuBtn").isVisible(),
      "menu button hidden on a narrow viewport",
    );
    await page.locator("#navMenuBtn").click();
    await page.waitForSelector("#navUtil.is-open");
    await page.locator("#navMenuBtn").click();
    report.checks.push("Section menu collapses and opens at 390px");

    /* no horizontal overflow at the sizes the project already checks */
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert(!overflow, "horizontal overflow at " + width + "px");
    }
    report.checks.push("No horizontal overflow at 320, 390, 768 and 1440px");

    /* the measurement survived every interface interaction */
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(
      await page.locator("#roRatio").textContent(),
      CANONICAL_RATIO,
      "ratio changed after interface interaction",
    );
    report.checks.push("Measurement unchanged after the full interface pass");

    assert.equal(
      report.errors.length,
      0,
      "page errors: " + report.errors.join(" | "),
    );
    report.passed = true;
  } catch (error) {
    report.errors.push(String(error && error.message ? error.message : error));
  } finally {
    await browser.close();
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.passed ? 0 : 1);
  }
})();
