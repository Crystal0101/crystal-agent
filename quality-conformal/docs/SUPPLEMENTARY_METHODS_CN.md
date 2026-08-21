# QualityConformal 补充方法（可复现中文版）

本文件仅整理仓库中可由协议、代码和冻结结果核验的方法事实，不替代论文主稿，
也不把压力测试解释为分布无关保证。

## 1. 任务与数据角色

研究目标是在目标边际覆盖率 0.90（`alpha=0.1`）下，比较 pooled split
conformal 与质量分层（Mondrian）split conformal 的覆盖、平均预测集大小、
singleton 比例及 singleton selective risk。校准标签只进入 `fit`；生成预测集的
`predict_sets` 接口不接收测试标签。

独立 MedMNIST 实验使用官方训练集内部按类分层划出 90% 模型拟合和 10% 模型
选择，官方 validation 仅作 conformal 校准，官方 test 仅作最终评价。DermaMNIST
的四个角色样本数为 6306/701/1003/2005，BloodMNIST 为
10764/1195/1712/3421。每张校准及测试图像确定性分配为 clean 或六种腐蚀之一、
severity 1–3；质量变量为 `1-severity/3`，属于知道腐蚀强度的 oracle 信号。

自然域实验把 HAM10000 作为源域，把 PAD-UFES-20 智能手机临床图像作为外部
域。两数据集先映射为五类：光化性角化、基底细胞癌、黑色素瘤、痣和脂溢性
角化；HAM10000 的 `df/vasc` 与 PAD-UFES-20 的 `SCC` 在划分前排除。
HAM10000 按病灶、按类分层，以 seed 2026 确定性划为训练/模型选择/校准/测试
四个互斥角色；PAD-UFES-20 不进入这些角色，只按患者分组作外部测试。

冻结数据审计记录：HAM10000 原始 10015 张、保留 9758 张；其训练、选择、
校准和测试分别为 5831、980、1467 和 1480 张，病灶数分别为 4379、731、
1095 和 1094。PAD-UFES-20 原始 2298 张、保留 2106 张，来自 1297 位患者。

## 2. 模型训练与图像处理

MedMNIST 使用三层卷积 SmallCNN（32/64/128 通道，BatchNorm、ReLU、池化），
AdamW，学习率 `1e-3`、weight decay `1e-4`，batch size 128。冻结正式结果为
DermaMNIST 与 BloodMNIST 各十个配对 seed（2026–2035），均记录 `epochs=8`。
模型选择依据训练集内部选择子集的交叉熵，不使用官方 validation 标签。

自然域使用 ImageNet 预训练的 ResNet-50、EfficientNet-B0 和 ViT-B/16，并替换
为五类输出。训练变换为 `RandomResizedCrop(224, scale=(0.8,1.0))`、水平翻转、
亮度/对比度/饱和度各 0.2 的 ColorJitter；评价变换为 resize 至 255 后中心裁剪
224；随后用 ImageNet mean `(0.485,0.456,0.406)` 和 std
`(0.229,0.224,0.225)` 标准化。损失为按训练样本类频率反比加权的交叉熵；
AdamW 学习率与 weight decay 均为 `1e-4`，batch size 32，最多 30 epochs，
selection loss 连续 7 epochs 不改善时早停。冻结历史实际训练长度为 ResNet-50
13、EfficientNet-B0 18、ViT-B/16 22 epochs。

随机性由 Python、NumPy 和 PyTorch 同时设置 seed；现有自然域正式结果均为
seed 2026、设备字段为 `mps`。仓库未冻结确定性算法开关、完整依赖 lockfile、
操作系统和硬件型号，因此不能据此承诺跨硬件逐位复现。

## 3. 质量变量与 conformal 方法

LAC 非一致性分数为 `1-p_y`。有限样本阈值取排序统计量
`ceil((n+1)(1-alpha))`（上取整并截断到 n）。质量 Mondrian 的切点只由校准
质量的三分位数产生；若某层少于 30 个校准样本，则回退到 pooled 阈值。

APS 使用按概率从高到低的累积概率作为候选标签分数；RAPS 在 APS 上对排名
超过 3 的标签加 `0.01` 乘以超出排名。实现采用稳定类别顺序解决 ties，不使用
随机化 APS。控制方法包括按真类校准的 class-conditional LAC，以及按最大预测
概率三分层的 confidence-Mondrian。

自然图像质量由 DermaCal 的 `compute_brisque` 计算。BRISQUE 在 resize/center
crop 后的 RGB uint8 图像上计算；归一化的 p5/p95 与质量三分位切点均只在
HAM10000 calibration 上拟合，再冻结应用到源域测试与 PAD-UFES-20。三个模型
结果保存相同的 p5=4.592370510101318、p95=31.880359649658203，切点为
0.35571231444676715 和 0.5940435727437336；PAD 外推后的低端/高端裁剪比例为
0.31718898385565053/0.017094017094017096。

## 4. 评价、配对和不确定性

MedMNIST 的训练/腐蚀 seed 是配对重复单位。同一官方测试图像跨 seed 重复出现，
因此不得合并为独立 Bernoulli 样本；汇总使用十个 seed 上的配对差和 95% t
区间。历史泄漏 pilot（无 `noleak_v2` checkpoint）不进入正式结果。

自然域三个架构是固定的模型条件，不是随机重复。历史 JSON 的图像级
Clopper–Pearson 区间仅保留作来源记录；协议要求以 HAM10000 病灶、
PAD-UFES-20 患者为整簇，执行 10000 次单阶段非参数 cluster bootstrap。
bootstrap 估计量为“簇内图像指标和/簇内图像数”的图像加权比率，随机 seed
由版本、模型、域、方法、质量层和指标的 SHA-256 确定。聚类区间只描述固定
checkpoint 和固定校准规则下的测试样本不确定性，不包含训练或校准不确定性，
也不恢复外部域 exchangeability。

## 5. 证据边界与当前缺口

- 匹配条件下的 split conformal 可支持相应 exchangeability 条件内的边际覆盖；
  合成 shift 和 PAD 外部域均是压力测试。
- 任一质量层欠覆盖时，不称为质量条件有效性。
- oracle severity 结果不能外推为无参考质量估计器的实际临床性能。
- `results/natural_domain_v1/cluster_audit_v1/` 已形成三个模型的正式
  `*_clustered_coverage.json`、严格分析产物和事务集成 manifest。三个审计均
  精确复现历史点估计，并以 HAM10000 病灶和 PAD-UFES-20 患者为重采样单位；
  历史图像级区间仅保留作溯源，不用于患者/病灶级推断。
- 仓库没有冻结完整环境 lockfile、GPU/Apple Silicon 型号、PyTorch 确定性配置、
  HAM10000 原始下载 URL/压缩包 SHA-256，也未在结果中记录每个训练文件的代码
  commit；这些均列入复现清单缺口。
