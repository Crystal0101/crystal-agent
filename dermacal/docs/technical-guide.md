# DermaCal：质量退化下的可靠性与 QACA

## 1. 目标与假设

图像分类模型在失焦、噪声、明暗偏移或压缩下不仅可能预测错误，还可能在错误时继续高置信。DermaCal 将“准确性下降”与“校准性下降”分开测量，并用输入质量调节每个样本的温度。

```mermaid
flowchart LR
  I[Clean image] --> C[6 corruption families x 3 severities]
  C --> M[Classifier logits]
  C --> Q[Normalized quality score Q(x)]
  M --> T[QACA adaptive temperature]
  Q --> T
  T --> P[Calibrated probability]
  P --> E[Accuracy + ECE + Brier + NLL + risk-coverage]
```

## 2. 当前实现

| 类别 | 实现 | 严重度 |
|---|---|---|
| 高斯模糊 | `blur` | 1–3 |
| 高斯噪声 | `noise` | 1–3，可控 seed |
| 亮度降低 | `brightness` | 1–3 |
| 对比度降低 | `contrast` | 1–3 |
| JPEG 压缩 | `jpeg` | 1–3 |
| 低分辨率 | `resolution` | 1–3 |

QACA 温度为：

$$T(x)=\max(0.05,T_{base}+\alpha(1-Q(x))),\quad Q(x)\in[0,1].$$

$$p(y=c\mid x)=\frac{\exp(z_c/T(x))}{\sum_j\exp(z_j/T(x))}.$$

`QACA.fit` 在校准集上用网格搜索最小化 Brier Score。当 $α>0$ 时，质量越低温度越高，softmax 越平滑。

ECE 按置信度分箱：

$$\mathrm{ECE}=\sum_{b=1}^{B}\frac{|S_b|}{n}|\operatorname{acc}(S_b)-\operatorname{conf}(S_b)|.$$

## 3. 严谨的基准协议

1. 先固定训练/校准/测试病例级划分，避免同一病例泄漏。
2. $T_{base},α$ 只能在 calibration split 拟合。
3. 测试时对 clean 与 18 个退化条件一次性锁定。
4. 同时报告 discrimination（Accuracy/AUROC）和 calibration（ECE/NLL/Brier）。
5. 对 QACA 与 Temperature Scaling 使用相同 calibration budget。
6. 使用 bootstrap 病例级置信区间，并报告多重比较校正。

| 对照 | 作用 |
|---|---|
| Uncalibrated | 原始模型 |
| Global temperature scaling | 不使用质量 |
| QACA, $α=0$ | 验证退化到全局温度 |
| QACA full | 质量感知方法 |
| Oracle corruption/severity | 理想上界，非部署方法 |

## 4. 有效性威胁

- 当前“质量”只是外部输入，代码未实现 BRISQUE；论文必须说明质量分数来源与归一化方式。
- 合成退化不完全等于患者拍摄的真实域偏移。
- ECE 对分箱数和样本量敏感，需配合 Brier/NLL。
- 同一数据集上的架构比较不能支持跨临床中心普适性。
- 校准不改变 argmax，因此不能修复分类准确率。

## 5. 论文图表模板

| 编号 | 内容 | 建议呈现 |
|---|---|---|
| Fig. 1 | 退化→模型→质量→QACA | 方法框架图 |
| Fig. 2 | 每类退化的 Accuracy/ECE | severity 折线或热图 |
| Fig. 3 | clean/degraded reliability diagram | 校准图 |
| Fig. 4 | risk-coverage | 不确定性选择性预测 |
| Table 1 | 数据、划分、架构 | 实验配置 |
| Table 2 | 全部模型×校准方法 | mean±CI |
| Table 3 | $α=0$/quality/random quality | 消融 |

论文主张必须与统计结果对应：“首个”、“显著优于”或“临床可用”都需额外文献检索、显著性检验和外部验证支持。
