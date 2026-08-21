"""
Cheap post-hoc calibration ablation for Table 7 (§4.6):
  uncalibrated / TS / Vector Scaling / Dirichlet (matrix) scaling / QACA.

Protocol matches the paper exactly:
  - All calibrators fit on the CLEAN validation split (same as TS's T_base),
    evaluated on the saved TEST logits (clean + 18 corrupted conditions).
  - TS reuses the saved T_base from qaca_params.npy (no refit).
  - QACA reuses saved params + normalized quality cache (predict_proba,
    incl. uniform override), i.e. identical to the numbers already in Table 7.
  - Only new inference: clean VAL logits per model (cached in _val_cache),
    needed to fit VS / Dirichlet. Zero retraining.

Vector scaling:    p = softmax(w ⊙ z + b),          w,b ∈ R^C
Dirichlet scaling: p = softmax(W log_softmax(z) + b), W ∈ R^{CxC}, b ∈ R^C
  with ODIR-style L2 reg on off-diagonal W and b; lambda picked by 3-fold
  CV NLL on the clean validation set.
"""
import json
import numpy as np
from pathlib import Path
import torch
import torch.nn.functional as F

from src.qaca import QACA, BRISQUENormalizer
from src.metrics import ece_mce

MODELS = ['resnet50', 'efficientnet_b0', 'vit_b_16', 'dinov2_b']
CORR = ['gaussian_noise', 'motion_blur', 'gaussian_blur',
        'brightness_shift', 'color_shift', 'jpeg_compression']
SEVERITIES = [1, 2, 3]
CO = Path('results/corrupted')
OUT = Path('results/qaca')
VC = OUT / '_val_cache'
QC = OUT / '_quality_cache'
DATA_ROOT = 'data/HAM10000'
SEED = 42
BS = 64


def softmax_np(z):
    z = z - z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)


# ── clean VAL logits (the only new inference; cached) ─────────────────────────
def prep_clean_val_logits():
    missing = [m for m in MODELS if not (VC / f'lg_{m}_clean.npy').exists()]
    if not missing:
        return
    from src.dataset import load_splits, get_transforms, get_loader
    from src.models import build_model, get_device, load_checkpoint
    from src.evaluate import collect_logits
    device = get_device()
    _, val_ds, _, _ = load_splits(DATA_ROOT, seed=SEED)
    loader = get_loader(val_ds, BS, shuffle=False)
    for m in missing:
        model = build_model(m).to(device)
        load_checkpoint(model, f'results/baseline/{m}/best.pt', device)
        lg, lb = collect_logits(model, loader, device)
        np.save(VC / f'lg_{m}_clean.npy', lg)
        # sanity: labels must match the cached val labels from LOCO
        lb_old = np.load(VC / f'lb_{m}.npy')
        assert np.array_equal(lb, lb_old), f'val label mismatch for {m}'
        print(f'cached clean val logits {m} {lg.shape}', flush=True)
        del model


# ── calibrator fits (torch LBFGS on CPU) ──────────────────────────────────────
def fit_vector_scaling(logits, labels, iters=200):
    z = torch.from_numpy(logits).double()
    y = torch.from_numpy(labels).long()
    C = z.shape[1]
    w = torch.ones(C, dtype=torch.double, requires_grad=True)
    b = torch.zeros(C, dtype=torch.double, requires_grad=True)
    opt = torch.optim.LBFGS([w, b], lr=0.1, max_iter=iters)

    def closure():
        opt.zero_grad()
        loss = F.cross_entropy(z * w + b, y)
        loss.backward()
        return loss
    opt.step(closure)
    return w.detach().numpy(), b.detach().numpy()


def apply_vector_scaling(logits, w, b):
    return softmax_np(logits * w + b)


def _fit_dirichlet_once(z, y, lam, iters=300):
    """z: log_softmax features (torch double). Returns W, b."""
    C = z.shape[1]
    W = torch.eye(C, dtype=torch.double, requires_grad=True)
    b = torch.zeros(C, dtype=torch.double, requires_grad=True)
    opt = torch.optim.LBFGS([W, b], lr=0.1, max_iter=iters)
    off = 1.0 - torch.eye(C, dtype=torch.double)

    def closure():
        opt.zero_grad()
        loss = F.cross_entropy(z @ W.T + b, y) \
            + lam * ((W * off).pow(2).sum() + b.pow(2).sum())
        loss.backward()
        return loss
    opt.step(closure)
    return W.detach(), b.detach()


def fit_dirichlet(logits, labels, lambdas=(0.0, 1e-3, 1e-2, 1e-1, 1.0), k=3):
    z = F.log_softmax(torch.from_numpy(logits).double(), dim=1)
    y = torch.from_numpy(labels).long()
    n = len(y)
    rng = np.random.RandomState(SEED)
    fold = rng.permutation(n) % k
    best_lam, best_nll = None, np.inf
    for lam in lambdas:
        nlls = []
        for f in range(k):
            tr, te = fold != f, fold == f
            W, b = _fit_dirichlet_once(z[tr], y[tr], lam)
            nlls.append(F.cross_entropy(z[te] @ W.T + b, y[te]).item())
        m = float(np.mean(nlls))
        if m < best_nll:
            best_nll, best_lam = m, lam
    W, b = _fit_dirichlet_once(z, y, best_lam)
    return W.numpy(), b.numpy(), best_lam


def apply_dirichlet(logits, W, b):
    z = logits - logits.max(1, keepdims=True)
    logp = z - np.log(np.exp(z).sum(1, keepdims=True))
    return softmax_np(logp @ W.T + b)


# ── main ──────────────────────────────────────────────────────────────────────
def main():
    prep_clean_val_logits()
    results = {}
    for m in MODELS:
        val_logits = np.load(VC / f'lg_{m}_clean.npy')
        val_labels = np.load(VC / f'lb_{m}.npy').astype(np.int64)
        y_test = np.load(CO / m / 'clean_labels.npy').astype(np.int64)

        T_base = float(np.load(OUT / m / 'qaca_params.npy')[0])
        w_vs, b_vs = fit_vector_scaling(val_logits, val_labels)
        W_d, b_d, lam = fit_dirichlet(val_logits, val_labels)
        qaca = QACA()
        qaca.load(str(OUT / m / 'qaca_params.npy'))
        print(f'[{m}] T_base={T_base:.3f}  VS w range=[{w_vs.min():.2f},{w_vs.max():.2f}]  '
              f'Dirichlet lambda={lam}', flush=True)

        methods = {
            'uncal':     lambda L, Q: softmax_np(L),
            'ts':        lambda L, Q: softmax_np(L / T_base),
            'vs':        lambda L, Q: apply_vector_scaling(L, w_vs, b_vs),
            'dirichlet': lambda L, Q: apply_dirichlet(L, W_d, b_d),
            'qaca':      lambda L, Q: qaca.predict_proba(L, Q),
        }

        per_cond = {}
        conds = [('clean', 0)] + [(c, s) for c in CORR for s in SEVERITIES]
        for cond, sev in conds:
            if cond == 'clean':
                L = np.load(CO / m / 'clean_logits.npy')
                Q = np.load(QC / 'clean_s0.npy')
            else:
                L = np.load(CO / m / f'{cond}_s{sev}_logits.npy')
                Q = np.load(QC / f'{cond}_s{sev}.npy')
            per_cond[f'{cond}_s{sev}'] = {
                name: round(ece_mce(fn(L, Q), y_test)[0] * 100, 2)
                for name, fn in methods.items()
            }
        results[m] = {
            'per_condition': per_cond,
            'dirichlet_lambda': lam,
        }

    # aggregate: clean / L1 / L2 / L3 / global(18) per model
    names = ['uncal', 'ts', 'vs', 'dirichlet', 'qaca']
    summary = {}
    for m in MODELS:
        pc = results[m]['per_condition']
        agg = {}
        for name in names:
            row = {'clean': pc['clean_s0'][name]}
            for s in SEVERITIES:
                row[f'L{s}'] = round(float(np.mean(
                    [pc[f'{c}_s{s}'][name] for c in CORR])), 2)
            row['global18'] = round(float(np.mean(
                [pc[f'{c}_s{s}'][name] for c in CORR for s in SEVERITIES])), 2)
            agg[name] = row
        summary[m] = agg
    results['_summary'] = summary

    json.dump(results, open(OUT / 'cheap_calib_ablation.json', 'w'), indent=2)

    def print_table(title, agg):
        print(f'\n===== {title} (ECE %, lower=better) =====')
        print(f"{'method':>10} {'clean':>7} {'L1':>7} {'L2':>7} {'L3':>7} {'global18':>9}")
        for name in names:
            r = agg[name]
            print(f"{name:>10} {r['clean']:>7.2f} {r['L1']:>7.2f} "
                  f"{r['L2']:>7.2f} {r['L3']:>7.2f} {r['global18']:>9.2f}")

    print_table('ViT-B/16 (Table 7 representative)', summary['vit_b_16'])
    mean_agg = {name: {k: round(float(np.mean(
        [summary[m][name][k] for m in MODELS])), 2)
        for k in ['clean', 'L1', 'L2', 'L3', 'global18']} for name in names}
    print_table('4-model mean', mean_agg)
    results['_summary']['_4model_mean'] = mean_agg
    json.dump(results, open(OUT / 'cheap_calib_ablation.json', 'w'), indent=2)
    print('\nSaved -> results/qaca/cheap_calib_ablation.json')


if __name__ == '__main__':
    main()
