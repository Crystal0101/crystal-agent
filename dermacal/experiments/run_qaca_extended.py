"""
Extended QACA analysis (reuses the exact run_qaca.py pipeline):
  1. QACA-side high-confidence-error (HCE) analysis: does QACA reduce
     conf>0.80-and-wrong rate vs uncalibrated/temperature?
  2. Coverage vs accuracy-on-covered separation (Q<0.05 -> deferred to human).
  3. alpha / T_max sensitivity sweep on global-mean ECE.

Per-sample BRISQUE quality Q(x) is MODEL-INDEPENDENT (same normalizer [2.553,26.778]
across all 4 models), so it is computed once per condition and cached.
No retraining, no fabrication: uses saved logits + saved QACA params + saved normalizer.
"""
import json
import numpy as np
from pathlib import Path
import torch

from src.dataset import load_splits, get_transforms, HAM10000Dataset, denormalize_to_uint8
from src.corrupt import CORRUPTION_NAMES, SEVERITIES
from src.evaluate import CorruptedDataset
from src.qaca import QACA, BRISQUENormalizer, compute_brisque
from src.metrics import ece_mce

DATA_ROOT = 'data/HAM10000'
MODELS = ['resnet50', 'efficientnet_b0', 'vit_b_16', 'dinov2_b']
IN = Path('results/corrupted')
OUT = Path('results/qaca')
QCACHE = OUT / '_quality_cache'
QCACHE.mkdir(parents=True, exist_ok=True)
HCE_THR = 0.80
SEED = 42


def softmax(z):
    z = z - z.max(1, keepdims=True); e = np.exp(z); return e / e.sum(1, keepdims=True)


def brisque_of_ds(ds):
    from tqdm import tqdm
    s = [compute_brisque(denormalize_to_uint8(ds[i][0])) for i in tqdm(range(len(ds)), desc='BRISQUE', leave=False)]
    return np.array(s, dtype=np.float32)


def get_quality():
    """Compute (cached) per-condition normalized quality Q(x) on the test set."""
    norm = BRISQUENormalizer().load(str(OUT / 'resnet50' / 'brisque_normalizer.npy'))
    _, _, test_ds, _ = load_splits(DATA_ROOT, seed=SEED)
    test_transform = get_transforms('test')
    test_raw = HAM10000Dataset(test_ds.df, test_ds.img_dirs, transform=None)
    conds = [('clean', 0)] + [(n, s) for n in CORRUPTION_NAMES for s in SEVERITIES]
    Q = {}
    for name, sev in conds:
        key = f'{name}_s{sev}'
        cache = QCACHE / f'{key}.npy'
        if cache.exists():
            Q[key] = np.load(cache); continue
        if name == 'clean':
            ds = HAM10000Dataset(test_ds.df, test_ds.img_dirs, transform=test_transform)
        else:
            ds = CorruptedDataset(test_raw, name, sev, test_transform)
        q = norm.transform(brisque_of_ds(ds))
        np.save(cache, q); Q[key] = q
        print(f'  quality {key}: mean={q.mean():.3f} frac<0.05={np.mean(q<0.05):.3f}', flush=True)
    return Q


def hce_rate(probs, labels):
    conf = probs.max(1); wrong = probs.argmax(1) != labels
    return 100.0 * np.mean((conf > HCE_THR) & wrong)


def main():
    print('=== Computing per-condition BRISQUE quality (model-independent) ===', flush=True)
    Q = get_quality()
    conds = [('clean', 0)] + [(n, s) for n in CORRUPTION_NAMES for s in SEVERITIES]
    corrupted_keys = [f'{n}_s{s}' for n in CORRUPTION_NAMES for s in SEVERITIES]
    report = {}

    for m in MODELS:
        T_base, alpha = np.load(OUT / m / 'qaca_params.npy')
        labels = np.load(IN / m / 'clean_labels.npy')
        qaca = QACA(); qaca.T_base = float(T_base); qaca.alpha = float(alpha)

        def logits_of(key):
            return np.load(IN / m / ('clean_logits.npy' if key == 'clean_s0' else f'{key}_logits.npy'))

        # (1) HCE per method, by severity
        hce = {'uncalibrated': {}, 'temperature': {}, 'qaca': {}}
        for name, sev in conds:
            key = f'{name}_s{sev}'; lg = logits_of(key); q = Q[key]
            hce['uncalibrated'].setdefault(sev, []).append(hce_rate(softmax(lg), labels))
            hce['temperature'].setdefault(sev, []).append(hce_rate(softmax(lg / T_base), labels))
            hce['qaca'].setdefault(sev, []).append(hce_rate(qaca.predict_proba(lg, q), labels))
        hce_avg = {meth: {sev: float(np.mean(v)) for sev, v in d.items()} for meth, d in hce.items()}

        # (2) coverage vs accuracy-on-covered (clean)
        qc = Q['clean_s0']; lgc = logits_of('clean_s0')
        covered = qc >= QACA.EXTREME_Q_THRESHOLD
        pred = softmax(lgc).argmax(1)
        naive_acc = 100.0 * np.mean(pred == labels)                 # deferred counted as argmax
        cov = 100.0 * np.mean(covered)
        acc_on_cov = 100.0 * np.mean(pred[covered] == labels[covered])

        # (3) alpha / T_max sweep: global-mean ECE over 18 corrupted conditions
        alpha_grid = [0.0, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0]
        tmax_grid = [5.0, 10.0, 15.0, 20.0]
        def global_ece(a, tmax):
            q2 = QACA(); q2.T_base = float(T_base); q2.alpha = float(a); q2.T_MAX = float(tmax)
            eces = []
            for key in corrupted_keys:
                p = q2.predict_proba(logits_of(key), Q[key])
                eces.append(ece_mce(p, labels)[0])
            return float(np.mean(eces) * 100)
        alpha_sweep = {str(a): global_ece(a, QACA.T_MAX) for a in alpha_grid}
        tmax_sweep = {str(t): global_ece(float(alpha), t) for t in tmax_grid}

        report[m] = dict(T_base=float(T_base), alpha=float(alpha),
                         hce=hce_avg, coverage_pct=cov, naive_acc=naive_acc,
                         acc_on_covered=acc_on_cov, alpha_sweep=alpha_sweep, tmax_sweep=tmax_sweep)
        print(f'\n[{m}] alpha={alpha:.3f} T_base={T_base:.3f}', flush=True)
        print(f'  HCE% clean uncal={hce_avg["uncalibrated"][0]:.2f} temp={hce_avg["temperature"][0]:.2f} qaca={hce_avg["qaca"][0]:.2f}', flush=True)
        for sev in [1, 2, 3]:
            print(f'  HCE% L{sev} uncal={hce_avg["uncalibrated"][sev]:.2f} temp={hce_avg["temperature"][sev]:.2f} qaca={hce_avg["qaca"][sev]:.2f}', flush=True)
        print(f'  coverage={cov:.1f}% naive_acc={naive_acc:.2f} acc_on_covered={acc_on_cov:.2f}', flush=True)
        print(f'  alpha_sweep(globalECE%)={ {k: round(v,2) for k,v in alpha_sweep.items()} }', flush=True)
        print(f'  tmax_sweep(globalECE%)={ {k: round(v,2) for k,v in tmax_sweep.items()} }', flush=True)

    with open(OUT / 'extended_analysis.json', 'w') as f:
        json.dump(report, f, indent=2)
    print('\nSaved -> results/qaca/extended_analysis.json', flush=True)


if __name__ == '__main__':
    main()
