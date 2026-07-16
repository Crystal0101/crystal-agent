# DermaCal 论文综合评估与代码对齐

## 证据摘要

主稿在 HAM10000 的患者级 7:1:2 划分上评估 4 种架构和 6×3 个合成退化条件。清洁集上 ResNet-50 准确率 83.84%，DINOv2-B 68.43%。亮度退化 L3 的平均准确率降幅达 47.95 个百分点。QACA 在 18 条件的平均 ECE 为 5.56%，优于未校准和 TS，但略差于 Dirichlet scaling (5.19%)；其更突出的结果是 HCE 降低和质量阈值拒绝。

## 优点

- 问题明确：将准确性、校准性和选择性预测同时放入医疗 AI 退化基准。
- 已主动收缩结论：承认 QACA 对整体 ECE 改善有限，主要价值来自 HCE/拒绝机制。
- 包含多类指标、多种校准基线、留一退化与阈值敏感性。
- 论文局限章节能够正确识别单数据集、合成退化、单种子和 BRISQUE 适用性。

## 需大修的问题

1. **单训练种子**：无法区分架构/校准差异与训练方差；需至少 3–5 个种子和病例级 bootstrap CI。
2. **QACA 概念混合**：自适应温度与低质量拒绝是两个不同机制。HCE 大幅改善可能主要由 deferral 驱动，必须分别报告 QACA-temperature only、quality rejection only 和联合方法。
3. **比较公平性**：TS/VS/Dirichlet/QACA 的拟合数据、超参数预算和是否使用退化标签必须完全对齐。
4. **留一结果需谨慎**：LODO QACA ECE 10.26% 接近未校准 10.73%，但 HCE 0.64% 优于 full-fit 0.99%。这需要样本数/覆盖率和置信区间，否则不能解读为泛化更强。
5. **外部有效性**：仅 HAM10000 与合成退化，不支持“真实远程皮肤科可用”。
6. **架构解读**：DINOv2 结果较低可能与微调策略、超参数和数据量相关，不应概化为基础模型鲁棒性较差。

## 论文与公开代码映射

| 论文方法 | 公开 `dermacal` | 状态 |
|---|---|---|
| Gaussian noise | `noise` | 核心意图一致，参数化不同 |
| Motion blur | 无 | 未公开实现 |
| Gaussian blur | `blur` | 已有简化实现 |
| Brightness gamma shift | `brightness` | 实现为线性增强，不是论文 gamma |
| Color cast | 无 | 未公开实现 |
| JPEG | `jpeg` | 已实现，quality 映射不同 |
| 无 | `contrast`, `resolution` | 公开工具的额外退化 |
| BRISQUE 归一化 | 接收 `[0,1]` quality | 质量计算未实现 |
| QACA + rejection | QACA temperature only | 拒绝策略未公开实现 |

因此当前公开包是方法核心，不是论文完整 replication package。

## 投稿判断

适合大修后投医学 AI/biomedical informatics workshop 或期刊。投稿前的最小门槛：多种子、显式分解 temperature/rejection、统计区间、外部数据或真实退化子集、以及完整的代码/配置对齐。
