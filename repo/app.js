"use strict";
/* =====================================================================
 * app.js - UI, chart and controls for "Sparsity is not a budget".
 *
 * Everything on the page is one of four things, and each is labelled as
 * such in the DOM:
 *
 *   LIVE         the BDH forward pass in bdh.js, run in this browser on
 *                every control change. Nothing here is replayed.
 *   ANALYTIC     oracle surprisal, closed form from the sequence
 *                definition. No model touches it.
 *   PRECOMPUTED  the two weight files, trained once on one CPU core.
 *   SYNTHETIC    the letter corpus (BDH paper Section 6.4 protocol).
 *
 * CHART ARCHITECTURE - why two panels and not three curves on one plot.
 * Active-neuron fraction is a fraction (0..1); oracle surprisal and model
 * cross-entropy are bits (0..~9). Putting a fraction and a bit count on
 * one plot needs two y-scales, and the alignment between two y-scales is
 * arbitrary - it invents a correlation the data does not contain. So the
 * two bit-valued curves share one axis in the lower panel, the fraction
 * gets its own axis in the upper panel, and both panels share one token
 * axis. Every visual comparison the reader makes is then a real one.
 *
 * CURVE ALIGNMENT. bdh.js returns cross-entropy indexed by the position
 * MAKING the prediction: entry t is -log2 p(token t+1), so there are T-1
 * of them. Oracle surprisal is indexed by the token BEING predicted. To
 * make the two comparable, cross-entropy is plotted at index t+1 - the
 * token it is about. Token 0 therefore has no cross-entropy value, which
 * is correct: nothing predicted it. This is the `of_target` alignment
 * that bdh_probe.py reports alongside `at_position`.
 * ===================================================================== */

/* ---- protocol constants (BDH paper Section 6.4; see build.md 4.2) ---- */
const WARMUP_LEN = 13; // fixed 13-letter warm-up
const WORD_LEN = 8; // 8-letter random word
const ALPHABET = 26; // single Latin letters
const N_TOTAL = 1024; // neurons in this shrunk model (paper: 65536)

const WEIGHT_FILES = {
  trained: "weights_trained.json",
  untrained: "weights_untrained.json",
};

/* ------------------------------------------------------------- state */
const state = {
  mode: "instrument", // 'instrument' | 'sandbox'
  layer: 2,
  repeats: 8,
  word: "mmgtfhhe",
  weights: "trained",
  sandboxText: "thequickbrownfoxjumpsoverthelazydog",
  selectedToken: 13,
  hover: null, // hovered token index, or null
  result: null, // last successful compute
  warmup: null, // the 13 fixed warm-up token ids, from the weight file
  chartZoom: 1, // horizontal magnification of the token axis, 1 to 4
};

const modelLoads = {};
let weightSelectionVersion = 0;
const models = {}; // kind -> BDH instance
const computeCache = new Map();
const transformerModels = {};
const transformerLoadErrors = {};
const transformerLoads = {};
const transformerCache = new Map();

/* --------------------------------------------------------------- dom */
const $ = (id) => document.getElementById(id);

const el = {
  claimBar: $("claimBar"),
  tabInstrument: $("tabInstrument"),
  tabSandbox: $("tabSandbox"),
  themeToggle: $("themeToggle"),
  themeToggleLabel: $("themeToggleLabel"),
  offdist: $("offdistBanner"),
  figureSub: $("figureSub"),
  roMem: $("roMem"),
  roRep: $("roRep"),
  roRatio: $("roRatio"),
  roLayerTag: $("roLayerTag"),
  readout: $("readout"),
  legend: $("legend"),
  chartWrap: $("chartWrap"),
  svg: $("chartSvg"),
  status: $("chartStatus"),
  statusText: $("chartStatusText"),
  tooltip: $("tooltip"),
  phaseMeansRow: $("phaseMeansRow"),
  tableToggle: $("tableToggle"),
  tableView: $("tableView"),
  tableBody: $("tableBody"),
  controls: $("controls"),
  layerSeg: $("layerSeg"),
  layerMeta: $("layerMeta"),
  repeatSlider: $("repeatSlider"),
  repeatOut: $("repeatOut"),
  repeatMeta: $("repeatMeta"),
  wordInput: $("wordInput"),
  wordMsg: $("wordMsg"),
  weightsSeg: $("weightsSeg"),
  weightsMeta: $("weightsMeta"),
  sandboxControl: $("sandboxControl"),
  sandboxInput: $("sandboxInput"),
  sandboxMsg: $("sandboxMsg"),
  noteTok0: $("noteTok0"),
  noteAlign: $("noteAlign"),
  buildStamp: $("buildStamp"),
};

/* --------------------------------------------------------- utilities */
const letterOf = (id) => String.fromCharCode(97 + id);
const idOf = (ch) => ch.charCodeAt(0) - 97;
const pct = (v) => (v * 100).toFixed(1) + "%";
const bits = (v) => v.toFixed(2);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/* Phase of each token in the instrument sequence. Token 0 is warm-up but is
 * excluded from every mean - see excludeTokenZero below. */
function phaseAt(i, repeats) {
  if (i < WARMUP_LEN) return "warmup";
  if (i < WARMUP_LEN + WORD_LEN) return "memorize";
  return "repeat";
}

/* Mean over a phase, ALWAYS skipping token 0.
 * Token 0 attends to nothing (attention is tril(diagonal=-1)) so it reads
 * exactly 0.0% in every layer. Averaging that into the warm-up figure would
 * drag it down by a constant that is a property of the code, not of the model.
 * The probe's published 18.14% warm-up figure DOES include token 0; this page
 * says so in the honesty panel rather than quietly reporting a different number. */
function phaseMean(series, repeats, phase) {
  let sum = 0,
    n = 0;
  for (let i = 1; i < series.length; i++) {
    if (phaseAt(i, repeats) === phase) {
      sum += series[i];
      n++;
    }
  }
  return n ? sum / n : null;
}

/* ------------------------------------------------------ weight loading */
async function getModel(kind) {
  if (models[kind]) return models[kind];
  if (modelLoads[kind]) return modelLoads[kind];
  modelLoads[kind] = (async () => {
    const res = await fetch(WEIGHT_FILES[kind], { cache: "force-cache" });
    if (!res.ok)
      throw new Error("HTTP " + res.status + " for " + WEIGHT_FILES[kind]);
    const json = await res.json();
    const model = new BDH(json);
    if (
      model.w.nTotal !== N_TOTAL ||
      model.w.nLayer !== 4 ||
      !Array.isArray(json.warmup) ||
      json.warmup.length !== WARMUP_LEN
    )
      throw new Error("Unsupported model dimensions or warm-up");
    for (const tensor of [
      model.w.embed,
      model.w.encoder,
      model.w.encoderV,
      model.w.decoder,
      model.w.lmHead,
    ]) {
      if (!tensor.every(Number.isFinite))
        throw new Error("Non-finite model weights");
    }
    models[kind] = model;
    if (!state.warmup) state.warmup = json.warmup.slice();
    return model;
  })();
  try {
    return await modelLoads[kind];
  } finally {
    delete modelLoads[kind];
  }
}

/* ---------------------------------------------------------- sequences */
function buildTokens() {
  if (state.mode === "sandbox") {
    return state.sandboxText.split("").map(idOf);
  }
  const word = state.word.split("").map(idOf);
  return buildSequence(state.warmup, word, state.repeats);
}

/* --------------------------------------------------------- computation */
function cacheKey() {
  return state.mode === "sandbox"
    ? "S|" + state.weights + "|" + state.sandboxText
    : "I|" + state.weights + "|" + state.word + "|" + state.repeats;
}

function compute() {
  const key = cacheKey();
  if (computeCache.has(key)) return computeCache.get(key);

  const model = models[state.weights];
  if (!model) return null;

  const tokens = buildTokens();
  const t0 = performance.now();
  const out = model.forward(tokens, { keepRaw: true });
  const ms = performance.now() - t0;

  const T = tokens.length;

  /* cross-entropy re-indexed onto the token being predicted (see header) */
  const ceAtTarget = new Array(T).fill(null);
  for (let t = 0; t < T - 1; t++) ceAtTarget[t + 1] = out.crossEntropyBits[t];

  /* oracle surprisal: ANALYTIC, no model involved */
  let oracle = null;
  if (state.mode === "instrument") {
    oracle = oracleSurprisalBits(WARMUP_LEN, WORD_LEN, state.repeats);
  }

  const result = {
    tokens: tokens,
    weights: state.weights,
    T: T,
    activeFraction: out.activeFraction,
    activeCounts: out.activeCounts,
    xySparse: out.xySparse,
    ceAtTarget: ceAtTarget,
    oracle: oracle,
    ms: ms,
    mode: state.mode,
    repeats: state.repeats,
  };

  // Four raw tensors per result; retain at most three input/model combinations.
  if (computeCache.size >= 3)
    computeCache.delete(computeCache.keys().next().value);
  computeCache.set(key, result);
  return result;
}

/* ============================== CHART ================================= */

const FONT_MONO =
  "'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/* Chart label sizes. The axis and annotation type is set here rather than in
 * CSS because the SVG is built as a string with baked-in attributes. */
const T_TICK = 13; // axis tick numbers
const T_LABEL = 13; // panel captions and phase names
const T_VALUE = 14; // the two phase-mean values drawn on the curve

/* Axis ticks land on round numbers or they are not worth printing. Pick the
 * smallest offered step that covers the data in at most `maxIntervals`
 * intervals, so every printed tick is a clean multiple of that step. */
function niceScale(maxVal, steps, maxIntervals, floor) {
  for (const step of steps) {
    const n = Math.ceil(Math.max(maxVal, floor) / step - 1e-9);
    if (n <= maxIntervals) return { max: n * step, ticks: n, step: step };
  }
  const step = steps[steps.length - 1];
  const n = Math.ceil(Math.max(maxVal, floor) / step - 1e-9);
  return { max: n * step, ticks: n, step: step };
}

function pickXTicks(T, plotW, isInstrument) {
  const minGap = 36;
  const ticks = [];
  const push = (i) => {
    if (i < 0 || i > T - 1) return;
    for (const e of ticks)
      if (Math.abs(e - i) * (plotW / (T - 1)) < minGap) return;
    ticks.push(i);
  };
  push(0);
  if (isInstrument) {
    push(WARMUP_LEN);
    push(WARMUP_LEN + WORD_LEN);
  }
  push(T - 1);
  const stride = T <= 24 ? 4 : T <= 48 ? 8 : 16;
  for (let i = stride; i < T - 1; i += stride) push(i);
  return ticks.sort((a, b) => a - b);
}

function renderChart() {
  const r = state.result;
  const wrap = el.chartWrap;
  /* Zoom stretches the token axis and lets the figure scroll, rather than
   * scaling the whole drawing. Tokens spread out, the type stays the size it
   * was set at, and the value axis keeps its position. */
  const W = Math.max(300, (wrap.clientWidth - 16) * state.chartZoom);
  const narrow = W < 520;

  /* geometry */
  const padL = narrow ? 38 : 46;
  const padR = narrow ? 12 : 18;
  const capH = 15; // panel-A caption row
  const phaseH = 16; // phase-label row, directly above the bands
  const hA = narrow ? 126 : 176;
  const midGap = narrow ? 30 : 34;
  const hB = narrow ? 88 : 122;
  const axisH = 32;
  const topH = capH + phaseH;
  const H = topH + hA + midGap + hB + axisH;
  const plotW = W - padL - padR;
  const aTop = topH;
  const bTop = topH + hA + midGap;

  const svg = el.svg;
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);

  /* colours read from the token system so both themes are correct */
  const cAct = cssVar("--s-act");
  const cCe = cssVar("--s-ce");
  const cOr = cssVar("--s-oracle");
  const cActWash = cssVar("--s-act-wash");
  const cOrWash = cssVar("--s-oracle-wash");
  const cGrid = cssVar("--grid");
  const cAxis = cssVar("--axis");
  const cInk2 = cssVar("--ink-2");
  const cInk3 = cssVar("--ink-3");
  const cSurface = cssVar("--surface");
  const cBandWarm = cssVar("--band-warm");
  const cBandMem = cssVar("--band-mem");

  if (!r) {
    svg.innerHTML = "";
    return;
  }

  const T = r.T;
  const isInstrument = r.mode === "instrument";
  const pendingModel = !!r.pending; // weights still loading: no model curves yet
  const act = r.activeFraction[state.layer];

  /* scales */
  const x = (i) => padL + (T === 1 ? plotW / 2 : (i / (T - 1)) * plotW);

  const tr = liveTransformerResult();
  let maxAct = 0;
  if (tr)
    for (const value of tr.activeFraction[state.layer])
      maxAct = Math.max(maxAct, value);
  for (let i = 0; i < T; i++) if (act[i] > maxAct) maxAct = act[i];
  const sA = niceScale(maxAct, [0.02, 0.05, 0.1], 5, 0.1);
  const maxA = sA.max;
  const yA = (v) => aTop + hA - (v / maxA) * hA;

  let maxBits = isInstrument ? Math.log2(ALPHABET) : 0;
  for (let i = 0; i < T; i++)
    if (r.ceAtTarget[i] != null && r.ceAtTarget[i] > maxBits)
      maxBits = r.ceAtTarget[i];
  const sB = niceScale(maxBits, [1, 2, 5], 4, 5);
  const maxB = sB.max;
  const yB = (v) => bTop + hB - (v / maxB) * hB;

  const out = [];
  const line = (x1, y1, x2, y2, stroke, w, extra) =>
    out.push(
      '<line x1="' +
        x1.toFixed(1) +
        '" y1="' +
        y1.toFixed(1) +
        '" x2="' +
        x2.toFixed(1) +
        '" y2="' +
        y2.toFixed(1) +
        '" stroke="' +
        stroke +
        '" stroke-width="' +
        (w || 1) +
        '"' +
        (extra || "") +
        "/>",
    );
  const text = (tx, ty, str, fill, size, anchor, extra) =>
    out.push(
      '<text x="' +
        tx.toFixed(1) +
        '" y="' +
        ty.toFixed(1) +
        '" fill="' +
        fill +
        '" font-size="' +
        size +
        '" text-anchor="' +
        (anchor || "start") +
        '" font-family="' +
        FONT_MONO +
        '"' +
        (extra || "") +
        ">" +
        esc(str) +
        "</text>",
    );

  /* ---------------- phase bands: SYNTHETIC structure of the corpus ---- */
  if (isInstrument) {
    const bands = [
      ["warmup", 0, WARMUP_LEN - 1, cBandWarm, "warm-up"],
      ["memorize", WARMUP_LEN, WARMUP_LEN + WORD_LEN - 1, cBandMem, "memorize"],
      ["repeat", WARMUP_LEN + WORD_LEN, T - 1, "none", "repeat"],
    ];
    for (const [, i0, i1, fill, label] of bands) {
      if (i1 < i0) continue;
      const xa = i0 === 0 ? padL : (x(i0) + x(i0 - 1)) / 2;
      const xb = i1 >= T - 1 ? padL + plotW : (x(i1) + x(i1 + 1)) / 2;
      if (fill !== "none") {
        out.push(
          '<rect x="' +
            xa.toFixed(1) +
            '" y="' +
            aTop +
            '" width="' +
            (xb - xa).toFixed(1) +
            '" height="' +
            (bTop + hB - aTop) +
            '" fill="' +
            fill +
            '"/>',
        );
      }
      if (xb - xa > 34) {
        text(
          (xa + xb) / 2,
          topH - 5,
          label.toUpperCase(),
          cInk3,
          T_LABEL,
          "middle",
          ' letter-spacing="0.09em"',
        );
      }
      if (i0 > 0) line(xa, aTop, xa, bTop + hB, cAxis, 1);
    }
  }

  /* ------------------------------------------- gridlines + y-axis ---- */
  for (let k = 0; k <= sA.ticks; k++) {
    const v = sA.step * k;
    const yy = yA(v);
    line(padL, yy, padL + plotW, yy, k === 0 ? cAxis : cGrid, 1);
    text(padL - 7, yy + 4.5, Math.round(v * 100) + "%", cInk3, T_TICK, "end");
  }
  for (let k = 0; k <= sB.ticks; k++) {
    const v = sB.step * k;
    const yy = yB(v);
    line(padL, yy, padL + plotW, yy, k === 0 ? cAxis : cGrid, 1);
    text(padL - 7, yy + 4.5, String(v), cInk3, T_TICK, "end");
  }

  /* panel captions */
  out.push(
    '<text x="' +
      padL +
      '" y="' +
      (bTop - 11) +
      '" fill="' +
      cInk3 +
      '" font-size="' + T_LABEL + '" font-family="' +
      FONT_MONO +
      '" letter-spacing="0.08em">BITS</text>',
  );
  out.push(
    '<text x="' +
      (padL + plotW) +
      '" y="' +
      (bTop - 11) +
      '" fill="' +
      cInk3 +
      '" font-size="' + T_LABEL + '" text-anchor="end" font-family="' +
      FONT_MONO +
      '" letter-spacing="0.08em">' +
      (isInstrument ? "TRUTH vs MODEL" : "MODEL ONLY") +
      "</text>",
  );
  out.push(
    '<text x="' +
      padL +
      '" y="11" fill="' +
      cInk3 +
      '" font-size="' + T_LABEL + '" font-family="' +
      FONT_MONO +
      '" letter-spacing="0.08em">ACTIVE NEURONS, LAYER ' +
      state.layer +
      "</text>",
  );
  if (!narrow) {
    out.push(
      '<text x="' +
        (padL + plotW) +
        '" y="11" fill="' +
        cInk3 +
        '" font-size="' + T_LABEL + '" text-anchor="end" font-family="' +
        FONT_MONO +
        '" letter-spacing="0.08em">% OF ' +
        N_TOTAL +
        " NEURONS</text>",
    );
  }

  /* --------------------------------------- lower panel: bits curves --- */
  if (isInstrument && r.oracle) {
    let d = "M" + x(0).toFixed(1) + " " + yB(r.oracle[0]).toFixed(1);
    for (let i = 1; i < T; i++)
      d += " L" + x(i).toFixed(1) + " " + yB(r.oracle[i]).toFixed(1);
    const area =
      d +
      " L" +
      x(T - 1).toFixed(1) +
      " " +
      yB(0).toFixed(1) +
      " L" +
      x(0).toFixed(1) +
      " " +
      yB(0).toFixed(1) +
      " Z";
    out.push(
      '<path class="ln ln--or" d="' + area + '" fill="' + cOrWash + '"/>',
    );
    out.push(
      '<path class="ln ln--or" d="' +
        d +
        '" fill="none" stroke="' +
        cOr +
        '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    );
  }
  if (!pendingModel) {
    let d = "",
      started = false;
    for (let i = 0; i < T; i++) {
      if (r.ceAtTarget[i] == null) continue;
      d +=
        (started ? " L" : "M") +
        x(i).toFixed(1) +
        " " +
        yB(r.ceAtTarget[i]).toFixed(1);
      started = true;
    }
    if (started) {
      out.push(
        '<path class="ln ln--ce" d="' +
          d +
          '" fill="none" stroke="' +
          cCe +
          '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
      );
    }
  }

  /* --------------------------------- upper panel: the claim curve ----- */
  if (!pendingModel) {
    let d = "M" + x(0).toFixed(1) + " " + yA(act[0]).toFixed(1);
    for (let i = 1; i < T; i++)
      d += " L" + x(i).toFixed(1) + " " + yA(act[i]).toFixed(1);
    const area =
      d +
      " L" +
      x(T - 1).toFixed(1) +
      " " +
      yA(0).toFixed(1) +
      " L" +
      x(0).toFixed(1) +
      " " +
      yA(0).toFixed(1) +
      " Z";
    out.push(
      '<path class="ln ln--act" d="' + area + '" fill="' + cActWash + '"/>',
    );
    out.push(
      '<path class="ln ln--act" d="' +
        d +
        '" fill="none" stroke="' +
        cAct +
        '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    );
  }

  if (tr && !pendingModel) {
    let d = "";
    for (let i = 0; i < T; i++)
      d +=
        (i ? " L" : "M") +
        x(i).toFixed(1) +
        " " +
        yA(tr.activeFraction[state.layer][i]).toFixed(1);
    out.push(
      '<path class="ln ln--tr" d="' +
        d +
        '" fill="none" stroke="' +
        cAct +
        '" stroke-width="2" stroke-dasharray="5 4" opacity="0.7"/>',
    );
  }

  /* phase-mean levels: the drop, drawn as two plateaus. This is the
   * ratio in the readout, made visible on the curve it comes from. */
  if (isInstrument && !pendingModel) {
    const levels = [
      ["memorize", WARMUP_LEN, WARMUP_LEN + WORD_LEN - 1],
      ["repeat", WARMUP_LEN + WORD_LEN, T - 1],
    ];
    for (const [phase, i0, i1] of levels) {
      if (i1 < i0) continue;
      const m = phaseMean(act, r.repeats, phase);
      if (m == null) continue;
      const xa = (x(i0) + x(Math.max(i0 - 1, 0))) / 2;
      const xb = i1 >= T - 1 ? padL + plotW : (x(i1) + x(i1 + 1)) / 2;
      const yy = yA(m);
      line(
        xa,
        yy,
        xb,
        yy,
        cAct,
        2,
        ' opacity="0.42" class="plateau" style="--len:' +
          Math.abs(xb - xa).toFixed(1) +
          '"',
      );
      if (xb - xa > 30) {
        out.push(
          '<text x="' +
            ((xa + xb) / 2).toFixed(1) +
            '" y="' +
            (yy - 6).toFixed(1) +
            '" fill="' +
            cInk2 +
            '" font-size="' + T_VALUE + '" font-weight="600" text-anchor="middle" ' +
            'font-family="' +
            FONT_MONO +
            '" stroke="' +
            cSurface +
            '" stroke-width="3" paint-order="stroke">' +
            pct(m) +
            "</text>",
        );
      }
    }
  }

  if (!pendingModel) {
    /* endpoint marker on the claim curve, with a 2px surface ring */
    out.push(
      '<circle cx="' +
        x(T - 1).toFixed(1) +
        '" cy="' +
        yA(act[T - 1]).toFixed(1) +
        '" r="4" fill="' +
        cAct +
        '" stroke="' +
        cSurface +
        '" stroke-width="2"/>',
    );

    /* ----------------------------- token 0: a code artifact, annotated */
    out.push(
      '<circle cx="' +
        x(0).toFixed(1) +
        '" cy="' +
        yA(0).toFixed(1) +
        '" r="3.5" fill="none" stroke="' +
        cAct +
        '" stroke-width="1.5"/>',
    );
    out.push(
      '<text x="' +
        (x(0) + 9).toFixed(1) +
        '" y="' +
        (yA(0) - 7).toFixed(1) +
        '" fill="' +
        cInk3 +
        '" font-size="' + T_LABEL + '" font-family="' +
        FONT_MONO +
        '" stroke="' +
        cSurface +
        '" stroke-width="3" paint-order="stroke">' +
        esc(narrow ? "tok 0 = 0.0%" : "token 0 = 0.0% (attends to nothing)") +
        "</text>",
    );
  }

  /* --------------------------------------------- shared x-axis ------- */
  line(padL, bTop + hB, padL + plotW, bTop + hB, cAxis, 1);
  for (const i of pickXTicks(T, plotW, isInstrument)) {
    const xx = x(i);
    line(xx, bTop + hB, xx, bTop + hB + 4, cAxis, 1);
    text(xx, bTop + hB + 17, String(i), cInk3, T_TICK, "middle");
  }
  out.push(
    '<text x="' +
      (padL + plotW) +
      '" y="' +
      (bTop + hB + 28) +
      '" fill="' +
      cInk3 +
      '" font-size="' + T_LABEL + '" text-anchor="end" font-family="' +
      FONT_MONO +
      '" letter-spacing="0.06em">TOKEN INDEX &#8594;</text>',
  );

  /* --------------------------------------------- crosshair layer ----- */
  out.push(
    '<g id="crosshair" style="display:none">' +
      '<line id="chLine" y1="' +
      aTop +
      '" y2="' +
      (bTop + hB) +
      '" stroke="' +
      cAxis +
      '" stroke-width="1"/>' +
      '<circle id="chA" r="4" fill="' +
      cAct +
      '" stroke="' +
      cSurface +
      '" stroke-width="2"/>' +
      '<circle id="chB" r="4" fill="' +
      cCe +
      '" stroke="' +
      cSurface +
      '" stroke-width="2"/>' +
      '<circle id="chC" r="4" fill="' +
      cOr +
      '" stroke="' +
      cSurface +
      '" stroke-width="2"/>' +
      "</g>",
  );

  /* hit layer: the pointer only has to be closest, never dead-centre */
  out.push(
    '<rect id="hit" x="' +
      padL +
      '" y="' +
      aTop +
      '" width="' +
      plotW +
      '" height="' +
      (bTop + hB - aTop) +
      '" fill="transparent" style="cursor:crosshair"/>',
  );

  svg.innerHTML = out.join("");

  /* stash geometry for the hover layer */
  svg._geom = {
    x: x,
    yA: yA,
    yB: yB,
    padL: padL,
    plotW: plotW,
    T: T,
    aTop: aTop,
    bTop: bTop,
    hB: hB,
  };
  attachHover();
}

/* ---------------------------------------------------- hover + tooltip */
function attachHover() {
  const svg = el.svg;
  const hit = svg.querySelector("#hit");
  if (!hit) return;

  const move = (evt) => {
    const g = svg._geom;
    const rect = svg.getBoundingClientRect();
    const px =
      (evt.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
    const frac = (px - g.padL) / g.plotW;
    let i = Math.round(frac * (g.T - 1));
    i = Math.max(0, Math.min(g.T - 1, i));
    stopPlayback();
    selectToken(i);
    setHover(i);
  };

  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerdown", move);
  hit.addEventListener("pointerleave", () => {
    el.tooltip.hidden = true;
  });
}

function setHover(i) {
  state.hover = i;
  const svg = el.svg;
  const g = svg._geom;
  const cross = svg.querySelector("#crosshair");
  const r = state.result;
  if (!g || !cross || !r) return;

  if (i == null || r.pending) {
    cross.style.display = "none";
    el.tooltip.hidden = true;
    return;
  }

  const act = r.activeFraction[state.layer][i];
  const xx = g.x(i);
  cross.style.display = "";
  svg.querySelector("#chLine").setAttribute("x1", xx);
  svg.querySelector("#chLine").setAttribute("x2", xx);

  const dotA = svg.querySelector("#chA");
  dotA.setAttribute("cx", xx);
  dotA.setAttribute("cy", g.yA(act));

  const dotB = svg.querySelector("#chB");
  const ce = r.ceAtTarget[i];
  if (ce == null) {
    dotB.style.display = "none";
  } else {
    dotB.style.display = "";
    dotB.setAttribute("cx", xx);
    dotB.setAttribute("cy", g.yB(ce));
  }

  const dotC = svg.querySelector("#chC");
  if (!r.oracle) {
    dotC.style.display = "none";
  } else {
    dotC.style.display = "";
    dotC.setAttribute("cx", xx);
    dotC.setAttribute("cy", g.yB(r.oracle[i]));
  }

  buildTooltip(i, xx);
}

function buildTooltip(i, xx) {
  const r = state.result;
  const tip = el.tooltip;
  const act = r.activeFraction[state.layer][i];
  const count = r.activeCounts[state.layer][i];
  const ce = r.ceAtTarget[i];

  tip.textContent = "";

  const head = document.createElement("div");
  head.className = "tip__head";
  const tok = document.createElement("span");
  tok.className = "tip__tok";
  tok.textContent = "t=" + i;
  const letter = document.createElement("span");
  letter.className = "tip__letter";
  letter.textContent = letterOf(r.tokens[i]);
  head.append(tok, letter);
  if (r.mode === "instrument") {
    const ph = document.createElement("span");
    ph.className = "tip__phase";
    ph.textContent = phaseAt(i, r.repeats);
    head.append(ph);
  }
  tip.append(head);

  const row = (color, value, name) => {
    const d = document.createElement("div");
    d.className = "tip__row";
    const k = document.createElement("span");
    k.className = "tip__key";
    k.style.background = color;
    const v = document.createElement("span");
    v.className = "tip__val";
    v.textContent = value;
    const n = document.createElement("span");
    n.className = "tip__name";
    n.textContent = name;
    d.append(k, v, n);
    tip.append(d);
  };

  row(
    cssVar("--s-act"),
    pct(act) + "  (" + count + "/" + N_TOTAL + ")",
    "active",
  );
  row(cssVar("--s-ce"), ce == null ? "·" : bits(ce) + " bits", "model CE");
  if (r.oracle)
    row(cssVar("--s-oracle"), bits(r.oracle[i]) + " bits", "oracle");

  if (i === 0) {
    const note = document.createElement("div");
    note.className = "tip__note";
    note.textContent =
      "Token 0 attends to nothing, so it is 0.0% by construction, and nothing predicted it.";
    tip.append(note);
  }

  tip.hidden = false;
  const wrapW = el.chartWrap.clientWidth;
  const scale =
    el.svg.getBoundingClientRect().width / el.svg.viewBox.baseVal.width;
  const px = xx * scale + 8;
  const tw = tip.offsetWidth;
  tip.style.left =
    (px + tw > wrapW - 6 ? Math.max(6, px - tw - 20) : px) + "px";
  tip.style.top = "10px";
}

/* ======================== READOUT / MEANS / TABLE ===================== */

/* Writing a measured value: if the number actually moved, retrigger a short
 * highlight so a change caused by a control is visible even when the eye was
 * somewhere else on the page. Nothing here recomputes anything. */
function setValue(node, text) {
  if (node.textContent === text) return;
  node.textContent = text;
  node.classList.remove("is-fresh");
  void node.offsetWidth;
  node.classList.add("is-fresh");
}

function updateReadout() {
  const r = state.result;
  el.roLayerTag.textContent = "layer " + state.layer;

  if (!r || r.pending) {
    setValue(el.roMem, "·");
    setValue(el.roRep, "·");
    setValue(el.roRatio, "·");
    return;
  }

  const act = r.activeFraction[state.layer];

  if (r.mode === "sandbox") {
    let sum = 0,
      n = 0;
    for (let i = 1; i < r.T; i++) {
      sum += act[i];
      n++;
    }
    el.roMem.parentElement.querySelector(".readout__label").textContent =
      "Mean active";
    setValue(el.roMem, n ? pct(sum / n) : "·");
    el.roRep.parentElement.hidden = true;
    el.roRatio.parentElement.hidden = true;
    document.querySelector(".readout__arrow").hidden = true;
    return;
  }

  el.roMem.parentElement.querySelector(".readout__label").textContent =
    "Memorize";
  el.roRep.parentElement.hidden = false;
  el.roRatio.parentElement.hidden = false;
  document.querySelector(".readout__arrow").hidden = false;

  const mem = phaseMean(act, r.repeats, "memorize");
  const rep = phaseMean(act, r.repeats, "repeat");
  setValue(el.roMem, mem == null ? "·" : pct(mem));
  setValue(el.roRep, rep == null ? "·" : pct(rep));
  setValue(
    el.roRatio,
    mem == null || rep == null || rep === 0
      ? "·"
      : (mem / rep).toFixed(2) + "×",
  );
}

function updatePhaseMeans() {
  const r = state.result;
  const row = el.phaseMeansRow;
  row.textContent = "";
  if (!r || r.pending) return;

  const act = r.activeFraction[state.layer];

  const pill = (name, value, sub) => {
    const d = document.createElement("div");
    d.className = "pm";
    const n = document.createElement("span");
    n.className = "pm__name";
    n.textContent = name;
    const v = document.createElement("span");
    v.className = "pm__val";
    v.textContent = value;
    d.append(n, v);
    if (sub) {
      const s = document.createElement("span");
      s.className = "pm__n";
      s.textContent = sub;
      d.append(s);
    }
    row.append(d);
  };

  if (r.mode === "sandbox") {
    let sum = 0,
      n = 0;
    for (let i = 1; i < r.T; i++) {
      sum += act[i];
      n++;
    }
    pill("mean active", n ? pct(sum / n) : "·", "tokens 1–" + (r.T - 1));
    pill("compute", r.ms.toFixed(0) + " ms", "T = " + r.T);
    return;
  }

  const warm = phaseMean(act, r.repeats, "warmup");
  const mem = phaseMean(act, r.repeats, "memorize");
  const rep = phaseMean(act, r.repeats, "repeat");
  pill(
    "warm-up",
    warm == null ? "·" : pct(warm),
    "tokens 1–" + (WARMUP_LEN - 1),
  );
  pill(
    "memorize",
    mem == null ? "·" : pct(mem),
    "tokens " + WARMUP_LEN + "–" + (WARMUP_LEN + WORD_LEN - 1),
  );
  pill(
    "repeat",
    rep == null ? "·" : pct(rep),
    r.repeats > 1
      ? "tokens " + (WARMUP_LEN + WORD_LEN) + "–" + (r.T - 1)
      : "none at 1 repeat",
  );
  pill("compute", r.ms.toFixed(0) + " ms", "T = " + r.T);
}

function updateTable() {
  if (el.tableView.hidden) return;
  const r = state.result;
  const body = el.tableBody;
  body.textContent = "";
  if (!r || r.pending) return;

  const act = r.activeFraction[state.layer];
  const counts = r.activeCounts[state.layer];
  const control = liveTransformerResult();
  const frag = document.createDocumentFragment();

  for (let i = 0; i < r.T; i++) {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "is-tok0";
    const cells = [
      String(i),
      letterOf(r.tokens[i]),
      r.mode === "instrument" ? phaseAt(i, r.repeats) : "·",
      pct(act[i]),
      String(counts[i]),
      control ? String(control.activeCounts[state.layer][i]) : "·",
      r.ceAtTarget[i] == null ? "·" : bits(r.ceAtTarget[i]),
      r.oracle ? bits(r.oracle[i]) : "·",
    ];
    for (const c of cells) {
      const td = document.createElement("td");
      td.textContent = c;
      tr.append(td);
    }
    frag.append(tr);
  }
  body.append(frag);
}

/* ============================== DRIVER =============================== */

let refreshHandle = { raf: 0, timer: 0, done: true };

/* The forward pass blocks the main thread for ~50-120 ms, so the work is
 * deferred by one frame: the control's new state paints first, then the model
 * runs. requestAnimationFrame alone is not enough - it does not fire in a
 * background tab, which would leave a queued control change unapplied until
 * the reader came back. A short timer backstops it and whichever fires first
 * wins, so a change is never merely queued. */
function refresh() {
  stopPlayback();
  el.readout.classList.add("is-stale");
  cancelAnimationFrame(refreshHandle.raf);
  clearTimeout(refreshHandle.timer);

  const h = { raf: 0, timer: 0, done: false };
  refreshHandle = h;

  const run = () => {
    if (h.done) return;
    h.done = true;
    cancelAnimationFrame(h.raf);
    clearTimeout(h.timer);

    let r;
    try {
      r = compute();
    } catch (error) {
      clearMeasurement();
      showStatus("Could not compute this input: " + error.message, true);
      return;
    }
    if (!r) return;
    state.result = r;
    el.readout.classList.remove("is-stale");
    renderChart();
    /* a measurement just landed: replay the entry animation so the new
     * curves read as a new result rather than a silent substitution. This
     * animates an already computed array and runs no inference. */
    el.svg.classList.remove("is-fresh");
    void el.svg.getBoundingClientRect().width;
    el.svg.classList.add("is-fresh");
    updateReadout();
    updatePhaseMeans();
    updateTable();
    updateMeta();
    renderInspector();
    updateGuideCopy();
  };

  h.raf = requestAnimationFrame(run);
  h.timer = setTimeout(run, 60);
}

function updateMeta() {
  const T =
    state.mode === "sandbox"
      ? state.sandboxText.length
      : WARMUP_LEN + WORD_LEN * state.repeats;
  el.repeatMeta.textContent = "T = " + T + " tokens";
  el.layerMeta.textContent =
    state.layer === 0
      ? "layer 0 is where the claim fails"
      : "weights are identical at every layer";
  el.weightsMeta.textContent =
    state.weights === "trained"
        ? "Learned the task over 2,200 training steps. Applies to both models; no training happens here."
        : "Random starting weights, before learning. Applies to both models; each still processes the input.";
  if (state.mode === "sandbox") {
    el.sandboxMsg.textContent = state.sandboxText.length + " letters";
  }
}

/* =============================== SETUP =============================== */

function setLayer(n) {
  state.layer = n;
  for (const b of el.layerSeg.querySelectorAll("button")) {
    const on = Number(b.dataset.layer) === n;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  }
  /* layer needs no recompute: one forward pass already measured all four */
  refresh();
}

function clearMeasurement() {
  state.result = null;
  renderChart();
  renderInspector();
  updateReadout();
  updatePhaseMeans();
  updateTable();
  el.tooltip.hidden = true;
}
function setWeights(kind) {
  stopPlayback();
  const version = ++weightSelectionVersion;
  state.weights = kind;
  for (const b of el.weightsSeg.querySelectorAll("button")) {
    const on = b.dataset.weights === kind;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  updateMeta();
  if (models[kind]) {
    if (state.result && !state.result.pending && state.result.weights !== kind)
      clearMeasurement();
    hideStatus();
    refresh();
    return;
  }
  clearMeasurement();
  showStatus("Loading the " + kind + " weights…", false);
  getModel(kind)
    .then(() => {
      if (version !== weightSelectionVersion) return;
      hideStatus();
      refresh();
    })
    .catch((e) => {
      if (version !== weightSelectionVersion) return;
      clearMeasurement();
      showStatus(loadErrorText(e), true);
    });
}

/* Rebuilds the two notes under the chart. Both are written from scratch so the
 * two modes never leave a fragment of the other one's wording behind. */
function writeNotes(sandbox) {
  const b = (t) => {
    const n = document.createElement("b");
    n.textContent = t;
    return n;
  };
  const c = (t) => {
    const n = document.createElement("code");
    n.textContent = t;
    return n;
  };
  const t = (s) => document.createTextNode(s);

  el.noteTok0.textContent = "";
  el.noteTok0.append(
    b("BDH token 0 reads exactly 0.0%"),
    t(" in every layer, because attention is "),
    c("tril(diagonal=-1)"),
    t(
      ", so token 0 attends to nothing. That is a property of the code, not a measurement, and it is ",
    ),
    b("excluded"),
    t(sandbox ? " from the mean below." : " from the warm-up mean below."),
  );

  el.noteAlign.textContent = "";
  if (sandbox) {
    el.noteAlign.append(
      t("Cross-entropy is plotted against "),
      b("the token being predicted"),
      t(". Token 0 has none, because nothing predicted it."),
    );
  } else {
    el.noteAlign.append(
      t("Cross-entropy is plotted against "),
      b("the token being predicted"),
      t(
        ", so it lines up with oracle surprisal. The forward pass itself indexes it by the position making the prediction.",
      ),
    );
  }
}

function setMode(mode) {
  stopPlayback();
  state.mode = mode;
  const sandbox = mode === "sandbox";
  el.tabInstrument.classList.toggle("is-active", !sandbox);
  el.tabSandbox.classList.toggle("is-active", sandbox);
  el.tabInstrument.setAttribute("aria-selected", String(!sandbox));
  el.tabSandbox.setAttribute("aria-selected", String(sandbox));
  el.tabInstrument.tabIndex = sandbox ? -1 : 0;
  el.tabSandbox.tabIndex = sandbox ? 0 : -1;
  el.offdist.hidden = !sandbox;
  el.sandboxControl.hidden = !sandbox;
  document.getElementById("ctrlRepeats").hidden = sandbox;
  document.getElementById("ctrlWord").hidden = sandbox;
  el.figureSub.textContent = sandbox
    ? "Your own letters. No oracle curve is drawn, because off-distribution text has no generating process to be surprised by."
    : "One cycle of the Section 6.4 protocol, token by token.";
  /* the oracle legend entry is meaningless off-distribution */
  el.legend.children[0].classList.toggle("is-dim", sandbox);

  /* the notes under the chart describe the instrument's phases, which the
   * sandbox does not have - say the true thing in each mode */
  writeNotes(sandbox);
  refresh();
}

function showStatus(msg, isError) {
  const skeleton = $("chartSkeleton");
  /* the skeleton stands in for the chart while weights load; an error
   * replaces it with the message and a retry, so it must not stay up */
  if (skeleton) skeleton.classList.toggle("is-on", !isError);
  el.status.hidden = false;
  el.status.classList.toggle("is-error", !!isError);
  el.statusText.textContent = msg;
  el.status.querySelector(".spinner").style.display = isError ? "none" : "";
  if (isError && !$("retryWeights")) {
    const retry = document.createElement("button");
    retry.id = "retryWeights";
    retry.className = "primary-btn";
    retry.textContent = "Retry loading";
    retry.onclick = () => {
      retry.remove();
      setWeights(state.weights);
    };
    el.status.append(retry);
  }
}

function hideStatus() {
  const skeleton = $("chartSkeleton");
  if (skeleton) skeleton.classList.remove("is-on");
  el.status.hidden = true;
  const retry = $("retryWeights");
  if (retry) retry.remove();
}

function loadErrorText(e) {
  const local = location.protocol === "file:";
  return local
    ? "The weight files cannot be read from a file:// URL. Serve the folder over HTTP, for example python -m http.server 8000, then open http://localhost:8000."
    : "Could not load the weight files (" +
        e.message +
        "). Check that weights_trained.json sits beside index.html.";
}

function wireControls() {
  /* layer -------------------------------------------------------- */
  el.layerSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setLayer(Number(b.dataset.layer));
  });
  el.layerSeg.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = Math.max(
      0,
      Math.min(3, state.layer + (e.key === "ArrowRight" ? 1 : -1)),
    );
    setLayer(next);
    el.layerSeg.querySelector("button.is-active").focus();
  });

  /* repeats ------------------------------------------------------ */
  el.repeatSlider.addEventListener("input", () => {
    state.repeats = Number(el.repeatSlider.value);
    el.repeatOut.textContent = state.repeats;
    refresh();
  });

  /* the word: exactly 8 letters, a-z ----------------------------- */
  el.wordInput.addEventListener("input", () => {
    const raw = el.wordInput.value;
    const clean = raw
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, WORD_LEN);
    if (clean !== raw) {
      const at = el.wordInput.selectionStart;
      el.wordInput.value = clean;
      try {
        el.wordInput.setSelectionRange(
          at - (raw.length - clean.length),
          at - (raw.length - clean.length),
        );
      } catch (_) {
        /* selection restore is best-effort */
      }
    }
    if (clean.length === WORD_LEN) {
      el.wordInput.classList.remove("is-bad");
      el.wordMsg.classList.remove("is-bad");
      el.wordMsg.textContent = "8 letters, a–z";
      state.word = clean;
      refresh();
    } else {
      /* hold the previous render rather than blanking the chart */
      el.wordInput.classList.add("is-bad");
      el.wordMsg.classList.add("is-bad");
      el.wordMsg.textContent =
        "needs " +
        (WORD_LEN - clean.length) +
        " more letter" +
        (WORD_LEN - clean.length === 1 ? "" : "s") +
        ". Showing “" +
        state.word +
        "”";
    }
  });

  /* weights ------------------------------------------------------ */
  el.weightsSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setWeights(b.dataset.weights);
  });

  /* sandbox ------------------------------------------------------ */
  el.sandboxInput.addEventListener("input", () => {
    const clean = el.sandboxInput.value
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 96);
    if (clean !== el.sandboxInput.value) el.sandboxInput.value = clean;
    if (clean.length >= 2) {
      state.sandboxText = clean;
      refresh();
    } else {
      el.sandboxMsg.textContent = "type at least 2 letters";
    }
  });

  for (const tab of [el.tabInstrument, el.tabSandbox])
    tab.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const sandbox =
        e.key === "End" || (e.key !== "Home" && state.mode === "instrument");
      setMode(sandbox ? "sandbox" : "instrument");
      (sandbox ? el.tabSandbox : el.tabInstrument).focus();
    });

  /* tabs --------------------------------------------------------- */
  el.tabInstrument.addEventListener("click", () => setMode("instrument"));
  el.tabSandbox.addEventListener("click", () => setMode("sandbox"));

  /* table -------------------------------------------------------- */
  el.tableToggle.addEventListener("click", () => {
    const open = el.tableView.hidden;
    el.tableView.hidden = !open;
    el.tableToggle.setAttribute("aria-expanded", String(open));
    el.tableToggle.textContent = open ? "Hide data table" : "Show data table";
    updateTable();
  });

  /* keyboard on the chart ---------------------------------------- */
  el.svg.addEventListener("keydown", (e) => {
    const r = state.result;
    if (!r) return;
    let i = state.hover == null ? 0 : state.hover;
    if (e.key === "ArrowRight") i = Math.min(r.T - 1, i + 1);
    else if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = r.T - 1;
    else if (e.key === "Escape") {
      setHover(null);
      return;
    } else return;
    e.preventDefault();
    stopPlayback();
    selectToken(i);
  });
  el.svg.addEventListener("blur", () => {
    el.tooltip.hidden = true;
  });
}

/* theme toggle: auto -> light -> dark -> auto */
function wireTheme() {
  const order = ["auto", "light", "dark"];
  let idx = 0;
  try {
    const saved = localStorage.getItem("bdh-theme");
    if (saved && order.includes(saved)) idx = order.indexOf(saved);
  } catch (_) {
    /* private mode: fall through to auto */
  }

  const apply = () => {
    const mode = order[idx];
    if (mode === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    el.themeToggleLabel.textContent = mode;
    try {
      localStorage.setItem("bdh-theme", mode);
    } catch (_) {
      /* ignore */
    }
    if (state.result) {
      renderChart();
      renderInspector();
    }
  };

  apply();
  el.themeToggle.addEventListener("click", () => {
    idx = (idx + 1) % order.length;
    apply();
  });

  /* The chart bakes theme colours into SVG attributes at render time, so a
   * change of system theme while the page is open has to trigger a repaint.
   * Without this the curves keep the previous theme's palette on the new
   * surface - dark gridlines on a light ground. */
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSchemeChange = () => {
    if (state.result) {
      renderChart();
      renderInspector();
    }
  };
  if (mq.addEventListener) mq.addEventListener("change", onSchemeChange);
  else if (mq.addListener) mq.addListener(onSchemeChange);
}

/* The sticky tab strip must sit exactly under the sticky claim bar. h is
 * fixed at 0, so this writes the same custom property value every time it
 * runs - it does not depend on scroll position, the claim bar's condensed
 * state, or anything else that changes during scrolling. Call it once, not
 * per frame: a custom-property write on the root element invalidates style
 * for every element that inherits it, which is most of the page. */
function syncStickyOffsets() {
  const h = 0;
  document.documentElement.style.setProperty("--claim-h", h + "px");
}

function wireScrollCondense() {
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      el.claimBar.classList.toggle("is-condensed", window.scrollY > 64);
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------------------------------------------------------- chart zoom */
/* Zoom and full screen change how much of the figure a reader can see. They
 * change no value: the same computed arrays are drawn either way. */
const CHART_ZOOM_MIN = 1;
const CHART_ZOOM_MAX = 4;

function setChartZoom(next) {
  const clamped = Math.min(
    CHART_ZOOM_MAX,
    Math.max(CHART_ZOOM_MIN, Math.round(next * 4) / 4),
  );
  if (clamped === state.chartZoom) return;
  state.chartZoom = clamped;
  updateChartZoomUi();
  if (state.result) renderChart();
}

function updateChartZoomUi() {
  const level = $("chartZoomLevel");
  const zoomed = state.chartZoom > 1;
  if (level) level.textContent = Math.round(state.chartZoom * 100) + "%";
  const reset = $("chartZoomReset");
  if (reset) reset.hidden = !zoomed;
  const out = $("chartZoomOut");
  if (out) out.disabled = state.chartZoom <= CHART_ZOOM_MIN;
  const zoomIn = $("chartZoomIn");
  if (zoomIn) zoomIn.disabled = state.chartZoom >= CHART_ZOOM_MAX;
  el.chartWrap.classList.toggle("is-zoomed", zoomed);
}

function wireChartZoom() {
  const zoomIn = $("chartZoomIn");
  const zoomOut = $("chartZoomOut");
  const reset = $("chartZoomReset");
  const expand = $("chartExpand");
  const panel = $("chartPanel");

  if (zoomIn)
    zoomIn.addEventListener("click", () => setChartZoom(state.chartZoom + 0.5));
  if (zoomOut)
    zoomOut.addEventListener("click", () =>
      setChartZoom(state.chartZoom - 0.5),
    );
  if (reset) reset.addEventListener("click", () => setChartZoom(1));

  /* Ctrl or Cmd with the wheel is the browser-wide gesture for zoom, so it
   * is the one that belongs here. A plain wheel keeps scrolling the page. */
  el.chartWrap.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setChartZoom(state.chartZoom + (event.deltaY < 0 ? 0.25 : -0.25));
    },
    { passive: false },
  );

  if (expand && panel) {
    expand.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (panel.requestFullscreen)
        panel.requestFullscreen().catch(() => {
          /* a browser may refuse: the inline figure stays usable */
        });
    });
    document.addEventListener("fullscreenchange", () => {
      const on = document.fullscreenElement === panel;
      expand.textContent = on ? "Exit full screen" : "Full screen";
      panel.classList.toggle("is-fullscreen", on);
      if (state.result) {
        renderChart();
        renderInspector();
      }
    });
  }

  updateChartZoomUi();
}

/* Only chartWrap's own size feeds renderChart/renderInspector (chart width,
 * grid layout). el.claimBar used to be observed too, but its height changes
 * on every scroll-driven condense toggle (see wireScrollCondense), so that
 * observation fired mid-scroll and forced a full chart redraw plus a
 * 2,048-cell inspector pass for a resize neither of them reads. */
function wireResize() {
  let t = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (state.result) {
        renderChart();
        renderInspector();
      }
    }, 90);
  });
  ro.observe(el.chartWrap);
}

/* ------------------------------------------------------------- boot */
async function boot() {
  for (const b of el.layerSeg.querySelectorAll("button"))
    b.tabIndex = Number(b.dataset.layer) === state.layer ? 0 : -1;
  for (const b of el.weightsSeg.querySelectorAll("button"))
    b.tabIndex = b.dataset.weights === state.weights ? 0 : -1;
  el.tabSandbox.tabIndex = -1;
  wireControls();
  wireInspector();
  memoryLabController = window.MemoryLab.mount($("memoryLab"), {
    get: () => ({
      ready: !!(
        state.result &&
        !state.result.pending &&
        state.result.xySparse &&
        models[state.weights]
      ),
      model: models[state.weights],
      tokens: state.result?.tokens || [],
      token: state.selectedToken,
      layer: state.layer,
      weights: state.weights,
      instrument: state.mode === "instrument",
    }),
    select: selectToken,
    stopPlayback,
  });
  wireGuide();
  loadOfflineComparison();
  loadTransformerModels();
  wireTheme();
  wireScrollCondense();
  syncStickyOffsets();
  updateMeta();

  el.buildStamp.textContent =
    "n = 1024 neurons · d = 32 · 4 layers · 100,352 parameters, shared across all four.";

  /* Draw the analytic curve before any model exists. Oracle surprisal
   * depends only on the protocol's lengths, never on the letters or the
   * weights, so the page is never a blank canvas. */
  state.result = {
    tokens: new Array(WARMUP_LEN + WORD_LEN * state.repeats).fill(0),
    T: WARMUP_LEN + WORD_LEN * state.repeats,
    activeFraction: [0, 1, 2, 3].map(
      () => new Float64Array(WARMUP_LEN + WORD_LEN * state.repeats),
    ),
    activeCounts: [0, 1, 2, 3].map(
      () => new Int32Array(WARMUP_LEN + WORD_LEN * state.repeats),
    ),
    ceAtTarget: new Array(WARMUP_LEN + WORD_LEN * state.repeats).fill(null),
    oracle: oracleSurprisalBits(WARMUP_LEN, WORD_LEN, state.repeats),
    ms: 0,
    mode: "instrument",
    repeats: state.repeats,
    pending: true, // no model yet: draw the frame and the analytic curve only
  };
  renderChart();
  wireResize();
  wireChartZoom();

  const bootSelectionVersion = weightSelectionVersion;
  try {
    await getModel("trained");
    if (weightSelectionVersion !== bootSelectionVersion) return;
    hideStatus();
    state.result = null;
    computeCache.clear();
    refresh();
  } catch (e) {
    if (weightSelectionVersion !== bootSelectionVersion) return;
    clearMeasurement();
    showStatus(loadErrorText(e), true);
  }
}

/* Measured neuron inspector. The model stores [head, token, neuron], never
 * [token, globalNeuron]. Replaying selection does not invoke forward(). */
let memoryLabController = null;
let playbackTimer = 0;
const neuronCells = [];
const transformerCells = [];
/* Shadow of which cells are currently marked "active" in the DOM. During
 * playback the selected token changes 8 times a second, each time walking
 * all 1,024 cells of a grid to find which are active. Most cells keep the
 * same state from one token to the next, so classList.toggle is only called
 * on the ones whose state actually flipped, instead of on all 1,024 every
 * time. The active/inactive set drawn is identical either way; only the
 * number of DOM writes changes. Both shadows are reset to all-zero wherever
 * the corresponding grid is cleared, so they never drift from what the DOM
 * shows. */
const neuronActiveShadow = new Uint8Array(N_TOTAL);
const transformerActiveShadow = new Uint8Array(N_TOTAL);
function stopPlayback() {
  clearInterval(playbackTimer);
  playbackTimer = 0;
  if ($("playTokens")) $("playTokens").textContent = "Play tokens";
}
function selectToken(token) {
  const r = state.result;
  if (!r || r.pending) return;
  state.selectedToken = Math.max(0, Math.min(r.T - 1, token));
  renderInspector();
}
function renderInspector() {
  $("gridTrainingExplanation").hidden = state.weights !== "trained";
  if (memoryLabController) memoryLabController.sync();
  const r = state.result;
  const ready = !!(r && !r.pending && r.xySparse);
  $("tokenSlider").disabled = $("playTokens").disabled = !ready;
  if (!ready) {
    $("neuronCount").textContent = "·";
    $("gridPhaseExplanation").textContent = "Waiting for the selected model and input.";
    $("gridQualityExplanation").textContent = "Prediction quality will be compared when both models are ready.";
    $("tokenOut").textContent = "·";
    $("tokenLetter").textContent = "·";
    $("tokenStrip").textContent = "";
    delete $("tokenStrip").dataset.sequence;
    $("transformerGrid").setAttribute(
      "aria-label",
      "Transformer measurement unavailable",
    );
    $("gridStatus").textContent =
      "Waiting for the selected model’s measured activations.";
    $("transformerLiveStat").textContent = "Waiting for the selected model.";
    for (const cell of transformerCells) cell.classList.remove("active");
    transformerActiveShadow.fill(0);
    $("neuronGrid").setAttribute(
      "aria-label",
      "Neuron measurement unavailable",
    );
    for (const cell of neuronCells) cell.classList.remove("active");
    neuronActiveShadow.fill(0);
    return;
  }
  const t = Math.min(state.selectedToken, r.T - 1);
  state.selectedToken = t;
  const raw = r.xySparse[state.layer];
  const heads = models[state.weights].w.nh;
  const perHead = raw.length / (heads * r.T);
  let count = 0;
  for (let n = 0; n < N_TOTAL; n++) {
    const h = Math.floor(n / perHead),
      local = n % perHead;
    const active = raw[(h * r.T + t) * perHead + local] > 0;
    /* every cell's active state is still computed and counted every call;
     * only the DOM write for cells that changed is skipped */
    if (active !== !!neuronActiveShadow[n]) {
      neuronCells[n].classList.toggle("active", active);
      neuronActiveShadow[n] = active ? 1 : 0;
    }
    count += active ? 1 : 0;
  }
  if (count !== r.activeCounts[state.layer][t])
    throw new Error("Neuron grid/count mismatch");
  $("neuronCount").textContent = count;
  const firstMean = r.mode === "instrument" ? phaseMean(r.activeFraction[state.layer], r.repeats, "memorize") : null;
  const repeatMean = r.mode === "instrument" ? phaseMean(r.activeFraction[state.layer], r.repeats, "repeat") : null;
  $("gridPhaseExplanation").textContent =
    (state.weights === "trained" ? "Trained models: learned weights, fixed during this run. " : "Untrained control: random weights before learning. The headline is about the trained model. ") +
    "The large count is BDH at one token, not a phase average. " +
    (r.mode === "sandbox" ? "This input is outside the training protocol; there is no defined first-word/repeat comparison."
      : repeatMean === null ? "Add another occurrence to compare first appearance with repetition."
      : "BDH layer " + state.layer + " on this input: " + pct(firstMean) + " active on first appearance → " + pct(repeatMean) + " on repeats (" + (repeatMean > 0 ? (firstMean / repeatMean).toFixed(2) + "× ratio" : "ratio unavailable") + ").");
  $("tokenOut").textContent = t;
  $("tokenSlider").max = r.T - 1;
  $("tokenSlider").value = t;
  $("tokenLetter").textContent = letterOf(r.tokens[t]);
  const phase = r.mode === "instrument" ? phaseAt(t, r.repeats) : "sandbox";
  const description =
    "LIVE · " +
    state.weights.toUpperCase() +
    " · LAYER " +
    state.layer +
    " · TOKEN " +
    t +
    " · " +
    phase.toUpperCase() +
    " · " +
    count +
    " of 1024 active";
  $("gridStatus").textContent = description;
  $("neuronGrid").setAttribute(
    "aria-label",
    description +
      ". Filled cells are positive gated activations; hollow cells are exact zeros.",
  );
  $("tokenSlider").setAttribute(
    "aria-valuetext",
    "Token " +
      t +
      ", " +
      letterOf(r.tokens[t]) +
      ", " +
      phase +
      ", " +
      count +
      " active neurons",
  );
  const strip = $("tokenStrip");
  const signature = r.tokens.join(",") + r.mode;
  if (strip.dataset.sequence !== signature) {
    strip.dataset.sequence = signature;
    strip.innerHTML = r.tokens
      .map(
        (tok, i) =>
          '<span aria-hidden="true" data-phase="' +
          (r.mode === "instrument" ? phaseAt(i, r.repeats) : "sandbox") +
          '">' +
          letterOf(tok) +
          "</span>",
      )
      .join("");
  }
  for (let i = 0; i < strip.children.length; i++)
    strip.children[i].classList.toggle("selected", i === t);
  renderTransformerInspector(t);
  setHover(t);
  el.tooltip.hidden = true;
}
/* ==================================================== CELL PROVENANCE ===
 * A square in either grid is one coordinate of one model, and a specific
 * block of learned numbers belongs to it. This reads those numbers straight
 * out of the loaded weight arrays and reports where they live, so a reader
 * can go from "a square lit up" to "these are the parameters that made it
 * light up".
 *
 * The parameter accounting is exact and checkable against the totals printed
 * on the page:
 *
 *   BDH, 100,352 total. Each of the 1,024 coordinates owns one column of
 *   D_x, one column of D_y and one row of E, 32 values each, so 96 per
 *   coordinate and 98,304 across the grid. The remaining 2,048 are the
 *   token embedding and the output head, which belong to no coordinate.
 *
 *   Transformer, 71,680 total. Each of the 1,024 hidden units owns one
 *   column of W1 and one row of W2, so 64 per unit and 65,536 across the
 *   grid. The remaining 6,144 are the four attention projections, the
 *   embedding and the output head.
 *
 * Nothing here is interpretation. It reports identity, the measured value,
 * and the weights attached to that coordinate. No claim is made that a
 * coordinate stands for anything, or that the same position in the two
 * grids has anything to do with the other model.
 * -------------------------------------------------------------------- */

const CELL_STATS_SAMPLE = 32; // every slice on this page is 32 values long

/* pinned cell, or null while the reader is only pointing at squares */
let pinnedCell = null;

function vectorStats(read, count) {
  let sumSquares = 0;
  let min = Infinity;
  let max = -Infinity;
  const values = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = read(i);
    values[i] = v;
    sumSquares += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return {
    values: values,
    norm: Math.sqrt(sumSquares),
    min: min,
    max: max,
    count: count,
  };
}

/* a 32-value slice drawn at a size that can sit inside a table cell */
function sparkline(stats) {
  const w = 96;
  const h = 20;
  const extent = Math.max(Math.abs(stats.min), Math.abs(stats.max)) || 1;
  const mid = h / 2;
  const step = w / stats.count;
  let bars = "";
  for (let i = 0; i < stats.count; i++) {
    const v = stats.values[i];
    const height = Math.max(1, (Math.abs(v) / extent) * (h / 2 - 1));
    const y = v >= 0 ? mid - height : mid;
    bars +=
      '<rect x="' +
      (i * step).toFixed(2) +
      '" y="' +
      y.toFixed(2) +
      '" width="' +
      Math.max(1, step - 0.6).toFixed(2) +
      '" height="' +
      height.toFixed(2) +
      '" fill="' +
      (v >= 0 ? cssVar("--s-act") : cssVar("--s-ce")) +
      '"/>';
  }
  return (
    '<svg class="spark" width="' +
    w +
    '" height="' +
    h +
    '" viewBox="0 0 ' +
    w +
    " " +
    h +
    '" role="img" aria-label="' +
    stats.count +
    " learned values, smallest " +
    stats.min.toFixed(3) +
    ", largest " +
    stats.max.toFixed(3) +
    '">' +
    '<line x1="0" y1="' +
    mid +
    '" x2="' +
    w +
    '" y2="' +
    mid +
    '" stroke="' +
    cssVar("--rule-2") +
    '" stroke-width="1"/>' +
    bars +
    "</svg>"
  );
}

/* Describe one BDH coordinate: which head it sits in, what it measured on
 * the selected token, and the three weight slices that belong to it. */
function describeBdhCell(n) {
  const model = models[state.weights];
  if (!model || !model.w) return null;
  const w = model.w;
  const D = w.D;
  const N = w.N;
  const head = Math.floor(n / N);
  const local = n % N;

  const r = state.result;
  let value = null;
  if (r && !r.pending && r.xySparse) {
    const raw = r.xySparse[state.layer];
    const t = Math.min(state.selectedToken, r.T - 1);
    value = raw[(head * r.T + t) * N + local];
  }

  const encBase = head * D * N;
  return {
    model: "BDH",
    index: n,
    head: head,
    local: local,
    value: value,
    valueLabel: "Measured gated product",
    valueSymbol: "xy_sparse",
    owned: 3 * D,
    total: 100352,
    rows: [
      {
        symbol: "D_x",
        where: "encoder[head " + head + "][:, " + local + "]",
        stats: vectorStats((d) => w.encoder[encBase + d * N + local], D),
      },
      {
        symbol: "D_y",
        where: "encoder_v[head " + head + "][:, " + local + "]",
        stats: vectorStats((d) => w.encoderV[encBase + d * N + local], D),
      },
      {
        symbol: "E",
        where: "decoder[" + n + ", :]",
        stats: vectorStats((d) => w.decoder[n * D + d], D),
      },
    ],
    note:
      "All four layers share these 96 numbers. Depth changes the state coming in, not the weights. " +
      "The remaining 2,048 parameters are the token embedding and the output head, which belong to no single coordinate.",
  };
}

/* Describe one Transformer hidden unit. Its tensor has no head axis. */
function describeTransformerCell(n) {
  const model = transformerModels[state.weights];
  if (!model || !model.p) return null;
  const D = model.w.D;
  const F = model.w.nTotal;

  const out = liveTransformerResult();
  let value = null;
  if (out && out.hidden) {
    const t = Math.min(state.selectedToken, out.T - 1);
    value = out.hidden[state.layer][t * F + n];
  }

  return {
    model: "ReLU Transformer",
    index: n,
    head: null,
    local: n,
    value: value,
    valueLabel: "Measured hidden activation",
    valueSymbol: "ReLU(zW1)",
    owned: 2 * D,
    total: 71680,
    rows: [
      {
        symbol: "W1",
        where: "W1[:, " + n + "]",
        stats: vectorStats((d) => model.p.W1[d * F + n], D),
      },
      {
        symbol: "W2",
        where: "W2[" + n + ", :]",
        stats: vectorStats((d) => model.p.W2[n * D + d], D),
      },
    ],
    note:
      "All four layers share these 64 numbers. The remaining 6,144 parameters are the four attention projections, " +
      "the embedding and the output head, which belong to no single unit.",
  };
}

function renderCellInspector(which, n) {
  const body = $("cellInspectBody");
  const empty = $("cellInspectEmpty");
  if (n == null) {
    body.hidden = true;
    empty.hidden = false;
    return;
  }
  const info =
    which === "bdh" ? describeBdhCell(n) : describeTransformerCell(n);
  if (!info) {
    body.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  body.hidden = false;

  const active = info.value != null && info.value > 0;
  $("cellInspectTitle").textContent =
    (which === "bdh" ? "Neuron " : "Hidden unit ") + info.index;
  const stateNode = $("cellInspectState");
  stateNode.textContent =
    info.value == null ? "not measured yet" : active ? "active" : "silent";
  stateNode.classList.toggle("is-active", active);

  const where = [info.model];
  if (info.head != null)
    where.push("head " + info.head, "coordinate " + info.local);
  where.push("layer " + state.layer, "token " + state.selectedToken);
  where.push(state.weights + " weights");
  $("cellInspectWhere").textContent = where.join(" · ");

  $("cellInspectValueLabel").textContent =
    info.valueLabel + " (" + info.valueSymbol + ")";
  $("cellInspectValue").textContent =
    info.value == null ? "·" : info.value.toFixed(6);
  $("cellInspectOwned").textContent =
    info.owned + " of " + info.total.toLocaleString("en-US");

  $("cellInspectCaption").textContent =
    "The learned numbers attached to this coordinate, read from the loaded " +
    state.weights +
    " weight file.";

  $("cellInspectRows").innerHTML = info.rows
    .map(function (row) {
      return (
        "<tr><th scope=\"row\">" +
        esc(row.symbol) +
        "</th><td><code>" +
        esc(row.where) +
        "</code></td><td>" +
        sparkline(row.stats) +
        "</td><td>" +
        row.stats.norm.toFixed(4) +
        "</td><td>" +
        row.stats.min.toFixed(3) +
        " to " +
        row.stats.max.toFixed(3) +
        "</td></tr>"
      );
    })
    .join("");

  $("cellInspectNote").textContent =
    info.note +
    " Position in the grid carries no meaning, and the same position in the other grid is a different model's parameter block.";
  $("cellInspectClear").hidden = !pinnedCell;
}

function showCell(which, n, pin) {
  if (pin) pinnedCell = { which: which, n: n };
  else if (pinnedCell) return; // a pinned cell outranks whatever is hovered
  renderCellInspector(which, n);
  markSelectedCell(which, n);
}

function markSelectedCell(which, n) {
  const cells = which === "bdh" ? neuronCells : transformerCells;
  const other = which === "bdh" ? transformerCells : neuronCells;
  for (const cell of other) cell.classList.remove("is-picked");
  for (let i = 0; i < cells.length; i++)
    cells[i].classList.toggle("is-picked", i === n);
}

function clearPinnedCell() {
  pinnedCell = null;
  for (const cell of neuronCells) cell.classList.remove("is-picked");
  for (const cell of transformerCells) cell.classList.remove("is-picked");
  renderCellInspector(null, null);
}

/* One listener per grid rather than 1,024: the cells carry their index. */
function wireCellInspector() {
  const grids = [
    { id: "neuronGrid", which: "bdh", cells: neuronCells },
    { id: "transformerGrid", which: "transformer", cells: transformerCells },
  ];

  for (const grid of grids) {
    const node = $(grid.id);
    if (!node) continue;

    node.addEventListener("pointerover", (event) => {
      const cell = event.target.closest(".neuron-cell");
      if (!cell || cell.dataset.index === undefined) return;
      showCell(grid.which, Number(cell.dataset.index), false);
    });

    node.addEventListener("pointerleave", () => {
      if (!pinnedCell) renderCellInspector(null, null);
    });

    node.addEventListener("click", (event) => {
      const cell = event.target.closest(".neuron-cell");
      if (!cell || cell.dataset.index === undefined) return;
      const index = Number(cell.dataset.index);
      if (pinnedCell && pinnedCell.which === grid.which && pinnedCell.n === index)
        clearPinnedCell();
      else showCell(grid.which, index, true);
    });

    /* The grid is a single tab stop with a moving cursor, not 1,024 stops
     * between the reader and the rest of the page. The cells stay out of the
     * accessibility tree; the inspector panel below is a live region, so
     * moving the cursor is what gets announced. */
    node.tabIndex = 0;
    node.dataset.cursor = "0";
    node.addEventListener("keydown", (event) => {
      const columns = 32;
      let next = Number(node.dataset.cursor) || 0;
      switch (event.key) {
        case "ArrowRight":
          next = Math.min(N_TOTAL - 1, next + 1);
          break;
        case "ArrowLeft":
          next = Math.max(0, next - 1);
          break;
        case "ArrowDown":
          next = Math.min(N_TOTAL - 1, next + columns);
          break;
        case "ArrowUp":
          next = Math.max(0, next - columns);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = N_TOTAL - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          showCell(grid.which, next, true);
          return;
        case "Escape":
          if (pinnedCell) {
            event.preventDefault();
            clearPinnedCell();
          }
          return;
        default:
          return;
      }
      event.preventDefault();
      node.dataset.cursor = String(next);
      showCell(grid.which, next, !!pinnedCell);
    });
  }

  const clear = $("cellInspectClear");
  if (clear) clear.addEventListener("click", clearPinnedCell);
}


function wireInspector() {
  const frag = document.createDocumentFragment();
  for (let n = 0; n < N_TOTAL; n++) {
    const cell = document.createElement("span");
    cell.className = "neuron-cell";
    cell.setAttribute("aria-hidden", "true");
    cell.dataset.index = String(n);
    neuronCells.push(cell);
    frag.append(cell);
  }
  $("neuronGrid").append(frag);
  for (let n = 0; n < N_TOTAL; n++) {
    const cell = document.createElement("span");
    cell.className = "neuron-cell";
    cell.setAttribute("aria-hidden", "true");
    cell.dataset.index = String(n);
    transformerCells.push(cell);
    $("transformerGrid").append(cell);
  }
  wireCellInspector();
  $("retryTransformer").addEventListener("click", () => {
    $("retryTransformer").hidden = true;
    loadTransformerModels();
  });
  $("tokenSlider").addEventListener("input", () => {
    if (memoryLabController) memoryLabController.stop();
    stopPlayback();
    selectToken(Number($("tokenSlider").value));
  });
  $("playTokens").addEventListener("click", () => {
    if (memoryLabController) memoryLabController.stop();
    if (playbackTimer) {
      stopPlayback();
      return;
    }
    if (!state.result || state.result.pending) return;
    if (state.selectedToken >= state.result.T - 1) selectToken(0);
    $("playTokens").textContent = "Pause";
    playbackTimer = setInterval(() => {
      selectToken(state.selectedToken + 1);
      if (state.selectedToken >= state.result.T - 1) stopPlayback();
    }, 125);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPlayback();
      cancelGuide();
    }
  });
  el.weightsSeg.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    setWeights(
      e.key === "ArrowLeft" || e.key === "Home" ? "trained" : "untrained",
    );
    el.weightsSeg.querySelector(".is-active").focus();
  });
}

/* Guide changes are explicit and cancellable; every explanation reads the
 * result that the visible controls actually selected. */
let guideStep = 0;
let guideTimer = 0;
let guideActive = false;
function cancelGuide() {
  clearTimeout(guideTimer);
  guideTimer = 0;
  guideActive = false;
}
function guidePreset(layer, weights, repeats) {
  state.word = "mmgtfhhe";
  el.wordInput.value = state.word;
  el.wordInput.classList.remove("is-bad");
  el.wordMsg.classList.remove("is-bad");
  el.wordMsg.textContent = "8 letters, a–z";
  state.repeats = repeats;
  el.repeatSlider.value = repeats;
  el.repeatOut.textContent = repeats;
  state.selectedToken = repeats === 1 ? 13 : 29;
  setMode("instrument");
  setLayer(layer);
  setWeights(weights);
}
function updateGuideCopy() {
  if (!guideActive || !state.result || state.result.pending) return;
  const r = state.result,
    act = r.activeFraction[state.layer];
  const mem = phaseMean(act, r.repeats, "memorize"),
    rep = phaseMean(act, r.repeats, "repeat");
  const ratio = rep ? (mem / rep).toFixed(2) + "×" : "unavailable";
  if (guideStep === 1)
    $("guideCopy").textContent =
      rep === null
        ? "One occurrence means no repeat phase yet: the ratio is unavailable. Add repetitions to compare the same word after its first occurrence."
        : "On this measured input: " +
          pct(mem) +
          " active while memorizing, " +
          pct(rep) +
          " on repeats, a " +
          ratio +
          " ratio. The weights and sparsity settings did not change.";
  if (guideStep === 2)
    $("guideCopy").textContent =
      "Layer 0 shares the same weights but shows a " +
      ratio +
      " memorize/repeat ratio: no comparable drop. Depth changes the incoming residual state. The token curve need not be flat.";
  if (guideStep === 3)
    $("guideCopy").textContent =
      "Back at layer 2, the untrained control measures " +
      ratio +
      ". This supports a dependence on training in this experiment. Warm-up remains a counterexample to a simple confidence explanation.";
}
function wireGuide() {
  $("guideDismiss").addEventListener("click", () => {
    cancelGuide();
    $("guide").hidden = true;
  });
  // Manual choices always win over a future guide update.
  for (const node of [
    el.controls,
    el.tabInstrument,
    el.tabSandbox,
    el.sandboxInput,
    $("tokenSlider"),
    $("playTokens"),
  ]) {
    node.addEventListener(
      "pointerdown",
      () => {
        if (guideActive) {
          cancelGuide();
          $("guideNext").textContent = "Restart guide";
          guideStep = 0;
        }
      },
      true,
    );
    node.addEventListener(
      "keydown",
      () => {
        if (guideActive) {
          cancelGuide();
          $("guideNext").textContent = "Restart guide";
          guideStep = 0;
        }
      },
      true,
    );
  }
  $("guideNext").addEventListener("click", () => {
    clearTimeout(guideTimer);
    if (guideStep === 3) {
      cancelGuide();
      $("guide").hidden = true;
      return;
    }
    guideActive = true;
    if (guideStep === 0) {
      guideStep = 1;
      $("guideTitle").textContent = "First encounter → repetition";
      $("guideIndex").textContent = "01 / 03";
      guidePreset(2, "trained", 1);
      $("guideNext").textContent = "Add repetitions";
    } else if (guideStep === 1 && state.repeats === 1) {
      guidePreset(2, "trained", 8);
      $("guideNext").textContent = "Test layer 0 →";
    } else if (guideStep === 1) {
      guideStep = 2;
      $("guideTitle").textContent = "Does every layer do this?";
      $("guideIndex").textContent = "02 / 03";
      guidePreset(0, "trained", 8);
      $("guideNext").textContent = "Remove training →";
    } else {
      guideStep = 3;
      $("guideTitle").textContent = "Now remove the learning.";
      $("guideIndex").textContent = "03 / 03";
      guidePreset(2, "untrained", 8);
      $("guideNext").textContent = "Skip the guide";
    }
  });
}

async function loadTransformerModels() {
  await Promise.all(
    ["trained", "untrained"].map(async (kind) => {
      if (transformerModels[kind] || transformerLoads[kind]) return;
      transformerLoads[kind] = true;
      delete transformerLoadErrors[kind];
      try {
        const path =
          kind === "trained"
            ? "weights_transformer.json"
            : "weights_transformer_untrained.json";
        const response = await fetch(path);
        if (!response.ok) throw new Error("HTTP " + response.status);
        transformerModels[kind] = new TinyTransformer(await response.json());
        /* Repaint the control's own panel as soon as its model exists. The
         * retry button hides itself on click, so without this the reader can
         * see a hidden retry button above a label still reading "unavailable"
         * until the deferred refresh lands a frame or more later. */
        if (kind === state.weights && state.result && !state.result.pending)
          renderTransformerInspector(state.selectedToken);
        if (state.result && !state.result.pending) refresh();
      } catch (error) {
        transformerLoadErrors[kind] = error.message;
        if (kind === state.weights)
          renderTransformerInspector(state.selectedToken);
      } finally {
        delete transformerLoads[kind];
      }
    }),
  );
}
function liveTransformerResult() {
  if (
    !state.result ||
    state.result.pending ||
    !transformerModels[state.weights]
  )
    return null;
  const key = state.weights + "|" + state.result.tokens.join(",");
  if (transformerCache.has(key)) return transformerCache.get(key);
  const value = transformerModels[state.weights].forward(state.result.tokens, {
    keepRaw: true,
  });
  if (transformerCache.size >= 3)
    transformerCache.delete(transformerCache.keys().next().value);
  transformerCache.set(key, value);
  return value;
}
function renderTransformerInspector(t) {
  const out = liveTransformerResult();
  if (!out) {
    $("gridQualityExplanation").textContent = "Prediction comparison unavailable while the selected Transformer is loading or unavailable.";
    for (const cell of transformerCells) cell.classList.remove("active");
    transformerActiveShadow.fill(0);
    const error = transformerLoadErrors[state.weights];
    $("retryTransformer").hidden = !error;
    $("transformerLiveStat").textContent = error
      ? "Live control unavailable (" +
        error +
        "). Offline results remain below."
      : "Selected Transformer weights are loading.";
    $("transformerGrid").setAttribute(
      "aria-label",
      "Transformer measurement unavailable",
    );
    return;
  }
  $("retryTransformer").hidden = true;
  const bdhErrors = state.result.ceAtTarget.filter(Number.isFinite);
  const transformerErrors = Array.from(out.crossEntropyBits);
  const meanError = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const bdhError = meanError(bdhErrors), transformerError = meanError(transformerErrors);
  const comparable = bdhErrors.length > 0 && bdhErrors.length === transformerErrors.length
    && Number.isFinite(bdhError) && Number.isFinite(transformerError);
  $("gridQualityExplanation").textContent = comparable
    ? "Prediction error on this whole input: BDH " + bdhError.toFixed(3) + " bits; Transformer " + transformerError.toFixed(3) + " bits. Lower is better. " +
      (Math.abs(bdhError - transformerError) < 0.0005 ? "The averages are effectively equal at this precision."
        : (transformerError < bdhError ? "The Transformer" : "BDH") + " predicts better by this average-error metric on this input.") +
      " This measures the final output across " + bdhErrors.length + " next-letter predictions, not the selected layer or token. It does not establish an overall winner." +
      (state.weights === "untrained" ? " These are random-weight models; an error difference is not evidence of learning." : "")
    : "There are not enough comparable next-letter predictions to score this input.";
  const raw = out.hidden[state.layer];
  let count = 0;
  for (let n = 0; n < N_TOTAL; n++) {
    const active = raw[t * N_TOTAL + n] > 0;
    if (active !== !!transformerActiveShadow[n]) {
      transformerCells[n].classList.toggle("active", active);
      transformerActiveShadow[n] = active ? 1 : 0;
    }
    count += active ? 1 : 0;
  }
  if (count !== out.activeCounts[state.layer][t])
    throw new Error("Transformer grid/count mismatch");
  let summary =
    "LIVE · " +
    state.weights.toUpperCase() +
    " · LAYER " +
    state.layer +
    " · TOKEN " +
    t +
    " · " +
    count +
    " of 1024 active";
  if (state.mode === "instrument") {
    const mem = phaseMean(
      out.activeFraction[state.layer],
      state.repeats,
      "memorize",
    );
    const rep = phaseMean(
      out.activeFraction[state.layer],
      state.repeats,
      "repeat",
    );
    summary +=
      " · phase ratio " + (rep ? (mem / rep).toFixed(2) + "×" : "unavailable");
  }
  $("transformerLiveStat").textContent = summary;
  $("transformerGrid").setAttribute(
    "aria-label",
    summary + ". Token-major ReLU hidden activations.",
  );
}
async function loadOfflineComparison() {
  try {
    const files = [
      "results.json",
      "docs/baseline-evidence.json",
      "results_transformer.json",
      "results_transformer_untrained.json",
    ];
    const data = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(file);
        if (!response.ok) throw new Error(file + ": HTTP " + response.status);
        return response.json();
      }),
    );
    if (!data[2].convergence || !data[2].convergence.passed)
      throw new Error("Transformer predictive-comparability gate did not pass");
    const names = [
      "BDH · trained",
      "BDH · untrained",
      "ReLU Transformer · trained",
      "ReLU Transformer · untrained",
    ];
    const rows = data
      .map((d, i) => {
        // The compact audited summary avoids downloading a full 2.3 MB raw
        // reference tensor just to display two offline phase means.
        const baseline = i === 1 ? d.summaries.untrained["2"] : null;
        const l = baseline
          ? { memorize: baseline.memorize.mean, repeat: baseline.repeat.mean }
          : d.per_layer["2"];
        return (
          '<tr><th scope="row">' +
          names[i] +
          "</th><td>" +
          pct(l.memorize) +
          "</td><td>" +
          pct(l.repeat) +
          "</td><td>" +
          (l.memorize / l.repeat).toFixed(2) +
          "×</td></tr>"
        );
      })
      .join("");
    $("comparisonStatus").textContent =
      "Both trained models become sparser at layer 2 on this fixed sequence. The size of the contrast differs. This is one experiment, not an architecture ranking.";
    $("comparisonResults").innerHTML =
      '<table class="comparison-table"><caption>Canonical word mmgtfhhe · 8 occurrences · layer 2 · activity means</caption><thead><tr><th scope="col">Model</th><th scope="col">Memorize</th><th scope="col">Repeat</th><th scope="col">Ratio</th></tr></thead><tbody>' +
      rows +
      '</tbody></table><p class="figure__sub">The Transformer passed the predeclared prediction gate: evaluation CE ' +
      data[2].cross_entropy.mean_bits.toFixed(3) +
      ' bits. Its attention, mask, head width, residual pathway and parameter budget differ from BDH.</p><p class="src"><a href="docs/transformer-results.md">Full results, all layers &amp; limitations ↗</a> · <a href="docs/transformer-protocol.md">Predeclared protocol ↗</a></p>';
  } catch (error) {
    $("comparisonStatus").textContent =
      "Offline comparison could not load (" +
      error.message +
      "). Open the full experiment results below.";
    $("comparisonResults").innerHTML =
      '<a href="docs/transformer-results.md">Read the offline experiment</a>';
  }
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", boot);
else boot();
