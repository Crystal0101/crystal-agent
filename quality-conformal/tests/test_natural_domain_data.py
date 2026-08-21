import csv
import tempfile
import unittest
from pathlib import Path

from natural_domain_data import (
    CANONICAL_CLASSES, Record, assert_group_disjoint, stratified_group_split,
)


class NaturalDomainProtocolTests(unittest.TestCase):
    def records(self):
        rows = []
        for class_name in CANONICAL_CLASSES:
            for group in range(20):
                rows.append(Record("HAM10000", f"{class_name}-{group}",
                                   "/tmp/not-opened.jpg", f"{class_name}-g{group}",
                                   class_name))
        return rows

    def test_four_roles_are_group_disjoint_and_cover_all_records(self):
        records = self.records()
        splits = stratified_group_split(records, seed=7)
        assert_group_disjoint(splits)
        self.assertEqual(sum(map(len, splits.values())), len(records))
        for split in splits.values():
            self.assertEqual(set(r.canonical_label for r in split), set(CANONICAL_CLASSES))

    def test_split_is_deterministic(self):
        a = stratified_group_split(self.records(), seed=11)
        b = stratified_group_split(self.records(), seed=11)
        self.assertEqual([[r.image_id for r in a[k]] for k in a],
                         [[r.image_id for r in b[k]] for k in b])

    def test_overlap_is_rejected(self):
        row = self.records()[0]
        with self.assertRaises(AssertionError):
            assert_group_disjoint({"train": [row], "test": [row]})


if __name__ == "__main__":
    unittest.main()
