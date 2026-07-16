# AdaptiveKDFA v2 与 DistributedOpt 综合评估

## 论文证据

v2 使用 5 个异构 CNN 客户端、MNIST/CIFAR-10、Dirichlet $α=0.5/0.1$、3 个种子和 9 种方法。最清晰的区分出现在 MNIST $α=0.1$：KD-only 67.09±1.24，FedMD 66.23±1.97，KD+FA fixed 63.57±1.68。KD-only 每客户端每轮上传 1.6 KB，KD+FA 为 22 KB。简单指数衰减与固定权重在四个条件中都处于噪声范围内。

## 优点

- 结论与数据一致：不再将 FA 或 adaptive schedule 包装为已验证贡献。
- 明确区分同构上界与异构可比方法，承认两组评估对象不完全相同。
- 通信负载定义清楚，并指出 KD 比 FA 更廉价。
- 论文将“共享 40 个真实样本”表述为 small shared set，而非无公共数据，这一点较严谨。

## 需加强的问题

1. **统计推断不足**：“±std 区间重叠”不是统计显著性检验。应保留每个 seed 的配对结果，报告 paired permutation/Wilcoxon/t-test（根据假设）、effect size 和 CI。
2. **只有 3 seeds**：对 CIFAR-10 标准差 2–4 个百分点的设置并不充分。
3. **异构性较弱**：客户端均是 CNN family，尚不支持 CNN–Transformer 等 cross-family 结论。
4. **基准区分力有限**：4 个设置中只有 1 个能清晰区分方法，主结论范围应保持为“在当前参考集实验中”。
5. **通信评估不完整**：表格主要统计上行 payload，正式系统评估需加下行、参考批次分发、协议开销、计算时间和 bytes-to-target。
6. **共享集隐私**：真实服务器样本的来源、授权和泄漏威胁应进入 threat model。

## DistributedOpt 重叠风险

DistributedOpt 早期稿使用同一 KD+FA 框架和课程结果，但存在更强的“最高精度/55×”表述，且其数据与 v2 的 108-run 结果叙事不一致。两稿若分开投递会带来方法、数据和文本的实质性重叠风险。

建议：

- 将 DistributedOpt 标记为历史草稿，不单独投稿；
- 以 v2 的诚实结论为唯一学术主线；
- 如需新论文，必须改变研究问题和实验证据，例如专门研究通信–精度 Pareto 前沿，而不是换标题重用结果。

## 与公开代码的对齐

`adaptive-kdfa` 只实现 KD loss、FA loss、schedule 和 payload 计数。论文的 PyTorch 客户端、投影头、数据划分、9 种方法与 108-run 实验管线尚未进入公开包。因此它是“可测数学核心”，不是论文 replication package。

## 投稿判断

当前最适合 workshop、short paper 或 negative-result/empirical analysis 定位。若目标主会议，需增加 cross-family 异构、至少 5–10 seeds/配对统计、更大数据/客户端、完整通信计量和一个能够稳定区分方法的 benchmark。
