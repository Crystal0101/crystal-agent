# Research Statement — Draft

## Research Vision

I want to build AI systems that doctors can trust. Current medical AI has a problem: it works well on training data but fails on real patients. This is called distribution shift. My research focuses on two parts of this problem.

The first part is calibration. A model is well-calibrated when its confidence score matches its actual accuracy. If a model says 90% confidence, it should be right 90% of the time. Most medical AI models are overconfident. This is dangerous in clinical settings.

The second part is federated learning. Hospitals cannot share patient data. So we need to train models across hospitals without moving the data. This creates a challenge: each hospital has different patient demographics and imaging equipment. The model must generalize across these differences.

## Current Work

My main project is DermaCal. It studies calibration for skin lesion classification under distribution shift. I use the HAM10000 dataset and apply 18 types of image corruption (blur, noise, color shift, etc.) to simulate real-world variation.

I proposed a QACA (Quality-Aware Calibration Adjustment) method. It estimates image quality at test time and adjusts the model's confidence accordingly. Early results show a 15% reduction in ECE (Expected Calibration Error) compared to temperature scaling.

I also work on AdaptiveKDFA, which is about federated learning. It uses knowledge distillation to transfer model knowledge across hospitals. The adaptive version adjusts the distillation weight based on data similarity between sites.

## TODO for this statement

- Add specific numbers from experiments once they finish
- Add motivation paragraph about clinical deployment gap
- Add section on future directions (extend to pathology slides, multi-modal)
- Get feedback from advisor before submitting
