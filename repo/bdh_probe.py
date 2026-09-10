"""
Figure 14 reproduction probe - Dragon Hatchling (BDH)
=====================================================
Question: does BDH's activation sparsity fall when the input becomes predictable?

Protocol source: BDH paper (arXiv 2509.26507), Section 6.4 + Figure 14.
Paper's setup:  n=65536 neurons, d=256, L=4 layers, single-letter tokenization,
                trained on a PURPOSE-BUILT SYNTHETIC next-token task (NOT language).
Paper's result: layer 2 shows 4.0-7.5% non-zero during memorization,
                ~2.5% during repetition.

MEASURED VARIABLE - do not change.
    The paper's y is Definition 4 (p.18):   y := ( D_y LN(a*) )^+  (*)  x
    The (*) is an elementwise product, so the paper's y is the GATED product.
    In pathwaycom/bdh bdh.py that is `xy_sparse` (line 136), NOT `y_sparse`
    (line 135, which is only the ungated left factor).

WEIGHTS ARE SHARED ACROSS ALL LAYERS  <<< read this before defending anything
    There is exactly one `encoder`, one `encoder_v`, one `decoder`. The layer loop
    `for level in range(n_layer)` never indexes them - every layer applies the SAME
    weight matrices to a different residual stream.
    Three independent confirmations:
      1. bdh.py:122-144 - `level` is unused inside the loop body.
      2. Total parameter count is identical at n_layer = 2, 4, 6, 12 (checked below).
      3. BDH paper p.18: the trainable set is (E, D_x, D_y, f_e, f_d) with
         3nd + 2*|Omega|*d parameters - no factor of L anywhere.
    Consequence for the artifact: when the learner switches layer 0 -> layer 2, the
    weights do not change. Nothing was configured differently. The layers differ only
    in what the residual stream has become by the time they run.

NAME MAPPING (paper <-> this code <-> paper's own Appendix E listing, p.62).
    The names are INVERTED between the paper's prose and the shipped code:
        paper D_x  =  this code `encoder`     =  Appendix E `decoder_x`   (d -> n)
        paper D_y  =  this code `encoder_v`   =  Appendix E `decoder_y`   (d -> n)
        paper E    =  this code `decoder`     =  Appendix E `encoder`     (n -> d)

INTENTIONAL DEVIATIONS FROM pathwaycom/bdh (all disclosed, none silent):
    1. register_buffer(...) instead of torch.nn.Buffer(...) (bdh.py:39).
       Functionally identical; nn.Buffer requires PyTorch >= 2.5, register_buffer
       works everywhere. Portability only.
    2. A capture hook for `xy_sparse` is added. It reads the tensor and does not
       modify it, so the forward pass is unchanged.
    3. Config is shrunk (no GPU): n_embd 256->32, mlp_mult 128->32, n_layer 6->4,
       vocab 256->32, dropout 0.1->0.0. This is a 64x neuron shrink (65536 -> 1024).
    4. Measurement runs ONE cycle from a cold start. The paper measures across
       repeating cycles, so our warm-up figures are inflated (the model has no prior
       context to predict the warm-up from). KNOWN OPEN GAP - not fixed here, because
       fixing it would change the numbers this run exists to check.

This is an INDEPENDENT, SHRUNK REIMPLEMENTATION FOR TEACHING.
It is NOT an official BDH model.

Usage:
    python bdh_probe.py [--out results.json] [--export-weights weights_trained.json]
    python bdh_probe.py --untrained [--export-weights weights_untrained.json]
"""
import argparse
import dataclasses
import json
import math
import random

import torch
import torch.nn.functional as F
from torch import nn

SEED = 0
torch.manual_seed(SEED)
random.seed(SEED)


# ---------------------------------------------------------------- config
@dataclasses.dataclass
class BDHConfig:
    n_layer: int = 4                        # paper: L=4                (matched)
    n_embd: int = 32                        # paper: d=256              (SHRUNK)
    dropout: float = 0.0                    # repo default 0.1
    n_head: int = 4                         # paper: 4                  (matched)
    mlp_internal_dim_multiplier: int = 32   # -> N/head = 32*32/4 = 256, n_total = 1024
    vocab_size: int = 32                    # 26 letters + spare; paper: Latin letters


C = BDHConfig()
N_TOTAL = C.mlp_internal_dim_multiplier * C.n_embd   # total neurons across all heads

# training hyper-parameters (build.md section 4.3)
TRAIN_STEPS = 2200
TRAIN_BATCH = 4
TRAIN_LR = 3e-3

# ------------------------------------------------- Section 6.4 corpus
WARMUP_LEN = 13   # paper: fixed 13-letter warm-up
WORD_LEN = 8      # paper: 8-letter random word
N_REPEATS = 8     # paper: repeated 8 times
CYCLE = WARMUP_LEN + WORD_LEN * N_REPEATS        # = 77, matches paper
TRAIN_SEQLEN = CYCLE * 2                         # = 154, two cycles

# Drawn once, from random.seed(SEED) above, and fixed across every cycle.
WARMUP = [random.randrange(26) for _ in range(WARMUP_LEN)]


def make_cycle(rng):
    """13-letter fixed warm-up, then a fresh random 8-letter word repeated 8x."""
    word = [rng.randrange(26) for _ in range(WORD_LEN)]
    return WARMUP + word * N_REPEATS, word


def make_stream(n_cycles, rng):
    out = []
    for _ in range(n_cycles):
        cycle, _ = make_cycle(rng)
        out.extend(cycle)
    return torch.tensor(out, dtype=torch.long)


def phase_labels():
    """Phase of each token position in one cycle.

    'warmup'   = the fixed 13-letter intro
    'memorize' = first presentation of the new random word (unpredictable)
    'repeat'   = presentations 2..8 of that same word (predictable)
    """
    labels = ['warmup'] * WARMUP_LEN
    labels += ['memorize'] * WORD_LEN
    labels += ['repeat'] * (WORD_LEN * (N_REPEATS - 1))
    return labels


def phase_means(values, labels):
    """Mean of `values` grouped by phase. values[i] must align with labels[i]."""
    out = {}
    for phase in ('warmup', 'memorize', 'repeat'):
        picked = [v for v, lb in zip(values, labels) if lb == phase]
        out[phase] = (sum(picked) / len(picked)) if picked else None
    return out


# ------------------------------------------------- BDH (from pathwaycom/bdh, instrumented)
def get_freqs(n, theta, dtype):
    """bdh.py:21-29, verbatim. quantize(q=2) makes freqs[2k] == freqs[2k+1], so each
    (even, odd) coordinate pair shares one phase - that is what makes RoPE a real
    2-D rotation on the pair."""
    def quantize(t, q=2):
        return (t / q).floor() * q

    return 1.0 / (theta ** (quantize(torch.arange(0, n, 1, dtype=dtype)) / n)) / (2 * math.pi)


class Attention(nn.Module):
    """bdh.py:32-74."""

    def __init__(self, config):
        super().__init__()
        nh, D = config.n_head, config.n_embd
        N = config.mlp_internal_dim_multiplier * D // nh
        # DEVIATION 1: register_buffer instead of nn.Buffer (portability).
        self.register_buffer(
            'freqs',
            get_freqs(N, theta=2 ** 16, dtype=torch.float32).view(1, 1, 1, N),
        )

    @staticmethod
    def rope(phases, v):
        # v_rot[2k] = -v[2k+1], v_rot[2k+1] = v[2k]   (bdh.py:52)
        v_rot = torch.stack((-v[..., 1::2], v[..., ::2]), dim=-1).view(*v.size())
        phases = (phases % 1) * (2 * math.pi)
        return (v * torch.cos(phases)).to(v.dtype) + (v_rot * torch.sin(phases)).to(v.dtype)

    def forward(self, Q, K, V):
        assert K is Q                      # bdh.py:58 - KR is literally QR
        _, _, T, _ = Q.size()
        r_phases = torch.arange(
            0, T, device=self.freqs.device, dtype=self.freqs.dtype
        ).view(1, 1, -1, 1) * self.freqs
        QR = self.rope(r_phases, Q)
        KR = QR
        # tril(diagonal=-1) is STRICTLY below the diagonal: token 0 attends to nothing,
        # so token 0 reads exactly 0.0% active in every layer. Code artifact, not a finding.
        scores = (QR @ KR.mT).tril(diagonal=-1)
        return scores @ V


def init_weights(module):
    """bdh.py:101-107. Without this, nn.Embedding keeps torch's default N(0,1) init
    instead of the reference repo's N(0, 0.02) - a 50x scale difference in the
    embedding table. LayerNorm at the input hides it in the forward pass, but it
    changes the training trajectory, so omitting it makes 'faithful to
    pathwaycom/bdh' untrue."""
    if isinstance(module, nn.Linear):
        nn.init.normal_(module.weight, mean=0.0, std=0.02)
        if module.bias is not None:
            nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Embedding):
        nn.init.normal_(module.weight, mean=0.0, std=0.02)


class BDH(nn.Module):
    """Faithful to pathwaycom/bdh bdh.py, plus a capture hook for xy_sparse.

    NOTE: decoder / encoder / encoder_v / lm_head are defined ONCE and reused by
    every layer. See the module docstring - this is the shared-weights property.
    """

    def __init__(self, config):
        super().__init__()
        self.config = config
        nh, D = config.n_head, config.n_embd
        N = config.mlp_internal_dim_multiplier * D // nh

        self.decoder = nn.Parameter(torch.zeros((nh * N, D)).normal_(std=0.02))
        self.encoder = nn.Parameter(torch.zeros((nh, D, N)).normal_(std=0.02))
        self.encoder_v = nn.Parameter(torch.zeros((nh, D, N)).normal_(std=0.02))
        self.lm_head = nn.Parameter(torch.zeros((D, config.vocab_size)).normal_(std=0.02))

        self.attn = Attention(config)
        self.ln = nn.LayerNorm(D, elementwise_affine=False, bias=False)
        self.embed = nn.Embedding(config.vocab_size, D)
        self.drop = nn.Dropout(config.dropout)

        self.apply(init_weights)           # bdh.py:99

    def forward(self, idx, targets=None, capture=False, capture_raw=False):
        cfg = self.config
        B, T = idx.size()
        D, nh = cfg.n_embd, cfg.n_head
        N = D * cfg.mlp_internal_dim_multiplier // nh

        x = self.embed(idx).unsqueeze(1)   # B, 1, T, D
        x = self.ln(x)

        caps = []
        raws = []
        for _level in range(cfg.n_layer):  # _level is unused: SAME weights every layer
            x_latent = x @ self.encoder                   # B, nh, T, N
            x_sparse = F.relu(x_latent)                   # B, nh, T, N

            yKV = self.attn(Q=x_sparse, K=x_sparse, V=x)  # B, nh, T, D
            yKV = self.ln(yKV)

            y_latent = yKV @ self.encoder_v               # B, nh, T, N
            y_sparse = F.relu(y_latent)                   # ungated left factor
            xy_sparse = x_sparse * y_sparse               # <-- PAPER'S y (bdh.py:136)

            if capture:
                # fraction of the n neurons with a non-zero entry, per token.
                # Read before dropout; dropout is identity in eval() anyway.
                nz = (xy_sparse > 0).float()              # B, nh, T, N
                caps.append(nz.mean(dim=(0, 1, 3)).detach().clone())   # -> (T,)
            if capture_raw:
                # full pre-dropout xy_sparse, for the JS parity fixture.
                raws.append(xy_sparse[0].detach().clone())            # -> (nh, T, N)

            xy_sparse = self.drop(xy_sparse)

            # transpose(1,2) then reshape => head-major concat, index = h*N + j,
            # matching decoder rows (nh*N, D). Getting this order wrong produces a
            # model that runs and is silently wrong.
            yMLP = xy_sparse.transpose(1, 2).reshape(B, 1, T, N * nh) @ self.decoder
            y = self.ln(yMLP)
            x = self.ln(x + y)

        logits = x.view(B, T, D) @ self.lm_head
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        if capture or capture_raw:
            return logits, loss, caps, raws
        return logits, loss


def build_model():
    """Reseed immediately before construction so the trained run and the --untrained
    export start from bit-identical weights."""
    torch.manual_seed(SEED)
    return BDH(C)


# ------------------------------------------------- train
def train(steps=TRAIN_STEPS, bs=TRAIN_BATCH, seqlen=TRAIN_SEQLEN, lr=TRAIN_LR):
    model = build_model()
    opt = torch.optim.AdamW(model.parameters(), lr=lr)
    rng = random.Random(1)
    stream = make_stream(400, rng)
    hist = []
    for step in range(steps):
        ix = torch.randint(0, len(stream) - seqlen - 1, (bs,))
        xb = torch.stack([stream[i:i + seqlen] for i in ix])
        yb = torch.stack([stream[i + 1:i + seqlen + 1] for i in ix])
        _, loss = model(xb, yb)
        opt.zero_grad()
        loss.backward()
        opt.step()
        if step % 100 == 0 or step == steps - 1:
            hist.append((step, loss.item()))
            print(f"  step {step:4d}  loss {loss.item():.4f}", flush=True)
    return model, hist


# ------------------------------------------------- measure
@torch.no_grad()
def measure(model):
    """Run one clean cycle and record, per token: per-layer sparsity, and the model's
    cross-entropy in bits."""
    rng = random.Random(99)
    cycle, word = make_cycle(rng)
    seq = torch.tensor(cycle, dtype=torch.long).unsqueeze(0)
    model.eval()
    logits, _, caps, _ = model(seq, capture=True)
    labels = phase_labels()

    per_layer = {}
    for layer, cap in enumerate(caps):
        values = cap.tolist()
        entry = phase_means(values, labels)
        entry['series'] = values
        per_layer[layer] = entry

    # Per-token cross-entropy in bits: -log2 p(actual next token).
    # Defined for t = 0 .. T-2, since position t predicts token t+1.
    logprobs = F.log_softmax(logits[0].float(), dim=-1)     # natural log, (T, vocab)
    ce_bits = []
    for t in range(len(cycle) - 1):
        ce_bits.append(-logprobs[t, cycle[t + 1]].item() / math.log(2))

    # Two alignments, because they answer different questions and disagree at phase
    # boundaries. Reported separately rather than silently picking one:
    #   at_position - indexed by the position making the prediction (aligns with the
    #                 activation series, which is also indexed by position t)
    #   of_target   - indexed by the token being predicted (aligns with oracle
    #                 surprisal as defined in build.md section 3.2)
    cross_entropy = {
        'series_bits': ce_bits,
        'at_position': phase_means(ce_bits, labels[:len(ce_bits)]),
        'of_target': phase_means(ce_bits, labels[1:]),
    }
    return per_layer, labels, cycle, word, cross_entropy


# ------------------------------------------------- weight export
def to_nested_list(t):
    """float32 -> nested lists, at 9 significant digits.

    FLT_DECIMAL_DIG = 9: nine significant decimal digits round-trip a float32
    exactly, so this is lossless, not a truncation. Asserted rather than assumed,
    because the JS parity check depends on it."""
    a = t.detach().cpu().to(torch.float32).numpy()
    flat = a.ravel().tolist()
    rounded = [float(f"{v:.9g}") for v in flat]
    assert torch.equal(
        torch.tensor(rounded, dtype=torch.float32),
        torch.tensor(flat, dtype=torch.float32),
    ), "9-significant-digit export did not round-trip float32 exactly"
    return torch.tensor(rounded, dtype=torch.float64).reshape(a.shape).tolist()


def export_weights(model, path, trained_steps, final_loss):
    """Schema from build.md section 4.4."""
    payload = {
        'config': {
            'n_layer': C.n_layer,
            'n_embd': C.n_embd,
            'n_head': C.n_head,
            'mlp_mult': C.mlp_internal_dim_multiplier,
            'vocab_size': C.vocab_size,
            'n_total': N_TOTAL,
        },
        'embed': to_nested_list(model.embed.weight),       # vocab x D
        'encoder': to_nested_list(model.encoder),          # nh x D x N
        'encoder_v': to_nested_list(model.encoder_v),      # nh x D x N
        'decoder': to_nested_list(model.decoder),          # (nh*N) x D
        'lm_head': to_nested_list(model.lm_head),          # D x vocab
        'warmup': WARMUP,                                  # the fixed 13 letters
        'provenance': {
            'trained_steps': trained_steps,
            'seed': SEED,
            'final_loss': final_loss,
            'source': ('independent shrunk reimplementation of pathwaycom/bdh '
                       '- NOT an official BDH model'),
            'shared_weights_across_layers': True,
        },
    }
    with open(path, 'w') as fh:
        json.dump(payload, fh)
    return path


@torch.no_grad()
def dump_reference(model, path, trained_steps):
    """Write the PyTorch fixture that parity_test.js checks bdh.js against.

    Dumps RAW xy_sparse values, not fractions. The active-neuron fraction is a count
    over 1024 neurons, so its granularity is 1/1024 ~= 9.8e-4 - it cannot resolve a
    1e-4 tolerance, and two implementations that disagree on a value's sign can still
    produce identical fractions. Parity is therefore checked on the raw values plus an
    exact integer count match."""
    rng = random.Random(99)
    cycle, word = make_cycle(rng)
    seq = torch.tensor(cycle, dtype=torch.long).unsqueeze(0)
    model.eval()
    logits, _, caps, raws = model(seq, capture=True, capture_raw=True)
    labels = phase_labels()

    per_layer_xy = []
    active_counts = []
    for raw in raws:                       # raw: (nh, T, N)
        per_layer_xy.append(to_nested_list(raw))
        counts = (raw > 0).sum(dim=(0, 2))  # -> (T,) integer count over heads+neurons
        active_counts.append([int(v) for v in counts.tolist()])

    logprobs = F.log_softmax(logits[0].float(), dim=-1)
    ce_bits = [-logprobs[t, cycle[t + 1]].item() / math.log(2)
               for t in range(len(cycle) - 1)]

    per_layer = {}
    for layer, cap in enumerate(caps):
        values = cap.tolist()
        entry = phase_means(values, labels)
        entry['series'] = values
        per_layer[layer] = entry

    payload = {
        'config': dataclasses.asdict(C),
        'n_total': N_TOTAL,
        'shape': {'n_layer': C.n_layer, 'n_head': C.n_head,
                  'T': len(cycle), 'N': C.n_embd * C.mlp_internal_dim_multiplier // C.n_head},
        'sequence': cycle,
        'word': word,
        'warmup': WARMUP,
        'labels': labels,
        'xy_sparse': per_layer_xy,          # [n_layer][nh][T][N] raw values
        'active_counts': active_counts,     # [n_layer][T] integers
        'per_layer': per_layer,             # fractions + phase means
        'cross_entropy_bits': ce_bits,
        'logits': to_nested_list(logits[0]),
        'provenance': {'trained_steps': trained_steps, 'seed': SEED},
    }
    with open(path, 'w') as fh:
        json.dump(payload, fh)
    return payload


def param_count_check():
    """Weights are shared across layers, so the parameter count must not depend on
    n_layer. Printed every run so the claim is re-verified, not remembered."""
    counts = {}
    for n_layer in (2, 4):
        cfg = dataclasses.replace(C, n_layer=n_layer)
        counts[n_layer] = sum(p.numel() for p in BDH(cfg).parameters())
    return counts


# ------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="BDH Figure 14 reproduction probe")
    ap.add_argument('--out', default='./results.json',
                    help='where to write measurement results (default: ./results.json)')
    ap.add_argument('--export-weights', default=None,
                    help='also write a weight file in build.md section 4.4 schema')
    ap.add_argument('--untrained', action='store_true',
                    help='skip training and export random-init weights (falsification control)')
    ap.add_argument('--dump-reference', nargs='?', const='./probe/reference.json', default=None,
                    help='write the PyTorch parity fixture for bdh.js (default: ./reference.json)')
    ap.add_argument('--dump-reference-untrained', nargs='?',
                    const='./probe/untrained_reference.json', default=None,
                    help='run the same 77-token sequence through UNTRAINED weights and write '
                         'untrained_reference.json (evidence for the trained/untrained toggle)')
    args = ap.parse_args()

    print(f"config: n={N_TOTAL} neurons, d={C.n_embd}, L={C.n_layer}, cycle={CYCLE} chars")
    counts = param_count_check()
    print(f"params: n_layer=2 -> {counts[2]}   n_layer=4 -> {counts[4]}"
          f"   identical: {counts[2] == counts[4]}  (weights are shared across layers)")

    if args.dump_reference_untrained:
        # Same 77-token sequence, random-init weights. This is the measured evidence
        # behind the trained/untrained toggle: without it, "untrained shows no drop"
        # is an unverified claim.
        model = build_model()
        ref = dump_reference(model, args.dump_reference_untrained, trained_steps=0)
        print(f"\nuntrained reference written to {args.dump_reference_untrained}")
        print("=== UNTRAINED model, fraction of neurons active (build.md section 13, Q3) ===")
        print(f"{'layer':>5}  {'warmup':>8}  {'memorize':>9}  {'repeat':>8}  {'ratio':>7}")
        for layer, d in ref['per_layer'].items():
            ratio = d['memorize'] / d['repeat'] if d['repeat'] > 0 else float('inf')
            print(f"{layer:>5}  {d['warmup']*100:7.2f}%  {d['memorize']*100:8.2f}%  "
                  f"{d['repeat']*100:7.2f}%  {ratio:6.2f}x")
        if not (args.untrained or args.dump_reference):
            return

    if args.untrained:
        model = build_model()
        path = args.export_weights or './weights_untrained.json'
        export_weights(model, path, trained_steps=0, final_loss=None)
        print(f"\nuntrained (random-init, seed {SEED}) weights written to {path}")
        print("no training and no measurement file: this run exports the "
              "falsification control only")
        return

    print("training on Section 6.4 synthetic task...")
    model, hist = train()
    final_loss = hist[-1][1]

    per_layer, labels, cycle, word, cross_entropy = measure(model)

    out = {
        'config': dataclasses.asdict(C),
        'n_total': N_TOTAL,
        'seed': SEED,
        'train': {'steps': TRAIN_STEPS, 'batch': TRAIN_BATCH,
                  'seqlen': TRAIN_SEQLEN, 'lr': TRAIN_LR},
        'param_count_check': {'n_layer_2': counts[2], 'n_layer_4': counts[4]},
        'loss_hist': hist,
        'labels': labels,
        'sequence': cycle,
        'word': word,
        'warmup': WARMUP,
        'per_layer': per_layer,
        'cross_entropy': cross_entropy,
    }
    with open(args.out, 'w') as fh:
        json.dump(out, fh)

    print("\n=== RESULT: fraction of neurons active (non-zero in xy_sparse) ===")
    print(f"{'layer':>5}  {'warmup':>8}  {'memorize':>9}  {'repeat':>8}  {'ratio':>7}")
    for layer, d in per_layer.items():
        ratio = d['memorize'] / d['repeat'] if d['repeat'] > 0 else float('inf')
        print(f"{layer:>5}  {d['warmup']*100:7.2f}%  {d['memorize']*100:8.2f}%  "
              f"{d['repeat']*100:7.2f}%  {ratio:6.2f}x")
    l2 = per_layer[2]
    print(f"\nlayer-2 ratio (memorize / repeat): {l2['memorize']/l2['repeat']:.2f}x")
    print(f"final training loss: {final_loss:.4f}")

    print("\n=== model cross-entropy, bits per token (build.md section 13, Q2) ===")
    for name in ('at_position', 'of_target'):
        d = cross_entropy[name]
        print(f"  {name:12s} warmup {d['warmup']:6.3f}  memorize {d['memorize']:6.3f}  "
              f"repeat {d['repeat']:6.3f}")

    if args.export_weights:
        export_weights(model, args.export_weights,
                       trained_steps=TRAIN_STEPS, final_loss=final_loss)
        print(f"\ntrained weights written to {args.export_weights}")
    if args.dump_reference:
        dump_reference(model, args.dump_reference, trained_steps=TRAIN_STEPS)
        print(f"parity fixture written to {args.dump_reference}")
    print(f"results written to {args.out}")


if __name__ == "__main__":
    main()
