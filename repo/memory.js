"use strict";

/* A measured projection of the BDH attention state, not a semantic graph.
 * For one head: M[t] = sum(s<t) lambda^(t-1-s) q[s] outer v[s].
 * B[t] = M[t] (encoderV - column means). The full query read of B,
 * divided by the attention LayerNorm standard deviation, reconstructs
 * the gate preactivation. Displaying a subset never changes inference.
 */
(function (root) {
  function rankCoordinates(array, T, width, limit) {
    const scores = new Float64Array(width);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < width; j++) {
        scores[j] = Math.max(scores[j], Math.abs(array[t * width + j]));
      }
    }
    return Array.from({ length: width }, (_, id) => id)
      .sort((a, b) => scores[b] - scores[a] || a - b)
      .slice(0, limit)
      .sort((a, b) => a - b);
  }

  function selectionFor(trace, count = 12) {
    return {
      sources: rankCoordinates(trace.query, trace.T, trace.N, count),
      targets: rankCoordinates(trace.xy, trace.T, trace.N, count),
    };
  }

  function centeredEncoder(model, head) {
    const { D, N, encoderV } = model.w;
    const centered = new Float64Array(D * N);
    for (let k = 0; k < N; k++) {
      let mean = 0;
      for (let d = 0; d < D; d++) mean += encoderV[(head * D + d) * N + k];
      mean /= D;
      for (let d = 0; d < D; d++) {
        centered[d * N + k] = encoderV[(head * D + d) * N + k] - mean;
      }
    }
    return centered;
  }

  function reconstruct(model, output, selection) {
    const trace = output.memoryTrace;
    if (!trace) throw new Error("A captured BDH memory trace is required");
    const { T, N, D, query, values, attention, xy, decay } = trace;
    selection = selection || selectionFor(trace);
    const { sources, targets } = selection;
    const centered = centeredEncoder(model, trace.head);
    const targetCount = targets.length;
    const projectedValues = new Float64Array(T * targetCount);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < targetCount; k++) {
        let sum = 0;
        for (let d = 0; d < D; d++) {
          sum += values[t * D + d] * centered[d * N + targets[k]];
        }
        projectedValues[t * targetCount + k] = sum;
      }
    }

    const pairs = sources.flatMap((j) =>
      targets.map((k) => ({
        source: j,
        target: k,
        history: new Float64Array(T),
        afterWrite: new Float64Array(T),
        contributions: new Float64Array(T),
        peakValue: 0,
      })),
    );
    const projectedState = new Float64Array(pairs.length);
    const memoryState = new Float64Array(N * D);
    const stateNorm = new Float64Array(T);
    const writeNorm = new Float64Array(T);
    const readNorm = new Float64Array(T);
    let maximumAttentionError = 0;
    let attentionScale = 0;
    let scale = 0;

    for (let t = 0; t < T; t++) {
      let stateSquared = 0;
      for (const value of memoryState) stateSquared += value * value;
      stateNorm[t] = Math.sqrt(stateSquared);
      let querySquared = 0;
      let valueSquared = 0;
      for (let j = 0; j < N; j++) querySquared += query[t * N + j] ** 2;
      for (let d = 0; d < D; d++) valueSquared += values[t * D + d] ** 2;
      writeNorm[t] = Math.sqrt(querySquared * valueSquared);
      let attentionMean = 0;
      for (let d = 0; d < D; d++) attentionMean += attention[t * D + d];
      attentionMean /= D;
      let variance = 0;
      let readSquared = 0;
      for (let d = 0; d < D; d++) {
        const observed = attention[t * D + d];
        variance += (observed - attentionMean) ** 2;
        readSquared += observed ** 2;
        let reconstructed = 0;
        for (let j = 0; j < N; j++)
          reconstructed += query[t * N + j] * memoryState[j * D + d];
        maximumAttentionError = Math.max(
          maximumAttentionError,
          Math.abs(reconstructed - observed),
        );
        attentionScale = Math.max(attentionScale, Math.abs(observed));
      }
      const standardDeviation = Math.sqrt(variance / D + 1e-5);
      readNorm[t] = Math.sqrt(readSquared);

      for (let index = 0; index < pairs.length; index++) {
        const pair = pairs[index];
        const targetIndex = index % targetCount;
        const value = projectedState[index];
        pair.history[t] = value;
        pair.contributions[t] =
          (query[t * N + pair.source] * value) / standardDeviation;
        const next =
          decay * value +
          query[t * N + pair.source] *
            projectedValues[t * targetCount + targetIndex];
        pair.afterWrite[t] = next;
        pair.peakValue = Math.max(
          pair.peakValue,
          Math.abs(value),
          Math.abs(next),
        );
        scale = Math.max(scale, Math.abs(value), Math.abs(next));
        projectedState[index] = next;
      }
      // Read first, then write: token zero sees empty memory.
      for (let j = 0; j < N; j++) {
        for (let d = 0; d < D; d++) {
          const index = j * D + d;
          memoryState[index] =
            decay * memoryState[index] + query[t * N + j] * values[t * D + d];
        }
      }
    }
    const normalizedError =
      maximumAttentionError / Math.max(attentionScale, 1e-30);
    if (!Number.isFinite(normalizedError) || normalizedError >= 1e-4) {
      throw new Error(
        "Reconstructed memory does not match the measured attention read",
      );
    }
    return {
      trace,
      output,
      selection,
      pairs,
      scale,
      stateNorm,
      writeNorm,
      readNorm,
      normalizedError,
    };
  }

  function frame(analysis, token, displayScale) {
    const { trace, selection, pairs, output } = analysis;
    const t = Math.max(0, Math.min(trace.T - 1, token));
    const nodes = selection.sources
      .map((j) => ({
        id: "q" + j,
        label: "Q" + j,
        kind: "read",
        activity: trace.query[t * trace.N + j],
        description:
          "Signed RoPE query coordinate " +
          j +
          " in head " +
          trace.head +
          ". It mixes a pair of sparse coordinates; it is not a named concept.",
      }))
      .concat(
        selection.targets.map((k) => ({
          id: "g" + k,
          label: "N" + (trace.head * trace.N + k),
          kind: "write",
          activity: trace.xy[t * trace.N + k],
          description:
            "Actual gated neuron " +
            (trace.head * trace.N + k) +
            ". A zero activation means quiet now, not deleted from memory.",
        })),
      );
    const edges = pairs.map((pair) => ({
      id: "q" + pair.source + "-g" + pair.target,
      source: "q" + pair.source,
      target: "g" + pair.target,
      value: pair.history[t],
      previousValue: t ? pair.history[t - 1] : 0,
      nextValue: pair.afterWrite[t],
      currentRead: pair.contributions[t],
      history: Array.from(pair.history),
      peakValue: pair.peakValue,
    }));
    let stronger = 0,
      weaker = 0;
    for (const edge of edges) {
      const change = Math.abs(edge.value) - Math.abs(edge.previousValue);
      if (change > 1e-9) stronger++;
      if (change < -1e-9) weaker++;
    }
    return {
      step: t,
      token: String.fromCharCode(97 + output.tokens[t]),
      totalSteps: trace.T,
      nodes,
      edges,
      scale: displayScale || analysis.scale || 1,
      leftLabel: "CUE COORDINATES",
      rightLabel: "GATED NEURONS",
      isCounterfactual: trace.decay !== 1,
      decay: trace.decay,
      stats: {
        stateNorm: analysis.stateNorm[t],
        writeNorm: analysis.writeNorm[t],
        readNorm: analysis.readNorm[t],
        stronger,
        weaker,
        activeCount: output.activeCounts[trace.layer][t],
        nextTokenCE: t < trace.T - 1 ? output.crossEntropyBits[t] : null,
      },
    };
  }

  function analyze(model, tokens, options = {}) {
    const output = model.forward(tokens, {
      keepRaw: true,
      memoryDecay: options.decay === undefined ? 1 : options.decay,
      captureMemory: {
        layer: options.layer === undefined ? 2 : options.layer,
        head: options.head || 0,
      },
    });
    output.tokens = Array.from(tokens);
    return reconstruct(model, output, options.selection);
  }

  const API = { analyze, reconstruct, frame, selectionFor, centeredEncoder };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.BDHMemory = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
