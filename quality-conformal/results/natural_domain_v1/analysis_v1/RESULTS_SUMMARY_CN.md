# QualityConformal自然域结果摘要

- 三个正式模型JSON均通过协议、五分类映射、当前checkpoint哈希、方法集合与指标完整性校验。
- 三个v2聚类审计绑定当前正式JSON、checkpoint、数据审计、冻结质量缓存与关键代码哈希；HAM10000以1,094个病灶、PAD-UFES-20以1,297个患者为重采样单位。
- 聚类bootstrap只描述固定checkpoint、固定校准规则下测试样本聚类重采样的经验不确定性；不纳入训练或校准不确定性，也不恢复普通图像级split conformal覆盖保证。
- 历史JSON中的普通图像级Clopper–Pearson区间只保留作溯源，不进入论文推断。
- HAM10000内部测试与PAD-UFES-20外部测试均为描述性压力测试；外部域不满足源域交换性，覆盖下降不解释为形式保证失效。
- 三种架构是不同模型而非独立随机重复；不对三模型均值执行伪重复显著性检验。
- 外部图像质量低端裁剪率为31.72%，高端裁剪率为1.71%，说明源域拟合的质量尺度发生明显越界。

## LAC主比较

| 模型 | 域 | Pooled coverage | Quality coverage | Pooled size | Quality size | Δsize |
|---|---|---:|---:|---:|---:|---:|
| resnet50 | test | 0.901 | 0.895 | 1.266 | 1.253 | -0.013 |
| resnet50 | external | 0.366 | 0.390 | 1.686 | 1.785 | +0.099 |
| efficientnet_b0 | test | 0.911 | 0.901 | 1.322 | 1.313 | -0.009 |
| efficientnet_b0 | external | 0.464 | 0.478 | 1.730 | 1.823 | +0.093 |
| vit_b_16 | test | 0.904 | 0.899 | 1.464 | 1.450 | -0.014 |
| vit_b_16 | external | 0.587 | 0.601 | 1.691 | 1.783 | +0.092 |

## 外部域全部方法

| 模型 | 方法 | Coverage [group-bootstrap 95% CI] | Set size | Singleton risk |
|---|---|---:|---:|---:|
| resnet50 | pooled_lac | 0.366 [0.342,0.389] | 1.686 | 0.688 |
| resnet50 | quality_lac | 0.390 [0.367,0.413] | 1.785 | 0.686 |
| resnet50 | pooled_aps | 0.770 [0.751,0.788] | 3.856 | 0.375 |
| resnet50 | quality_aps | 0.764 [0.745,0.782] | 3.799 | 0.333 |
| resnet50 | pooled_raps | 0.668 [0.647,0.689] | 3.314 | 0.385 |
| resnet50 | quality_raps | 0.666 [0.644,0.687] | 3.292 | 0.385 |
| resnet50 | class_conditional_lac | 0.521 [0.498,0.545] | 2.335 | 0.635 |
| resnet50 | confidence_mondrian_control | 0.413 [0.390,0.437] | 1.923 | 0.676 |
| efficientnet_b0 | pooled_lac | 0.464 [0.439,0.488] | 1.730 | 0.632 |
| efficientnet_b0 | quality_lac | 0.478 [0.454,0.502] | 1.823 | 0.645 |
| efficientnet_b0 | pooled_aps | 0.756 [0.736,0.776] | 3.703 | 0.357 |
| efficientnet_b0 | quality_aps | 0.754 [0.733,0.774] | 3.692 | 0.393 |
| efficientnet_b0 | pooled_raps | 0.671 [0.649,0.693] | 3.123 | 0.320 |
| efficientnet_b0 | quality_raps | 0.670 [0.646,0.692] | 3.113 | 0.321 |
| efficientnet_b0 | class_conditional_lac | 0.610 [0.587,0.632] | 2.571 | 0.641 |
| efficientnet_b0 | confidence_mondrian_control | 0.497 [0.473,0.521] | 1.952 | 0.621 |
| vit_b_16 | pooled_lac | 0.587 [0.562,0.611] | 1.691 | 0.523 |
| vit_b_16 | quality_lac | 0.601 [0.577,0.625] | 1.783 | 0.520 |
| vit_b_16 | pooled_aps | 0.869 [0.853,0.885] | 3.498 | 0.286 |
| vit_b_16 | quality_aps | 0.866 [0.849,0.882] | 3.472 | 0.320 |
| vit_b_16 | pooled_raps | 0.809 [0.790,0.827] | 2.984 | 0.333 |
| vit_b_16 | quality_raps | 0.807 [0.788,0.825] | 2.976 | 0.300 |
| vit_b_16 | class_conditional_lac | 0.670 [0.646,0.693] | 2.237 | 0.543 |
| vit_b_16 | confidence_mondrian_control | 0.643 [0.620,0.666] | 2.004 | 0.502 |

## 证据边界

- 内部域LAC接近目标覆盖，但quality-LAC相对pooled-LAC只改变−0.014至−0.009个标签，未形成实质效率改善。
- 外部域quality-LAC相对pooled-LAC把集合增大0.092–0.099个标签，覆盖只提高0.014–0.024，仍远低于0.90。
- APS/RAPS在外部域产生更大集合并提高覆盖，但三个模型仍未全部达到0.90；不能据此声称外部条件有效。
- 结果支持自然域迁移失败与质量尺度越界的诊断结论，不支持质量分层恢复跨域覆盖。
- 每组固定抽取一张图像的敏感性结果随同机器可读CSV报告；它改变目标总体，仅用于检查多图像组是否主导结论。
