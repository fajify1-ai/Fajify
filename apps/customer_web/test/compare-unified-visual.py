"""Compare captured source-module frames. Requires Pillow; never auto-approves differences."""
import json
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[3]
evidence = root / 'docs/engineering/evidence/unified-implementation'
rows = []
for after in sorted((evidence / 'after').glob('*.png')):
    before = evidence / 'before' / after.name
    if not before.exists():
        continue
    with Image.open(before) as first, Image.open(after) as second:
        row = {'screen': after.stem, 'beforeSize': first.size, 'afterSize': second.size,
               'sameDimensions': first.size == second.size}
        if first.size == second.size:
            red, green, blue = ImageChops.difference(first.convert('RGB'), second.convert('RGB')).split()
            histogram = ImageChops.lighter(ImageChops.lighter(red, green), blue).histogram()
            row['pixelsDifferentExact'] = sum(histogram[1:])
            row['pixelsDifferentAbove8'] = sum(histogram[9:])
            row['differenceRatioAbove8'] = sum(histogram[9:]) / (first.width * first.height)
        row['pixelIdentical'] = row.get('pixelsDifferentExact') == 0
        rows.append(row)
(evidence / 'visual-differences.json').write_text(json.dumps(rows, indent=2) + '\n')
print(f"Compared {len(rows)} pairs; {sum(row['pixelIdentical'] for row in rows)} pixel-identical")
for row in rows:
    if not row['pixelIdentical']:
        print(row['screen'], row.get('differenceRatioAbove8', 'dimension mismatch'))
