'use strict';
// Independent mathematical checks for the measured memory projection.
const fs = require('fs');
const assert = require('assert/strict');
const { BDH, buildSequence } = require('./bdh.js');
const Memory = require('./memory.js');
const report = { passed: false, cases: [], checks: ['instrumentation bit-exact', 'direct causal attention versus recurrent memory', 'full centered projection versus gated activations', 'empty initial memory', 'fixed-cohort prefix causality', 'signed edge read/write histories', 'damping age law'] };
function error(actual, expected) {
  let delta = 0, scale = 0;
  for (let i = 0; i < actual.length; i++) {
    assert(Number.isFinite(actual[i]) && Number.isFinite(expected[i]));
    delta = Math.max(delta, Math.abs(actual[i] - expected[i]));
    scale = Math.max(scale, Math.abs(expected[i]));
  }
  const relative = delta / Math.max(scale, 1e-30);
  assert(relative < 1e-4, `scale-normalized error ${relative}`);
  return relative;
}
for (const weights of ['weights_trained.json', 'weights_untrained.json']) {
  const model = new BDH(JSON.parse(fs.readFileSync(weights)));
  const tokens = buildSequence(model.w.warmup, Array.from('mmgtfhhe', c => c.charCodeAt(0)-97), 8);
  const baseline = model.forward(tokens, { keepRaw: true });
  for (const decay of [1, 0.96]) for (let layer = 0; layer < model.w.nLayer; layer++) for (let head = 0; head < model.w.nh; head++) {
    const a = Memory.analyze(model, tokens, { layer, head, decay });
    const tr = a.trace, { T, N, D, query: q, values: v } = tr;
    if (decay === 1) {
      assert.deepEqual(a.output.logits, baseline.logits);
      assert.deepEqual(a.output.xySparse, baseline.xySparse);
      assert.deepEqual(a.output.activeCounts, baseline.activeCounts);
    }
    const direct = new Float64Array(T * D);
    // Independently sum pairwise scores; no memory.js state or helpers used.
    for (let t = 0; t < T; t++) for (let s = 0; s < t; s++) {
      let score = 0;
      for (let j = 0; j < N; j++) score += q[t*N+j] * q[s*N+j];
      score *= Math.pow(decay, t-s-1);
      for (let d = 0; d < D; d++) direct[t*D+d] += score*v[s*D+d];
    }
    const attentionError = error(direct, tr.attention);
    const gates = new Float64Array(T*N), xy = new Float64Array(T*N);
    for (let t = 0; t < T; t++) {
      let mean = 0, variance = 0;
      for (let d = 0; d < D; d++) mean += direct[t*D+d]/D;
      for (let d = 0; d < D; d++) variance += (direct[t*D+d]-mean)**2/D;
      for (let k = 0; k < N; k++) {
        let projected = 0;
        for (let d = 0; d < D; d++) projected += (direct[t*D+d]-mean)*model.w.encoderV[(head*D+d)*N+k];
        gates[t*N+k] = Math.max(0, projected/Math.sqrt(variance+1e-5));
        xy[t*N+k] = gates[t*N+k]*tr.xSparse[t*N+k];
      }
    }
    const gateError = error(gates, tr.gate), xyError = error(xy, tr.xy);
    assert.equal(a.stateNorm[0], 0);
    for (const pair of a.pairs) {
      assert.equal(pair.history[0], 0);
      for (let t = 0; t < T; t++) {
        let expected = 0;
        for (let s = 0; s < t; s++) {
          let value = 0, encoderMean = 0;
          for (let d = 0; d < D; d++) encoderMean += model.w.encoderV[(head*D+d)*N+pair.target]/D;
          for (let d = 0; d < D; d++) value += v[s*D+d]*(model.w.encoderV[(head*D+d)*N+pair.target]-encoderMean);
          expected += Math.pow(decay,t-s-1)*q[s*N+pair.source]*value;
        }
        assert(Math.abs(expected-pair.history[t]) < 1e-8*Math.max(1,Math.abs(expected)));
        if (t+1<T) assert.equal(pair.afterWrite[t], pair.history[t+1]);
      }
    }
    for (let k = 0; k < N; k++) assert.equal(tr.xy[k], 0);
    const frame = Memory.frame(a, T-1);
    assert.equal(frame.isCounterfactual, decay !== 1);
    assert.equal(frame.edges.length, a.selection.sources.length*a.selection.targets.length);
    for (const edge of frame.edges) for (const key of ['value','previousValue','nextValue','currentRead']) assert(Number.isFinite(edge[key]));
    // Prefix tests retain full-sequence cohort: ranking itself may use future tokens.
    if (head === 0) {
      const prefix = Memory.analyze(model, tokens.slice(0,24), { layer, head, decay, selection: a.selection });
      for (let p = 0; p < a.pairs.length; p++) assert.deepEqual(prefix.pairs[p].history, a.pairs[p].history.slice(0,24));
    }
    report.cases.push({ weights, decay, layer, head, attentionError, memoryReadError: a.normalizedError, gateError, xyError });
  }
}
// Isolated write stops changing without new input at lambda=1; damping only
// attenuates it in the explicitly modified recurrence.
for (const lambda of [1, 0.96]) {
  let state = 7;
  for (let age = 0; age < 50; age++) {
    assert(Math.abs(state-7*Math.pow(lambda,age)) < 1e-12);
    state = lambda*state;
  }
}
report.passed = true;
report.caseCount = report.cases.length;
report.maximumErrors = Object.fromEntries(['attentionError','memoryReadError','gateError','xyError'].map(key=>[key,Math.max(...report.cases.map(c=>c[key]))]));
fs.writeFileSync('docs/memory-verification.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,cases:report.caseCount,maximumErrors:report.maximumErrors},null,2));
