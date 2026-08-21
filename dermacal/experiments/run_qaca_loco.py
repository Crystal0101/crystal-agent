"""
TODO 2: Leave-One-Corruption-Out (LOCO) generalization test for QACA.

Strict protocol (matches original QACA: fit on VAL, evaluate on TEST):
  For each held-out corruption c (of 6):
    - Fit alpha on VAL mixed set from the OTHER 5 corruptions (T_base fixed, from saved params).
    - Evaluate on TEST set of the held-out corruption c (3 severities): ECE and HCE.
    - Compare QACA(LOCO-alpha) vs QACA(full-alpha, fit on all 6) vs temperature vs uncalibrated.

Needs VAL logits (model inference) + VAL quality (BRISQUE) per corruption x severity.
Test logits already saved; test quality cached in results/qaca/_quality_cache/.
No fabrication: reuses saved T_base and the exact QACA alpha-NLL objective.
"""
import json
import numpy as np
from pathlib import Path
from scipy.optimize import minimize_scalar
import torch

from src.dataset import load_splits, get_transforms, HAM10000Dataset, denormalize_to_uint8, get_loader
from src.models import build_model, get_device, load_checkpoint
from src.corrupt import CORRUPTION_NAMES, SEVERITIES
from src.evaluate import collect_logits, CorruptedDataset
from src.qaca import QACA, BRISQUENormalizer, compute_brisque
from src.metrics import ece_mce

DATA_ROOT = 'data/HAM10000'
MODELS = ['resnet50', 'efficientnet_b0', 'vit_b_16', 'dinov2_b']
CO = Path('results/corrupted')
OUT = Path('results/qaca')
VC = OUT / '_val_cache'; VC.mkdir(parents=True, exist_ok=True)
QC = OUT / '_quality_cache'
SEED = 42; BS = 64
T_MIN, T_MAX = 1.0, 15.0


def softmax(z):
    z = z - z.max(1, keepdims=True); e = np.exp(z); return e / e.sum(1, keepdims=True)


def hce_rate(probs, labels):
    conf = probs.max(1); wrong = probs.argmax(1) != labels
    return 100.0 * np.mean((conf > 0.80) & wrong)


def fit_alpha(T_base, logits_mixed, labels_mixed, q_mixed):
    labels_mixed = np.asarray(labels_mixed).astype(np.int64)
    def nll(alpha):
        T = np.clip(T_base + alpha * (1.0 - q_mixed), T_MIN, T_MAX)
        s = logits_mixed / T[:, None]; s = s - s.max(1, keepdims=True)
        lse = np.log(np.exp(s).sum(1, keepdims=True))
        return -(s - lse)[np.arange(len(labels_mixed)), labels_mixed].mean()
    return float(minimize_scalar(nll, bounds=(0.0, 20.0), method='bounded').x)


def qaca_probs(logits, q, T_base, alpha):
    T = np.clip(T_base + alpha * (1.0 - q), T_MIN, T_MAX)
    p = softmax(logits / T[:, None])
    p[q < QACA.EXTREME_Q_THRESHOLD] = 1.0 / logits.shape[1]
    return p


def prep_val():
    """Compute + cache VAL quality (model-independent) and VAL logits (per model)."""
    device = get_device()
    _, val_ds, _, _ = load_splits(DATA_ROOT, seed=SEED)
    val_tf = get_transforms('val')
    val_raw = HAM10000Dataset(val_ds.df, val_ds.img_dirs, transform=None)
    norm = BRISQUENormalizer().load(str(OUT / 'resnet50' / 'brisque_normalizer.npy'))
    conds = [(n, s) for n in CORRUPTION_NAMES for s in SEVERITIES]

    # quality (model-independent), cache
    for name, sev in conds:
        qf = VC / f'q_{name}_s{sev}.npy'
        if qf.exists():
            continue
        ds = CorruptedDataset(val_raw, name, sev, val_tf)
        from tqdm import tqdm
        raw = np.array([compute_brisque(denormalize_to_uint8(ds[i][0])) for i in tqdm(range(len(ds)), desc=f'valQ {name}{sev}', leave=False)], dtype=np.float32)
        np.save(qf, norm.transform(raw))
        print(f'  cached val quality {name}_s{sev}', flush=True)

    # logits per model, cache
    for m in MODELS:
        need = [f'{m}_{n}_s{s}' for n in CORRUPTION_NAMES for s in SEVERITIES]
        if all((VC / f'lg_{k}.npy').exists() for k in need) and (VC / f'lb_{m}.npy').exists():
            continue
        model = build_model(m).to(device)
        load_checkpoint(model, f'results/baseline/{m}/best.pt', device)
        for name, sev in conds:
            lf = VC / f'lg_{m}_{name}_s{sev}.npy'
            if lf.exists():
                continue
            ds = CorruptedDataset(val_raw, name, sev, val_tf)
            loader = torch.utils.data.DataLoader(ds, batch_size=BS, shuffle=False, num_workers=0)
            lg, lb = collect_logits(model, loader, device)
            np.save(lf, lg); np.save(VC / f'lb_{m}.npy', lb)
            print(f'  cached val logits {m} {name}_s{sev}', flush=True)


def main():
    print('=== Preparing VAL logits + quality ===', flush=True)
    prep_val()
    print('=== LOCO evaluation ===', flush=True)
    report = {}
    for m in MODELS:
        T_base, full_alpha = np.load(OUT / m / 'qaca_params.npy')
        T_base = float(T_base); full_alpha = float(full_alpha)
        y_val = np.load(VC / f'lb_{m}.npy').astype(np.int64)
        y_test = np.load(CO / m / 'clean_labels.npy').astype(np.int64)
        folds = {}
        for c_hold in CORRUPTION_NAMES:
            # fit alpha on val from the other 5 corruptions
            train_c = [c for c in CORRUPTION_NAMES if c != c_hold]
            lg = np.concatenate([np.load(VC / f'lg_{m}_{c}_s{s}.npy') for c in train_c for s in SEVERITIES])
            q = np.concatenate([np.load(VC / f'q_{c}_s{s}.npy') for c in train_c for s in SEVERITIES])
            lab = np.concatenate([y_val for _ in train_c for _ in SEVERITIES])
            a_loco = fit_alpha(T_base, lg, q, lab)
            # evaluate on TEST of held-out corruption (3 severities)
            res = {'alpha_loco': a_loco, 'alpha_full': full_alpha}
            for tag, fn in [('uncal', lambda L, Q: softmax(L)),
                            ('temp', lambda L, Q: softmax(L / T_base)),
                            ('qaca_full', lambda L, Q: qaca_probs(L, Q, T_base, full_alpha)),
                            ('qaca_loco', lambda L, Q: qaca_probs(L, Q, T_base, a_loco))]:
                eces, hces = [], []
                for s in SEVERITIES:
                    L = np.load(CO / m / f'{c_hold}_s{s}_logits.npy')
                    Q = np.load(QC / f'{c_hold}_s{s}.npy')
                    p = fn(L, Q)
                    eces.append(ece_mce(p, y_test)[0] * 100); hces.append(hce_rate(p, y_test))
                res[f'{tag}_ece'] = float(np.mean(eces)); res[f'{tag}_hce'] = float(np.mean(hces))
            folds[c_hold] = res
            print(f'[{m}] hold={c_hold:16} a_loco={a_loco:.3f} a_full={full_alpha:.3f} '
                  f'ECE uncal={res["uncal_ece"]:.2f} temp={res["temp_ece"]:.2f} '
                  f'qaca_full={res["qaca_full_ece"]:.2f} qaca_loco={res["qaca_loco_ece"]:.2f} | '
                  f'HCE uncal={res["uncal_hce"]:.2f} qaca_loco={res["qaca_loco_hce"]:.2f}', flush=True)
        report[m] = folds

    json.dump(report, open(OUT / 'loco_results.json', 'w'), indent=2)
    # aggregate across models+corruptions
    def avg(k): return float(np.mean([report[m][c][k] for m in MODELS for c in CORRUPTION_NAMES]))
    print('\n=== 4模型×6退化 均值(留出退化上的表现) ===', flush=True)
    print(f'ECE%: uncal={avg("uncal_ece"):.2f} temp={avg("temp_ece"):.2f} '
          f'qaca_full={avg("qaca_full_ece"):.2f} qaca_loco={avg("qaca_loco_ece"):.2f}', flush=True)
    print(f'HCE%: uncal={avg("uncal_hce"):.2f} temp={avg("temp_hce"):.2f} '
          f'qaca_full={avg("qaca_full_hce"):.2f} qaca_loco={avg("qaca_loco_hce"):.2f}', flush=True)
    print('Saved -> results/qaca/loco_results.json', flush=True)


if __name__ == '__main__':
    main()
