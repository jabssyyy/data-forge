'use strict';
/* =====================================================================
 * bdh.js - BDH forward pass, plain JavaScript, no dependencies.
 *
 * A faithful port of pathwaycom/bdh `bdh.py` (MIT) at 1/64th scale, with a
 * measurement hook for the active-neuron fraction. This is an INDEPENDENT,
 * SHRUNK REIMPLEMENTATION FOR TEACHING - it is NOT an official BDH model.
 *
 * ---------------------------------------------------------------------
 * WEIGHTS ARE SHARED ACROSS LAYERS - behaviour differs by layer only
 * because the residual stream transforms between them.
 *
 * There is one `encoder`, one `encoderV`, one `decoder`. The layer loop below
 * runs the SAME weight matrices at every layer depth; nothing is indexed by
 * layer. So when the learner switches layer 0 -> layer 2, no weight changes.
 * Nothing was configured differently for layer 2. The layers differ only in
 * what the residual stream `x` has become by the time each one runs.
 * Confirmations: bdh.py:122-144 (`level` unused in the loop body); parameter
 * count identical at n_layer = 2, 4, 6, 12; BDH paper p.18 gives the trainable
 * set as (E, D_x, D_y, f_e, f_d) with 3nd + 2|Omega|d parameters - no factor
 * of L anywhere.
 *
 * ---------------------------------------------------------------------
 * NAME MAPPING - the paper and the repo invert these names.
 *
 *   paper D_x  =  repo `encoder`    =  Appendix E `decoder_x`   (d -> n)
 *   paper D_y  =  repo `encoderV`   =  Appendix E `decoder_y`   (d -> n)
 *   paper E    =  repo `decoder`    =  Appendix E `encoder`     (n -> d)
 *
 * The mechanism panel shows Definition 4 (paper p.18):
 *     y := ( D_y LN(a*) )^+  (*)  x
 * where (*) is the elementwise product. So the paper's `y` is the GATED
 * product, which is `xySparse` below - NOT `ySparse`, which is only the
 * ungated left factor. Measuring `ySparse` would be the wrong variable.
 *
 * ---------------------------------------------------------------------
 * Numerical notes (these decide whether parity passes):
 *   - LayerNorm uses eps = 1e-5 INSIDE the sqrt, and BIASED variance (/D).
 *     Both are mandatory. See layerNormRow().
 *   - Token 0 attends to nothing (strictly lower-triangular attention), so it
 *     reads exactly 0.0% active in every layer. Correct, not a bug.
 *   - RoPE phases are computed in float32 (Math.fround) to match PyTorch,
 *     which builds the frequency and phase tensors in float32. Computing them
 *     in float64 here would be *more* accurate than the reference and would
 *     show up as a systematic ~1e-5 disagreement.
 *   - dropout omitted: inference only.
 * ===================================================================== */

const EPS = 1e-5;
const f32 = Math.fround;

/* ---------------------------------------------------------------------
 * Weight loading. Flattens the nested JSON arrays into Float32Arrays.
 * ------------------------------------------------------------------ */

function flatten(nested, expected) {
  const out = new Float32Array(expected);
  let i = 0;
  (function walk(node) {
    if (Array.isArray(node)) {
      for (let k = 0; k < node.length; k++) walk(node[k]);
    } else {
      out[i++] = node;
    }
  })(nested);
  if (i !== expected) {
    throw new Error('weight tensor had ' + i + ' values, expected ' + expected);
  }
  return out;
}

/* RoPE frequencies, matching bdh.py get_freqs() exactly:
 *   quantize(j) = floor(j/2)*2
 *   freqs[j]    = 1 / (theta ^ (quantize(j)/N)) / (2*pi),  theta = 2^16
 * quantize makes freqs[2k] === freqs[2k+1], so each (even, odd) coordinate
 * pair shares one phase - that is what makes this a real 2-D rotation.
 * Every step is rounded to float32 because PyTorch builds this in float32. */
function buildFreqs(N) {
  const theta = 65536;
  const twoPi = f32(2 * Math.PI);
  const freqs = new Float32Array(N);
  for (let j = 0; j < N; j++) {
    const q = Math.floor(j / 2) * 2;
    const e = f32(q / N);
    freqs[j] = f32(f32(1.0 / f32(Math.pow(theta, e))) / twoPi);
  }
  return freqs;
}

function loadWeights(json) {
  const c = json.config;
  const D = c.n_embd;
  const nh = c.n_head;
  const N = (c.mlp_mult * D) / nh;
  const nTotal = nh * N;
  if (nTotal !== c.n_total) {
    throw new Error('config n_total ' + c.n_total + ' != nh*N ' + nTotal);
  }
  return {
    nLayer: c.n_layer,
    D: D,
    nh: nh,
    N: N,
    nTotal: nTotal,
    vocab: c.vocab_size,
    embed: flatten(json.embed, c.vocab_size * D),      // [v*D + d]
    encoder: flatten(json.encoder, nh * D * N),        // [h*D*N + d*N + j]
    encoderV: flatten(json.encoder_v, nh * D * N),     // [h*D*N + d*N + j]
    decoder: flatten(json.decoder, nTotal * D),        // [(h*N + j)*D + d]
    lmHead: flatten(json.lm_head, D * c.vocab_size),   // [d*vocab + v]
    warmup: json.warmup,
    provenance: json.provenance,
    freqs: buildFreqs(N)
  };
}

/* ---------------------------------------------------------------------
 * LayerNorm, parameter-free (no weight, no bias), over the last dim.
 *
 * PyTorch's nn.LayerNorm(D, elementwise_affine=False, bias=False) uses BIASED
 * variance (divide by D, not D-1) and adds eps INSIDE the sqrt.
 *
 * The eps is not a nicety. Token 0 attends to nothing, so its attention output
 * is the all-zero vector; mean and variance are both 0. Without eps this is
 * 0/0 = NaN, and because the attention value input V is the residual stream x,
 * that NaN reaches every later token in the next layer. The page would render
 * blank with no console error.
 * ------------------------------------------------------------------ */
function layerNormRow(src, srcOff, dst, dstOff, D) {
  let mean = 0;
  for (let d = 0; d < D; d++) mean += src[srcOff + d];
  mean /= D;
  let varSum = 0;
  for (let d = 0; d < D; d++) {
    const c = src[srcOff + d] - mean;
    varSum += c * c;
  }
  const inv = 1 / Math.sqrt(varSum / D + EPS);   // biased variance, eps inside sqrt
  for (let d = 0; d < D; d++) dst[dstOff + d] = (src[srcOff + d] - mean) * inv;
}

/* ---------------------------------------------------------------------
 * The model.
 * ------------------------------------------------------------------ */
class BDH {
  constructor(weightsJson) {
    this.w = loadWeights(weightsJson);
  }

  /* Runs one sequence. Returns per-layer active counts and fractions, the
   * per-token cross-entropy in bits, and the logits.
   * opts.keepRaw = true also returns the raw xySparse values (parity testing).
   * opts.captureMemory = {layer, head} exposes copies of actual read/write tensors.
   * opts.memoryDecay < 1 applies an experimental full-model retention intervention;
   * the default 1 preserves the trained checkpoint's original computation. */
  forward(tokens, opts) {
    const keepRaw = !!(opts && opts.keepRaw);
    const memoryDecay = opts && opts.memoryDecay !== undefined ? opts.memoryDecay : 1;
    if (!Number.isFinite(memoryDecay) || memoryDecay <= 0 || memoryDecay > 1) {
      throw new Error('Memory retention must be in (0, 1]');
    }
    const capture = opts && opts.captureMemory;
    if (capture && (!Number.isInteger(capture.layer) || capture.layer < 0 || capture.layer >= this.w.nLayer
      || !Number.isInteger(capture.head) || capture.head < 0 || capture.head >= this.w.nh)) {
      throw new Error('Invalid memory capture layer or head');
    }
    let memoryTrace = null;
    const w = this.w;
    const D = w.D, nh = w.nh, N = w.N, vocab = w.vocab, nTotal = w.nTotal;
    const T = tokens.length;

    // residual stream, shared across heads (in PyTorch it carries a head axis
    // of size 1 and broadcasts)
    let x = new Float32Array(T * D);
    const xNorm = new Float32Array(T * D);
    for (let t = 0; t < T; t++) {
      const v = tokens[t];
      for (let d = 0; d < D; d++) x[t * D + d] = w.embed[v * D + d];
    }
    for (let t = 0; t < T; t++) layerNormRow(x, t * D, xNorm, t * D, D);
    x = xNorm;

    // RoPE phase tables. freqs[2k] === freqs[2k+1], so one entry per pair.
    // float32 throughout, matching PyTorch.
    const half = N / 2;
    const twoPi = f32(2 * Math.PI);
    const cosTab = new Float32Array(T * half);
    const sinTab = new Float32Array(T * half);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < half; k++) {
        const raw = f32(t * w.freqs[2 * k]);
        const ph = f32(f32(raw % 1) * twoPi);
        cosTab[t * half + k] = f32(Math.cos(ph));
        sinTab[t * half + k] = f32(Math.sin(ph));
      }
    }

    // scratch buffers, reused across heads and layers
    const xSparse = new Float32Array(T * N);
    const qr = new Float32Array(T * N);
    const scores = new Float32Array(T * T);
    const attnV = new Float32Array(T * D);
    const yKV = new Float32Array(T * D);
    const ySparse = new Float32Array(T * N);
    const xy = new Float32Array(nh * T * N);       // [h*T*N + t*N + j]
    const yMLP = new Float32Array(T * D);
    const yNorm = new Float32Array(T * D);
    const xNext = new Float32Array(T * D);

    const activeCounts = [];
    const activeFraction = [];
    const rawLayers = [];

    for (let layer = 0; layer < w.nLayer; layer++) {
      // ---- SAME weights every layer: nothing below is indexed by `layer` ----
      for (let h = 0; h < nh; h++) {
        const encBase = h * D * N;

        // x_latent = x @ encoder[h] ; x_sparse = relu(x_latent)
        for (let t = 0; t < T; t++) {
          const xo = t * D, so = t * N;
          for (let j = 0; j < N; j++) {
            let acc = 0;
            for (let d = 0; d < D; d++) acc += x[xo + d] * w.encoder[encBase + d * N + j];
            xSparse[so + j] = acc > 0 ? acc : 0;
          }
        }

        // QR = rope(x_sparse). Pair (2k, 2k+1) shares one phase:
        //   out[2k]   = v[2k]  *cos - v[2k+1]*sin
        //   out[2k+1] = v[2k+1]*cos + v[2k]  *sin
        for (let t = 0; t < T; t++) {
          const so = t * N, po = t * half;
          for (let k = 0; k < half; k++) {
            const c = cosTab[po + k], s = sinTab[po + k];
            const a = xSparse[so + 2 * k], b = xSparse[so + 2 * k + 1];
            qr[so + 2 * k] = a * c - b * s;
            qr[so + 2 * k + 1] = b * c + a * s;
          }
        }

        // scores = (QR @ QR^T).tril(diagonal=-1)  -- STRICTLY lower triangular.
        // K is literally Q (bdh.py:58 asserts `K is Q`), so this is QR against
        // itself. Row 0 is all zeros: token 0 attends to nothing.
        for (let t = 0; t < T; t++) {
          const ro = t * T, qo = t * N;
          for (let s = 0; s < t; s++) {
            const ko = s * N;
            let acc = 0;
            for (let j = 0; j < N; j++) acc += qr[qo + j] * qr[ko + j];
            // λ=1 preserves the original computation exactly. λ<1 is a
            // separately labelled experimental intervention, not native decay.
            scores[ro + s] = memoryDecay === 1 ? acc : acc * Math.pow(memoryDecay, t - s - 1);
          }
          for (let s = t; s < T; s++) scores[ro + s] = 0;
        }

        // attnV = scores @ V, where V is the residual stream x
        for (let t = 0; t < T; t++) {
          const ro = t * T, ao = t * D;
          for (let d = 0; d < D; d++) attnV[ao + d] = 0;
          for (let s = 0; s < t; s++) {
            const sc = scores[ro + s];
            if (sc === 0) continue;
            const xo = s * D;
            for (let d = 0; d < D; d++) attnV[ao + d] += sc * x[xo + d];
          }
        }

        // yKV = LN(attnV). For token 0 this is LN(all zeros) -> zeros, via eps.
        for (let t = 0; t < T; t++) layerNormRow(attnV, t * D, yKV, t * D, D);

        // y_sparse = relu(yKV @ encoder_v[h])   <- the ungated left factor
        for (let t = 0; t < T; t++) {
          const yo = t * D, so = t * N;
          for (let j = 0; j < N; j++) {
            let acc = 0;
            for (let d = 0; d < D; d++) acc += yKV[yo + d] * w.encoderV[encBase + d * N + j];
            ySparse[so + j] = acc > 0 ? acc : 0;
          }
        }

        // xy_sparse = x_sparse * y_sparse   <- THE MEASURED VARIABLE (paper's y)
        const xyBase = h * T * N;
        for (let t = 0; t < T; t++) {
          const so = t * N, xo = xyBase + t * N;
          for (let j = 0; j < N; j++) xy[xo + j] = xSparse[so + j] * ySparse[so + j];
        }
        if (capture && capture.layer === layer && capture.head === h) {
          // Copies expose the actual tensors without altering the forward pass.
          // The graph reconstructs context state from these reads and writes.
          memoryTrace = {
            layer, head: h, T, N, D, decay: memoryDecay,
            query: qr.slice(), values: x.slice(), xSparse: xSparse.slice(),
            attention: attnV.slice(), gate: ySparse.slice(),
            xy: xy.slice(xyBase, xyBase + T * N)
          };
        }
      }

      // measurement: how many of the nTotal neurons are non-zero at each token
      const counts = new Int32Array(T);
      for (let h = 0; h < nh; h++) {
        const xyBase = h * T * N;
        for (let t = 0; t < T; t++) {
          const xo = xyBase + t * N;
          let n = 0;
          for (let j = 0; j < N; j++) if (xy[xo + j] > 0) n++;
          counts[t] += n;
        }
      }
      const frac = new Float64Array(T);
      for (let t = 0; t < T; t++) frac[t] = counts[t] / nTotal;
      activeCounts.push(counts);
      activeFraction.push(frac);
      if (keepRaw) rawLayers.push(xy.slice());

      // head-major concat: transpose then reshape.
      // PyTorch does xy_sparse.transpose(1,2).reshape(B,1,T,N*nh), which gives
      // (B, T, nh, N) flattened as index = h*N + j - head-major. The decoder's
      // rows are ordered the same way, (nh*N, D). Doing this as j*nh + h instead
      // yields a model that runs and produces plausible-looking but wrong curves.
      // dropout omitted: inference only.
      for (let t = 0; t < T; t++) {
        const mo = t * D;
        for (let d = 0; d < D; d++) yMLP[mo + d] = 0;
        for (let h = 0; h < nh; h++) {
          const xo = h * T * N + t * N;
          const rowBase = h * N;
          for (let j = 0; j < N; j++) {
            const v = xy[xo + j];
            if (v === 0) continue;                 // xy is sparse; exact-zero skip
            const dec = (rowBase + j) * D;
            for (let d = 0; d < D; d++) yMLP[mo + d] += v * w.decoder[dec + d];
          }
        }
      }

      // x = LN(x + LN(yMLP))
      for (let t = 0; t < T; t++) layerNormRow(yMLP, t * D, yNorm, t * D, D);
      for (let t = 0; t < T; t++) {
        const o = t * D;
        for (let d = 0; d < D; d++) yNorm[o + d] += x[o + d];
        layerNormRow(yNorm, o, xNext, o, D);
      }
      x.set(xNext);
    }

    // logits = x @ lm_head
    const logits = new Float32Array(T * vocab);
    for (let t = 0; t < T; t++) {
      const xo = t * D, lo = t * vocab;
      for (let v = 0; v < vocab; v++) {
        let acc = 0;
        for (let d = 0; d < D; d++) acc += x[xo + d] * w.lmHead[d * vocab + v];
        logits[lo + v] = acc;
      }
    }

    // cross-entropy in bits: position t predicts token t+1, so T-1 values
    const LN2 = Math.log(2);
    const crossEntropyBits = new Float64Array(T - 1);
    for (let t = 0; t < T - 1; t++) {
      const lo = t * vocab;
      let max = -Infinity;
      for (let v = 0; v < vocab; v++) if (logits[lo + v] > max) max = logits[lo + v];
      let sum = 0;
      for (let v = 0; v < vocab; v++) sum += Math.exp(logits[lo + v] - max);
      const logProb = (logits[lo + tokens[t + 1]] - max) - Math.log(sum);
      crossEntropyBits[t] = -logProb / LN2;
    }

    return {
      activeCounts: activeCounts,        // [nLayer][T] integers
      activeFraction: activeFraction,    // [nLayer][T] in 0..1
      crossEntropyBits: crossEntropyBits,
      logits: logits,
      xySparse: keepRaw ? rawLayers : null,   // [nLayer] Float32Array(nh*T*N)
      memoryTrace: memoryTrace,
      T: T
    };
  }
}

/* ---------------------------------------------------------------------
 * Sequence construction, matching the BDH paper Section 6.4 protocol:
 * a fixed 13-letter warm-up, then a random 8-letter word repeated `repeats`
 * times. Cycle length = 13 + 8*repeats.
 * ------------------------------------------------------------------ */
function buildSequence(warmup, word, repeats) {
  const seq = warmup.slice();
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < word.length; i++) seq.push(word[i]);
  }
  return seq;
}

/* Oracle surprisal in bits, from the generating process - no model involved.
 * Warm-up is fixed, so 0 bits. The word's first presentation is a fresh random
 * draw from 26 letters, so log2(26) bits per letter. Every repeat is 0 bits. */
function oracleSurprisalBits(warmupLen, wordLen, repeats) {
  const bits = [];
  for (let i = 0; i < warmupLen; i++) bits.push(0);
  for (let i = 0; i < wordLen; i++) bits.push(Math.log2(26));
  for (let r = 1; r < repeats; r++) {
    for (let i = 0; i < wordLen; i++) bits.push(0);
  }
  return bits;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BDH, loadWeights, buildFreqs, layerNormRow, buildSequence, oracleSurprisalBits, EPS };
}
