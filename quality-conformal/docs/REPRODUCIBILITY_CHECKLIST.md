# QualityConformal 复现检查表

状态含义：`已核验`＝可由当前仓库文件直接复核；`部分`＝实现存在但记录不完整；
`缺口`＝投稿复现包仍需补齐。

| 项目 | 状态 | 当前证据或缺口 |
|---|---|---|
| 中文主协议 | 已核验 | `PROTOCOL_v0.1.md`、`NATURAL_DOMAIN_PROTOCOL_v0.1.md` |
| 方法实现 | 已核验 | `quality_conformal.py`；fit/predict 分离、LAC/APS/RAPS/控制方法 |
| 单元测试 | 已核验 | `tests/` 存在质量方法、自然域数据、外部分析和聚类审计测试 |
| MedMNIST 数据角色 | 已核验 | 训练内部 90/10；官方 val 校准；官方 test 评价 |
| MedMNIST 正式 seeds | 已核验 | Derma/Blood 各 2026–2035，共 20 个 `external_*` JSON |
| 泄漏 pilot 排除 | 已核验 | 正式 checkpoint 名含 `noleak_v2`；协议声明旧 pilot 无效 |
| 自然域标签映射/排除 | 已核验 | `natural_domain_data.py` 与 `data_audit.json` |
| 病灶/患者隔离 | 已核验 | HAM 按 lesion、PAD 按 patient；代码执行 split overlap 检查 |
| PAD 数据版本 | 已核验 | dataset `zr7vgbcyr2`、version 1、归档 SHA-256 已记录 |
| HAM 元数据哈希 | 已核验 | `06aee5...f99a5`，见 `data_audit.json` |
| PAD 元数据哈希 | 已核验 | `14d145...e9527`，见 manifest/audit |
| 三个自然域 checkpoint | 已核验 | 文件存在，SHA-256 与结果 JSON 一致 |
| smoke 隔离 | 已核验 | 文件名及结果字段 `smoke: true`；正式三模型为 `false` |
| 外部标签不参与拟合 | 已核验 | `run_natural_domain.py` 中阈值/quality edges 只用 calibration |
| 质量归一化与切点 | 已核验 | p5/p95、edges 和 PAD clipping 均保存于正式 JSON |
| 训练超参数 | 已核验 | 代码保存优化器、LR、weight decay、变换、早停规则；结果保存实际历史 |
| 随机 seed | 已核验 | MedMNIST 2026–2035；自然域 2026；Python/NumPy/Torch 均设置 |
| 结果文件代码绑定 | 缺口 | 自然域原始结果未保存代码 SHA-256 或 git commit |
| 完整依赖环境 | 缺口 | 无 requirements lock/conda lock；结果只保存 device，不含包版本 |
| 硬件与系统 | 缺口 | 只知 `mps`，未知具体 Mac/芯片、内存、OS |
| 确定性后端配置 | 缺口 | 未记录 deterministic algorithms/CuDNN/MPS 确定性设置 |
| HAM10000 原始归档 | 部分 | 元数据 SHA-256 已有；原始下载 URL、图像归档 SHA-256 未冻结 |
| PAD 许可与引用文本 | 部分 | 下载 API/数据 ID 已记录；投稿包仍需附许可快照与正式数据引用 |
| 聚类 bootstrap 正式产物 | 已核验 | 三模型正式 JSON 完成；HAM 以1,094个病灶、PAD以1,297名患者执行10,000次聚类bootstrap |
| 聚类结果严格验证 | 已核验 | 三模型逐点复现、绑定哈希和 `integration_manifest.json` 全部通过 |
| 主表仅使用聚类区间 | 已核验 | 中文主稿自动区块已事务回写病灶/患者聚类区间；历史图像级 exact CI 仅留作溯源 |
| 独立代码复现 | 缺口 | 尚无第二环境/第二人员从清洁环境复跑记录 |

建议复现顺序：先验证数据审计、现有 JSON/哈希及三模型聚类审计；随后冻结
Python 与全部依赖版本、硬件/系统信息和代码 commit，最后从清洁环境执行
测试与分析。任何重跑都不得用 PAD 标签选择模型、切点或方法。
