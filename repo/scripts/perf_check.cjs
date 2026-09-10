"use strict";
/*
 * Performance benchmark for the scroll and token-playback passes. This is
 * the instrument, not an opinion: it drives the page the way a reader or a
 * learner clicking "Play tokens" would, records frame-to-frame intervals,
 * long tasks and Chrome's own layout/style recalc counters, and fails when
 * the numbers cross thresholds fixed in this file rather than in someone's
 * memory of how the page felt.
 *
 * Measurements are noisy, so every metric here is taken across several runs
 * and reduced with a median rather than trusted from a single sample. See
 * RUNS_* below for exactly how many.
 *
 *   npm install --prefix <tools> playwright
 *   PLAYWRIGHT_MODULE=<tools>/node_modules/playwright \
 *   TEST_URL=http://127.0.0.1:8000/ node scripts/perf_check.cjs
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
  path.resolve(__dirname, "../docs/perf-verification.json");

/* How many independent samples each metric is built from. Time-to-first-
 * measurement and the scroll pass are cheap, so they get more runs. Token
 * playback runs the full 77-token sequence at 8 steps per second (about 9.6
 * seconds) each time, so three runs already costs half a minute; that is
 * enough to see the spread without turning this into a slow check. */
const RUNS_TTFM = 5;
const RUNS_SCROLL = 5;
const RUNS_PLAYBACK = 3;
const SCROLL_STEPS = 120;
const TOKEN_COUNT = 77;
const TOKEN_STEP_MS = 125; // 8 steps per second, matches app.js's playbackTimer

/* Thresholds. A p95 frame interval under 32ms is two dropped frames at 60Hz
 * at worst, which reads as smooth; a single frame over 50ms is barely
 * noticeable but several in a row is the "page bogged down" a reader would
 * actually report, so a couple are tolerated and more are not. 200ms is the
 * point a long task starts to feel like the page froze rather than merely
 * lagged. These were sanity-checked against real runs of this page (see the
 * report this script prints); they leave some headroom for machine noise
 * but are not so loose that a genuinely janky page would pass. */
const THRESHOLDS = {
  scrollP95Ms: 32,
  scrollFramesOver50Max: 2,
  playbackP95Ms: 32,
  playbackFramesOver50Max: 2,
  longTaskMaxMs: 200,
  timeToFirstMeasurementMs: 4000,
};

const median = (arr) => {
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

/* Reduce an array of frame intervals (milliseconds) to the shape used
 * throughout this script: median, p95, worst, and counts past two
 * thresholds a reader would actually feel. */
function frameStats(frames) {
  const sorted = frames.slice().sort((a, b) => a - b);
  return {
    frameCount: frames.length,
    medianMs: +median(frames).toFixed(2),
    p95Ms: +percentile(sorted, 0.95).toFixed(2),
    worstMs: +sorted[sorted.length - 1].toFixed(2),
    framesOver32ms: frames.filter((f) => f > 32).length,
    framesOver50ms: frames.filter((f) => f > 50).length,
  };
}

/* Combine several per-run frameStats objects into one summary using the
 * median of each field across runs, plus the raw per-run breakdown so a
 * reader of the JSON can see the spread rather than take the summary on
 * faith. */
function summarizeRuns(runs) {
  const field = (name) => median(runs.map((r) => r[name]));
  return {
    runs: runs.length,
    medianMs: +field("medianMs").toFixed(2),
    p95Ms: +field("p95Ms").toFixed(2),
    worstMs: +field("worstMs").toFixed(2),
    framesOver32ms: +field("framesOver32ms").toFixed(1),
    framesOver50ms: +field("framesOver50ms").toFixed(1),
    perRun: runs,
  };
}

async function getCdpMetrics(client) {
  const { metrics } = await client.send("Performance.getMetrics");
  const map = {};
  for (const m of metrics) map[m.name] = m.value;
  return {
    LayoutCount: map.LayoutCount,
    RecalcStyleCount: map.RecalcStyleCount,
    LayoutDuration: map.LayoutDuration,
    RecalcStyleDuration: map.RecalcStyleDuration,
  };
}

/* Runs one scroll pass in the page and returns the raw frame intervals.
 * Scrolls in small steps across the whole document, one rAF per step, the
 * way a reader dragging a scrollbar or flicking a trackpad would move. */
async function runScroll(page) {
  return page.evaluate(async (steps) => {
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(r));
    const frames = [];
    let last = performance.now();
    let running = true;
    const tick = (now) => {
      frames.push(now - last);
      last = now;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    for (let i = 0; i <= steps; i++) {
      window.scrollTo(0, Math.max(0, Math.round((i / steps) * total)));
      await new Promise((r) => requestAnimationFrame(r));
    }
    running = false;
    frames.shift(); // first interval has no preceding frame to measure from
    return frames;
  }, SCROLL_STEPS);
}

/* Resets the token slider to 0 (mirrors the app's own reset path: an
 * "input" event on the slider, which the page's own listener uses to stop
 * any running playback and select token 0), then clicks Play tokens and
 * records frame intervals until the button reports playback finished on its
 * own, the same signal a viewer would read off the page. */
async function runPlayback(page) {
  await page.evaluate(() => {
    const slider = document.getElementById("tokenSlider");
    slider.value = "0";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#playTokens").click();
  const frames = await page.evaluate(async (tokenStepMs) => {
    const frames = [];
    let last = performance.now();
    let raf;
    const tick = (now) => {
      frames.push(now - last);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const btn = document.getElementById("playTokens");
    const timeoutMs = tokenStepMs * 77 + 5000; // generous ceiling, not a measurement
    const started = performance.now();
    await new Promise((resolve) => {
      let sawPause = false;
      const check = () => {
        if (btn.textContent === "Pause") sawPause = true;
        if (
          (sawPause && btn.textContent === "Play tokens") ||
          performance.now() - started > timeoutMs
        ) {
          resolve();
          return;
        }
        setTimeout(check, 40);
      };
      check();
    });
    cancelAnimationFrame(raf);
    frames.shift();
    return frames;
  }, TOKEN_STEP_MS);
  return frames;
}

(async () => {
  const launch = { headless: true };
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launch);

  const report = {
    url,
    checked_at: new Date().toISOString(),
    note:
      "These are headless Chromium numbers from one machine on one occasion, not a claim about any particular phone or a busy laptop. They measure this page's own frame pacing and Chrome's internal layout counters, which is the most objective signal available in this environment, but they are not a substitute for feel-testing on real hardware.",
    thresholds: THRESHOLDS,
    runsPlanned: { ttfm: RUNS_TTFM, scroll: RUNS_SCROLL, playback: RUNS_PLAYBACK },
    errors: [],
    checks: [],
    failures: [],
    metrics: {},
    passed: false,
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    /* the privacy note is dismissed up front so it never sits over the
     * content being scrolled or intercepts a click during a run */
    await page.addInitScript(() => {
      try {
        localStorage.setItem("bdh-privacy-ack", "1");
      } catch (e) {}
    });
    page.on("pageerror", (error) => report.errors.push(String(error.message)));
    page.on("console", (message) => {
      if (message.type() === "error") report.errors.push(message.text());
    });

    /* --- time to first measurement -------------------------------------
     * Fresh navigation each run: this is the only metric where a warm page
     * would be cheating, since a real visitor only ever sees the cold one. */
    const ttfmRuns = [];
    for (let i = 0; i < RUNS_TTFM; i++) {
      const t0 = Date.now();
      if (i === 0) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      } else {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      }
      await page.waitForFunction(
        () =>
          typeof state !== "undefined" && state.result && !state.result.pending,
        null,
        { timeout: 60000 },
      );
      ttfmRuns.push(Date.now() - t0);
    }
    report.metrics.timeToFirstMeasurementMs = {
      runs: RUNS_TTFM,
      medianMs: median(ttfmRuns),
      worstMs: Math.max(...ttfmRuns),
      perRun: ttfmRuns,
    };
    report.checks.push(
      "Time to first measurement over " +
        RUNS_TTFM +
        " fresh loads: median " +
        median(ttfmRuns) +
        "ms, worst " +
        Math.max(...ttfmRuns) +
        "ms",
    );

    /* The page from the last TTFM run is already loaded with a result, so
     * it is reused for the rest of the checks instead of paying for another
     * navigation. Long tasks are watched from here through the end of the
     * playback runs, which is the span the rest of this script exercises. */
    await page.evaluate(() => {
      window.__perfLongTasks = [];
      try {
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__perfLongTasks.push(Math.round(e.duration));
          }
        });
        po.observe({ entryTypes: ["longtask"] });
        window.__perfLongTaskObserver = po;
      } catch (e) {
        /* longtask entries are not available in every Chromium build; an
         * empty list is reported rather than failing the whole check */
      }
    });

    const client = await context.newCDPSession(page);
    await client.send("Performance.enable");
    const cdpBefore = await getCdpMetrics(client);

    /* --- scroll smoothness ---------------------------------------------- */
    const scrollRuns = [];
    for (let i = 0; i < RUNS_SCROLL; i++) {
      const frames = await runScroll(page);
      scrollRuns.push(frameStats(frames));
    }
    const scrollSummary = summarizeRuns(scrollRuns);
    report.metrics.scroll = scrollSummary;
    report.checks.push(
      "Scroll, " +
        RUNS_SCROLL +
        " runs of " +
        SCROLL_STEPS +
        " steps each: median frame interval " +
        scrollSummary.medianMs +
        "ms, p95 " +
        scrollSummary.p95Ms +
        "ms, worst " +
        scrollSummary.worstMs +
        "ms, frames over 50ms " +
        scrollSummary.framesOver50ms +
        " (median across runs)",
    );

    const cdpAfter = await getCdpMetrics(client);
    report.metrics.cdp = {
      before: cdpBefore,
      after: cdpAfter,
      delta: {
        LayoutCount: cdpAfter.LayoutCount - cdpBefore.LayoutCount,
        RecalcStyleCount: cdpAfter.RecalcStyleCount - cdpBefore.RecalcStyleCount,
        LayoutDurationMs: +((cdpAfter.LayoutDuration - cdpBefore.LayoutDuration) * 1000).toFixed(2),
        RecalcStyleDurationMs: +((cdpAfter.RecalcStyleDuration - cdpBefore.RecalcStyleDuration) * 1000).toFixed(2),
      },
      note:
        "Before/after span the " +
        RUNS_SCROLL +
        " scroll runs above. Reported for visibility, not gated on a threshold: some layout and style recalc work during a scroll pass is expected and not itself a defect.",
    };
    report.checks.push(
      "CDP layout counters across the scroll runs: +" +
        report.metrics.cdp.delta.LayoutCount +
        " layouts, +" +
        report.metrics.cdp.delta.RecalcStyleCount +
        " style recalcs, " +
        report.metrics.cdp.delta.LayoutDurationMs +
        "ms layout time, " +
        report.metrics.cdp.delta.RecalcStyleDurationMs +
        "ms recalc time",
    );

    /* --- token playback smoothness --------------------------------------
     * 77 tokens at 125ms/step update two 1,024-cell grids each step; this
     * is the other place a reader would notice stutter. */
    const playbackRuns = [];
    for (let i = 0; i < RUNS_PLAYBACK; i++) {
      const frames = await runPlayback(page);
      playbackRuns.push(frameStats(frames));
    }
    const playbackSummary = summarizeRuns(playbackRuns);
    report.metrics.playback = playbackSummary;
    report.checks.push(
      "Token playback, " +
        RUNS_PLAYBACK +
        " full runs of " +
        TOKEN_COUNT +
        " tokens: median frame interval " +
        playbackSummary.medianMs +
        "ms, p95 " +
        playbackSummary.p95Ms +
        "ms, worst " +
        playbackSummary.worstMs +
        "ms, frames over 50ms " +
        playbackSummary.framesOver50ms +
        " (median across runs)",
    );

    /* --- long tasks -------------------------------------------------------
     * Collected across the whole span from just after the last TTFM load
     * through the end of the playback runs above. */
    const longTasks = await page.evaluate(() => window.__perfLongTasks || []);
    const longTaskTotalMs = longTasks.reduce((a, b) => a + b, 0);
    const longestTask = longTasks.length ? Math.max(...longTasks) : 0;
    report.metrics.longTasks = {
      count: longTasks.length,
      totalMs: longTaskTotalMs,
      longestMs: longestTask,
      all: longTasks,
    };
    report.checks.push(
      "Long tasks during scroll and playback: " +
        longTasks.length +
        " totalling " +
        longTaskTotalMs +
        "ms, longest " +
        longestTask +
        "ms",
    );

    /* --- thresholds -------------------------------------------------------
     * All measurements are gathered and written to the report before any
     * threshold is checked, so a failing run still leaves a full set of
     * numbers behind rather than stopping mid-measurement. */
    const check = (ok, message) => {
      if (!ok) report.failures.push(message);
    };
    check(
      scrollSummary.p95Ms <= THRESHOLDS.scrollP95Ms,
      "scroll p95 frame interval " +
        scrollSummary.p95Ms +
        "ms exceeds " +
        THRESHOLDS.scrollP95Ms +
        "ms",
    );
    check(
      scrollSummary.framesOver50ms <= THRESHOLDS.scrollFramesOver50Max,
      "scroll frames over 50ms (" +
        scrollSummary.framesOver50ms +
        ", median across runs) exceeds " +
        THRESHOLDS.scrollFramesOver50Max,
    );
    check(
      playbackSummary.p95Ms <= THRESHOLDS.playbackP95Ms,
      "playback p95 frame interval " +
        playbackSummary.p95Ms +
        "ms exceeds " +
        THRESHOLDS.playbackP95Ms +
        "ms",
    );
    check(
      playbackSummary.framesOver50ms <= THRESHOLDS.playbackFramesOver50Max,
      "playback frames over 50ms (" +
        playbackSummary.framesOver50ms +
        ", median across runs) exceeds " +
        THRESHOLDS.playbackFramesOver50Max,
    );
    check(
      longestTask <= THRESHOLDS.longTaskMaxMs,
      "longest long task " + longestTask + "ms exceeds " + THRESHOLDS.longTaskMaxMs + "ms",
    );
    check(
      median(ttfmRuns) <= THRESHOLDS.timeToFirstMeasurementMs,
      "median time to first measurement " +
        median(ttfmRuns) +
        "ms exceeds " +
        THRESHOLDS.timeToFirstMeasurementMs +
        "ms",
    );

    assert.equal(
      report.errors.length,
      0,
      "page errors: " + report.errors.join(" | "),
    );
    report.passed = report.failures.length === 0;
  } catch (error) {
    report.errors.push(String(error && error.message ? error.message : error));
    report.passed = false;
  } finally {
    await browser.close();
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.passed ? 0 : 1);
  }
})();
