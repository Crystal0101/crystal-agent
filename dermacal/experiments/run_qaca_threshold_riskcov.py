"""
Cheap ablations reusing saved per-sample logits + BRISQUE quality + labels:
  (A) tau_rej sensitivity: quality-based rejection coverage vs accuracy/HCE on covered
  (B) confidence-based risk-coverage (AURC-style) for uncalibrated / TS / QACA
No re-inference. Reuses src.qaca and src.metrics exactly.
"""
import os, json, glob
import numpy as np
from src.qaca import QACA, BRISQUENormalizer, fit_temperature, apply_temperature
from src.metrics import ece_mce

MODELS = ["resnet50", "efficientnet_b0", "vit_b_16", "dinov2_b"]
CORR = ["gaussian_noise", "motion_blur", "gaussian_blur", "brightness_shift", "color_shift", "jpeg_compression"]
ROOT = "results"
QC = "results/qaca/_quality_cache"

def load_condition(model, cond, sev):
    """Return (logits (N,C), quality_raw (N,)) or None if missing."""
    if cond == "clean":
        lf = f"{ROOT}/corrupted/{model}/clean_logits.npy"; qf = f"{QC}/clean_s0.npy"
    else:
        lf = f"{ROOT}/corrupted/{model}/{cond}_s{sev}_logits.npy"; qf = f"{QC}/{cond}_s{sev}.npy"
    if not (os.path.exists(lf) and os.path.exists(qf)): return None
    return np.load(lf), np.load(qf)

def hce_rate(probs, labels, thr=0.80):
    conf = probs.max(1); pred = probs.argmax(1)
    return float(((conf > thr) & (pred != labels)).mean())

out = {"tau_sweep_clean": {}, "risk_coverage": {}, "tau_sweep_allcond": {}}
taus = [0.0, 0.02, 0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50]
cov_points = [1.00, 0.95, 0.90, 0.80, 0.70]

for model in MODELS:
    labels = np.load(f"{ROOT}/corrupted/{model}/clean_labels.npy")
    norm = BRISQUENormalizer().load(f"{ROOT}/qaca/{model}/brisque_normalizer.npy")
    q = QACA(); q.load(f"{ROOT}/qaca/{model}/qaca_params.npy"); q.normalizer = norm

    # ---- clean condition ----
    lc = load_condition(model, "clean", 0)
    if lc is None: continue
    logits_c, raw_c = lc
    Q_c = raw_c                                       # quality cache is ALREADY normalized Q (1=best)

    # (A) tau_rej sweep on clean: cover = Q>=tau, report on COVERED samples
    probs_qaca_c = q.predict_proba(logits_c, Q_c)     # QACA calibrated (uniform if Q<0.05)
    sweep = []
    for t in taus:
        keep = Q_c >= t
        cov = float(keep.mean())
        if keep.sum() == 0: sweep.append({"tau": t, "coverage": 0.0}); continue
        acc_cov = float((logits_c.argmax(1)[keep] == labels[keep]).mean())
        hce_cov = hce_rate(probs_qaca_c[keep], labels[keep])
        sweep.append({"tau": t, "coverage": round(cov, 4),
                      "acc_covered": round(acc_cov*100, 2),
                      "hce_covered": round(hce_cov*100, 2)})
    out["tau_sweep_clean"][model] = sweep

    # (B) confidence-based risk-coverage: uncalibrated vs TS vs QACA, on clean
    T_ts = fit_temperature(logits_c, labels)          # TS temperature on clean
    # QACA temperature-only (per-sample T(Q), NO uniform-override) — fair ranking comparison
    T_qaca_vec = q.temperature(Q_c)
    sc = logits_c / T_qaca_vec[:, None]; sc -= sc.max(1, keepdims=True); e = np.exp(sc)
    probs_qaca_temp = e / e.sum(1, keepdims=True)
    variants = {
        "uncal":     apply_temperature(logits_c, 1.0),
        "ts":        apply_temperature(logits_c, T_ts),
        "qaca_temp": probs_qaca_temp,
    }
    rc = {}
    for name, probs in variants.items():
        conf = probs.max(1); pred = probs.argmax(1)
        correct = (pred == labels).astype(float)
        order = np.argsort(-conf); cs = correct[order]; n = len(labels)
        risks = {}
        for cp in cov_points:
            k = max(1, int(round(cp*n)))
            risks[f"risk@{int(cp*100)}"] = round((1.0 - cs[:k].mean())*100, 2)
        # AURC (mean risk over all coverage)
        risks["aurc"] = round(float(np.mean([1.0 - cs[:k].mean() for k in range(1, n+1)]))*100, 3)
        rc[name] = risks
    out["risk_coverage"][model] = rc

    # (A2) tau_rej sweep aggregated over ALL 19 conditions (pooled)
    all_logits, all_Q, all_lab = [], [], []
    for cond in ["clean"] + CORR:
        for sev in ([0] if cond == "clean" else [1,2,3]):
            r = load_condition(model, cond, sev)
            if r is None: continue
            lg, rw = r
            all_logits.append(lg); all_Q.append(rw); all_lab.append(labels)
    AL = np.concatenate(all_logits); AQ = np.concatenate(all_Q); ALab = np.concatenate(all_lab)
    probs_qaca_all = q.predict_proba(AL, AQ)
    sweep2 = []
    for t in taus:
        keep = AQ >= t
        if keep.sum() == 0: continue
        sweep2.append({"tau": t, "coverage": round(float(keep.mean()),4),
                       "acc_covered": round(float((AL.argmax(1)[keep]==ALab[keep]).mean())*100,2),
                       "hce_covered": round(hce_rate(probs_qaca_all[keep], ALab[keep])*100,2)})
    out["tau_sweep_allcond"][model] = sweep2

os.makedirs("results/qaca", exist_ok=True)
json.dump(out, open("results/qaca/threshold_riskcov.json","w"), indent=2)

# ---- pretty print ----
print("\n===== (A) tau_rej 敏感性 — CLEAN 测试集 (ResNet-50) =====")
print(f"{'tau_rej':>8} {'覆盖率%':>8} {'覆盖样本acc%':>12} {'覆盖样本HCE%':>12}")
for r in out["tau_sweep_clean"]["resnet50"]:
    print(f"{r['tau']:>8} {r.get('coverage',0)*100:>8.1f} {r.get('acc_covered','-'):>12} {r.get('hce_covered','-'):>12}")

print("\n===== (A2) tau_rej 敏感性 — 全19条件汇总 (ResNet-50) =====")
print(f"{'tau_rej':>8} {'覆盖率%':>8} {'覆盖样本acc%':>12} {'覆盖样本HCE%':>12}")
for r in out["tau_sweep_allcond"]["resnet50"]:
    print(f"{r['tau']:>8} {r['coverage']*100:>8.1f} {r['acc_covered']:>12} {r['hce_covered']:>12}")

print("\n===== (B) 置信度风险-覆盖 (clean, 各模型均值) =====")
import statistics as st
names = ["uncal","ts","qaca_temp"]
agg = {n:{k:[] for k in out["risk_coverage"]["resnet50"]["uncal"]} for n in names}
for m in out["risk_coverage"]:
    for n in names:
        for k,v in out["risk_coverage"][m][n].items(): agg[n][k].append(v)
hdr = list(agg["uncal"].keys())
print(f"{'方法':>7} " + " ".join(f"{h:>9}" for h in hdr))
for n in names:
    print(f"{n:>7} " + " ".join(f"{st.mean(agg[n][h]):>9.2f}" for h in hdr))
print("\n(risk@X = 覆盖率X%时的错误率%; aurc越低越好. 已保存 results/qaca/threshold_riskcov.json)")
