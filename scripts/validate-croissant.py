"""Check the generated data card with the MLCommons mlcroissant reference library.

Usage:
  python3 -m venv .venv && . .venv/bin/activate && pip install mlcroissant
  node scripts/export-card.mjs card-out
  python scripts/validate-croissant.py card-out

This is a development check. The app does not run it.
"""
import sys
from pathlib import Path

import mlcroissant as mlc

folder = Path(sys.argv[1] if len(sys.argv) > 1 else "card-out")
card = folder / "terra-trust-data-card.jsonld"

dataset = mlc.Dataset(jsonld=str(card))  # raises on structural errors
print("Loaded:", dataset.metadata.name)
print("Errors:", list(dataset.metadata.ctx.issues.errors))
print("Warnings:", list(dataset.metadata.ctx.issues.warnings))

count = 0
first = None
for record in dataset.records(record_set="farmers"):
    first = first or record
    count += 1
print("Records read through the card:", count)
assert count == 300, "expected 300 records"
assert not dataset.metadata.ctx.issues.errors, "validation errors"
print("OK")
