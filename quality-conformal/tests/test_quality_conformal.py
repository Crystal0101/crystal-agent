import unittest

import numpy as np

from quality_conformal import (
    AdaptiveQualityMondrianConformal,
    ClassConditionalConformal,
    QualityMondrianConformal,
    QualityNormalizedConformal,
    adaptive_score_matrix,
    conformal_quantile,
    prediction_set_metrics,
)


class QualityConformalTests(unittest.TestCase):
    def test_finite_sample_quantile_is_conservative(self):
        scores = np.arange(10, dtype=float) / 10
        self.assertEqual(conformal_quantile(scores, alpha=0.2), 0.8)

    def test_prediction_does_not_require_labels(self):
        probs = np.array([[0.9, 0.1], [0.2, 0.8], [0.6, 0.4], [0.3, 0.7]])
        labels = np.array([0, 1, 0, 1])
        quality = np.array([0.1, 0.2, 0.8, 0.9])
        model = QualityMondrianConformal(alpha=0.25, n_quality_bins=2, min_bin_size=2)
        model.fit(probs, labels, quality)
        sets = model.predict_sets(probs, quality)
        self.assertEqual(sets.shape, probs.shape)

    def test_small_stratum_falls_back_to_pooled_threshold(self):
        probs = np.array([[0.9, 0.1], [0.8, 0.2], [0.7, 0.3], [0.4, 0.6]])
        labels = np.array([0, 0, 0, 1])
        quality = np.array([0.1, 0.2, 0.3, 0.99])
        model = QualityMondrianConformal(
            alpha=0.25, min_bin_size=3, quality_edges=[0.9]
        ).fit(probs, labels, quality)
        self.assertIn(1, model.summary_.fallback_strata)
        self.assertEqual(
            model.summary_.stratum_thresholds[1], model.summary_.pooled_threshold
        )

    def test_metrics_account_for_singletons_and_coverage(self):
        sets = np.array([[1, 0], [0, 1], [1, 1]], dtype=bool)
        labels = np.array([0, 0, 1])
        metrics = prediction_set_metrics(sets, labels)
        self.assertAlmostEqual(metrics["coverage"], 2 / 3)
        self.assertAlmostEqual(metrics["average_set_size"], 4 / 3)
        self.assertAlmostEqual(metrics["singleton_selective_risk"], 0.5)

    def test_normalized_method_uses_disjoint_score_and_conformal_splits(self):
        rng = np.random.default_rng(4)
        probs = rng.dirichlet([2, 2], size=100)
        labels = rng.integers(0, 2, size=100)
        quality = rng.random(100)
        model = QualityNormalizedConformal(alpha=0.1, seed=9).fit(
            probs, labels, quality)
        a = set(model.split_indices_["score_fit"].tolist())
        b = set(model.split_indices_["conformal"].tolist())
        self.assertFalse(a.intersection(b))
        self.assertEqual(a.union(b), set(range(100)))
        self.assertEqual(model.predict_sets(probs, quality).shape, probs.shape)

    def test_aps_scores_follow_probability_rank(self):
        probs = np.array([[0.6, 0.3, 0.1]])
        np.testing.assert_allclose(
            adaptive_score_matrix(probs), [[0.6, 0.9, 1.0]])

    def test_raps_penalises_only_ranks_after_kreg(self):
        probs = np.array([[0.6, 0.3, 0.1]])
        np.testing.assert_allclose(
            adaptive_score_matrix(probs, penalty=0.2, regularization_rank=1),
            [[0.6, 1.1, 1.4]])

    def test_adaptive_quality_fit_predict_has_valid_shape(self):
        probs = np.array([[.7, .2, .1], [.1, .8, .1], [.2, .2, .6],
                          [.6, .3, .1], [.2, .7, .1], [.1, .3, .6]])
        labels = np.array([0, 1, 2, 0, 1, 2])
        quality = np.array([0, 0, 0, 1, 1, 1], dtype=float)
        method = AdaptiveQualityMondrianConformal(
            alpha=.2, n_quality_bins=2, min_bin_size=2).fit(
                probs, labels, quality)
        self.assertEqual(method.predict_sets(probs, quality).shape, probs.shape)

    def test_class_conditional_uses_candidate_specific_thresholds(self):
        probs = np.array([[.9, .1], [.8, .2], [.7, .3], [.2, .8], [.3, .7], [.4, .6]])
        labels = np.array([0, 0, 0, 1, 1, 1])
        method = ClassConditionalConformal(alpha=.25, min_class_size=2).fit(probs, labels)
        self.assertEqual(method.predict_sets(probs).shape, probs.shape)
        self.assertEqual(len(method.thresholds_), 2)


if __name__ == "__main__":
    unittest.main()
