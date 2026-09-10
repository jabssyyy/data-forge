'use strict';
/* =====================================================================
 * parity_test.js - checks bdh.js against the PyTorch reference.
 *
 *   node parity_test.js
 *
 * Runs the same fixed 77-token sequence through the JS port and compares it to
 * reference.json (written by `python bdh_probe.py --dump-reference`).
 *
 * WHAT IS COMPARED, AND WHY IT IS NOT THE ACTIVE FRACTION:
 * the active fraction is a count over 1024 neurons, so its granularity is
 * 1/1024 ~= 9.8e-4. A 1e-4 tolerance effectively requires identical counts, and
 * two implementations that disagree about a value's sign can still produce
 * identical fractions.
 *
 * WHY THE ERROR GATE IS SCALE-NORMALISED, NOT ELEMENTWISE-RELATIVE.
 * The first version of this test gated on max elementwise |a-b|/|a|. That
 * metric is ill-posed here and was replaced after measuring why, not to make
 * the test pass. xy_sparse = x_sparse * y_sparse, both ReLU outputs, so values
 * just above the ReLU threshold are dot products that nearly cancelled: a value
 * of 1.2e-5 sits in a tensor whose largest entry is 5.8, and it carries the
 * absolute rounding error of the full-magnitude dot product that produced it.
 * Dividing by it measures cancellation, not agreement. Measured on this fixture,
 * elementwise relative error is 1.4e-5 for |ref| > 0.1 and 9.6e-5 for
 * |ref| > 1e-2, and only degrades below that, on 0.19% of the non-zero values.
 * Any two float32 implementations with different summation order behave this way.
 *
 * So the gates are the well-posed quantities:
 *   1. active neuron counts   -> EXACT integer match, per layer, per token
 *   2. zero/non-zero pattern  -> EXACT agreement (which neurons fired)
 *   3. raw xy_sparse values   -> max|a-b| / max|ref| < 1e-4  (scale-normalised)
 *   4. token 0                -> exactly 0 active in every layer
 *   5. cross-entropy          -> finite, max absolute error < 1e-4 bits
 * Elementwise relative error is still reported, stratified by magnitude, so the
 * degradation is visible rather than hidden by the choice of metric.
 *
 * Gates 1 and 2 are the decisive ones: the artifact's claim is about WHICH
 * neurons are active, and those agree exactly on all 315,392 values.
 *
 * If this fails, the likely culprits in order are: RoPE interleave sign
 * convention, LayerNorm eps placement, head-concat order.
 *
 * NEGATIVE CONTROLS (run 2026-09-08, trained fixture). Each suspect was broken
 * deliberately to confirm this test is not passing vacuously:
 *
 *   mutation                      zero-mismatches  count-mismatches  scale err
 *   baseline (unmodified)                       0        0 of 308     2.8e-7
 *   RoPE interleave sign flipped           13,068      290 of 308     3.5e-1
 *   LayerNorm eps removed                   4,151      178 of 308     7.9e-1
 *   head-concat order -> j*nh+h            26,981      227 of 308     9.1e-1
 *
 * Note the LayerNorm row. Removing eps does NOT produce an obviously broken
 * page: relu is written `acc > 0 ? acc : 0`, and NaN > 0 is false, so every
 * NaN silently becomes 0. The result is 4,151 wrongly-dead neurons and 4
 * non-finite cross-entropy values - a plausible-looking, wrong artifact.
 * That is why eps is a gate here and not a code comment.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const { BDH } = require('./bdh.js');

const REL_TOLERANCE = 1e-4;
const CE_TOLERANCE_BITS = 1e-4;

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, p), 'utf8'));
}

/* Flattens reference xy_sparse [nh][T][N] into the same layout bdh.js uses:
 * index = h*T*N + t*N + j. */
function flattenRef(nested, nh, T, N) {
  const out = new Float32Array(nh * T * N);
  let i = 0;
  for (let h = 0; h < nh; h++) {
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < N; j++) out[i++] = nested[h][t][j];
    }
  }
  return out;
}

function compare(label, weightsPath, referencePath) {
  console.log('='.repeat(66));
  console.log(label);
  console.log('  weights:   ' + weightsPath);
  console.log('  reference: ' + referencePath);

  const weights = loadJSON(weightsPath);
  const ref = loadJSON(referencePath);

  const nh = ref.shape.n_head;
  const T = ref.shape.T;
  const N = ref.shape.N;
  const nLayer = ref.shape.n_layer;

  const model = new BDH(weights);
  const t0 = Date.now();
  const out = model.forward(ref.sequence, { keepRaw: true });
  const elapsed = Date.now() - t0;

  const STRATA = [1e-1, 1e-2, 1e-3, 1e-4, 1e-6];
  let maxAbs = 0;
  let maxAbsRefVal = 0;
  let maxRefMag = 0;
  let zeroMismatch = 0;      // one side exactly zero, the other not
  let compared = 0;
  let nonZero = 0;
  let rawFinite = true;
  const relByStratum = {};
  for (const s of STRATA) relByStratum[s] = 0;

  for (let l = 0; l < nLayer; l++) {
    const refFlat = flattenRef(ref.xy_sparse[l], nh, T, N);
    const jsFlat = out.xySparse[l];
    if (refFlat.length !== jsFlat.length) {
      throw new Error('layer ' + l + ' length mismatch: ' + refFlat.length + ' vs ' + jsFlat.length);
    }
    for (let i = 0; i < refFlat.length; i++) {
      const a = refFlat[i], b = jsFlat[i];
      if (!Number.isFinite(a) || !Number.isFinite(b)) rawFinite = false;
      const mag = Math.abs(a);
      if ((a === 0) !== (b === 0)) zeroMismatch++;
      if (a !== 0) nonZero++;
      if (mag > maxRefMag) maxRefMag = mag;
      const d = Math.abs(a - b);
      if (d > maxAbs) { maxAbs = d; maxAbsRefVal = a; }
      for (const s of STRATA) {
        if (mag > s) {
          const rel = d / mag;
          if (rel > relByStratum[s]) relByStratum[s] = rel;
        }
      }
      compared++;
    }
  }
  const scaleNormalised = maxRefMag === 0 ? maxAbs : maxAbs / maxRefMag;

  // exact integer active-count match, per layer per token
  let countMismatches = [];
  for (let l = 0; l < nLayer; l++) {
    for (let t = 0; t < T; t++) {
      const r = ref.active_counts[l][t];
      const j = out.activeCounts[l][t];
      if (r !== j) countMismatches.push({ layer: l, token: t, ref: r, js: j });
    }
  }

  // cross-entropy
  let maxCeAbs = 0;
  if (ref.cross_entropy_bits.length !== out.crossEntropyBits.length) {
    throw new Error('cross-entropy length mismatch');
  }
  for (let t = 0; t < ref.cross_entropy_bits.length; t++) {
    const d = Math.abs(ref.cross_entropy_bits[t] - out.crossEntropyBits[t]);
    if (d > maxCeAbs) maxCeAbs = d;
  }

  console.log('  forward pass: ' + elapsed + ' ms for T=' + T);
  console.log('  values compared: ' + compared.toLocaleString()
    + '  (non-zero: ' + nonZero.toLocaleString() + ')');
  console.log('  max |ref| (tensor scale):       ' + maxRefMag.toPrecision(6));
  console.log('  max abs error:                  ' + maxAbs.toExponential(3)
    + '   at ref value ' + maxAbsRefVal.toPrecision(6));
  console.log('  GATE scale-normalised error:    ' + scaleNormalised.toExponential(3)
    + '   (tolerance ' + REL_TOLERANCE.toExponential(0) + ')');
  console.log('  elementwise rel error, by magnitude of ref (reported, not gated):');
  for (const s of STRATA) {
    console.log('      |ref| > ' + s.toExponential(0) + ' : ' + relByStratum[s].toExponential(3));
  }
  console.log('  GATE exact-zero disagreements:  ' + zeroMismatch);
  console.log('  GATE active-count mismatches:   ' + countMismatches.length
    + ' of ' + (nLayer * T));
  if (countMismatches.length) {
    for (const m of countMismatches.slice(0, 10)) {
      console.log('    layer ' + m.layer + ' token ' + m.token
        + ': ref=' + m.ref + ' js=' + m.js);
    }
  }
  console.log('  GATE max abs error (cross-entropy): ' + maxCeAbs.toExponential(3)
    + ' bits (tolerance ' + CE_TOLERANCE_BITS + ')');

  // token 0 must read exactly zero in every layer
  const tok0 = [];
  for (let l = 0; l < nLayer; l++) tok0.push(out.activeCounts[l][0]);
  console.log('  token-0 active counts:          [' + tok0.join(', ')
    + ']  (must all be 0)');

  const scaleOk = scaleNormalised < REL_TOLERANCE;
  const zeroOk = zeroMismatch === 0;
  const countOk = countMismatches.length === 0;
  const tok0Ok = tok0.every(v => v === 0);
  const finiteOk = rawFinite && out.crossEntropyBits.every(v => Number.isFinite(v))
    && ref.cross_entropy_bits.every(v => Number.isFinite(v))
    && out.logits.every(v => Number.isFinite(v));
  const ceOk = maxCeAbs < CE_TOLERANCE_BITS;
  const pass = scaleOk && zeroOk && countOk && tok0Ok && finiteOk && ceOk;

  console.log('  -> ' + (pass ? 'PASS' : 'FAIL')
    + '  [scale ' + (scaleOk ? 'ok' : 'FAIL')
    + ', zeros ' + (zeroOk ? 'ok' : 'FAIL')
    + ', counts ' + (countOk ? 'ok' : 'FAIL')
    + ', token0 ' + (tok0Ok ? 'ok' : 'FAIL')
    + ', finite ' + (finiteOk ? 'ok' : 'FAIL')
    + ', CE ' + (ceOk ? 'ok' : 'FAIL') + ']');
  return pass;
}

function main() {
  const cases = [
    ['TRAINED', 'weights_trained.json', 'probe/reference.json'],
    ['UNTRAINED (falsification control)', 'weights_untrained.json', 'probe/untrained_reference.json']
  ];
  let allPass = true;
  let ran = 0;
  for (const [label, w, r] of cases) {
    if (!fs.existsSync(path.join(__dirname, w)) || !fs.existsSync(path.join(__dirname, r))) {
      console.log('FAIL ' + label + ': missing ' + w + ' or ' + r);
      allPass = false;
      continue;
    }
    ran++;
    if (!compare(label, w, r)) allPass = false;
  }
  console.log('='.repeat(66));
  if (ran === 0) {
    console.log('NOTHING RAN - generate fixtures with:');
    console.log('  python bdh_probe.py --out results.json --export-weights weights_trained.json --dump-reference probe/reference.json');
    console.log('  python bdh_probe.py --untrained --dump-reference-untrained');
    process.exit(1);
  }
  console.log(allPass ? 'PARITY PASSED' : 'PARITY FAILED');
  process.exit(allPass ? 0 : 1);
}

main();
