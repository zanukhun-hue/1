"""Encode restored PNG masters to WebP; no resize, crop or pixel editing."""
from pathlib import Path
from PIL import Image, features
import json

root = Path(__file__).resolve().parents[1]
folder = root / 'assets' / 'plugins-enhanced'
if not features.check('webp'):
    raise SystemExit('Bundled Pillow has no WebP codec')
records = []
for source in sorted(folder.glob('*.png')):
    target = source.with_suffix('.webp')
    image = Image.open(source)
    image.save(target, 'WEBP', quality=94, method=6)
    output = Image.open(target)
    assert output.size == image.size
    records.append({'id': source.stem, 'master': source.name, 'delivery': target.name, 'width': image.width, 'height': image.height, 'pngBytes': source.stat().st_size, 'webpBytes': target.stat().st_size})
(folder / 'delivery-audit.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(json.dumps({'count': len(records), 'pngBytes': sum(r['pngBytes'] for r in records), 'webpBytes': sum(r['webpBytes'] for r in records)}, indent=2))
