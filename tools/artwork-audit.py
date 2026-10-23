"""Inspect source artwork and produce an analysis-only contact sheet."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

root = Path(__file__).resolve().parents[1]
target = root / 'assets' / 'plugins-enhanced'
target.mkdir(parents=True, exist_ok=True)
paths = sorted((root / 'assets' / 'plugins').glob('*.webp'))
canvas = Image.new('RGB', (1000, ((len(paths)+3)//4)*175), '#202124')
draw = ImageDraw.Draw(canvas)
records = []
for i, path in enumerate(paths):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    pix = im.load()
    rows = []
    for yy in range(h):
        samples = [max(pix[xx, yy]) for xx in range(w)]
        rows.append(sum(v < 18 for v in samples)/w)
    top = 0
    bottom = 0
    for n in rows:
        if n < .98: break
        top += 1
    for n in reversed(rows):
        if n < .98: break
        bottom += 1
    records.append({'id': path.stem, 'width': w, 'height': h, 'bytes': path.stat().st_size, 'near_black_top_rows': top, 'near_black_bottom_rows': bottom})
    preview = im.copy()
    preview.thumbnail((234, 132))
    x, y = (i%4)*250, (i//4)*175
    canvas.paste(preview, (x+(234-preview.width)//2+8, y+(132-preview.height)//2+6))
    draw.text((x+8, y+141), f'{path.stem} {w}x{h}', fill='white')
canvas.save(target / 'source-contact-sheet.jpg', quality=90)
(target / 'source-audit.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(json.dumps(records, indent=2))

enhanced = sorted(target.glob('*.png'))
if enhanced:
    sheet = Image.new('RGB', (1800, ((len(enhanced)+3)//4)*280), '#202124')
    ink = ImageDraw.Draw(sheet)
    output_records = []
    for i, path in enumerate(enhanced):
        im = Image.open(path)
        output_records.append({'id': path.stem, 'width': im.width, 'height': im.height, 'bytes': path.stat().st_size})
        im.thumbnail((434, 244))
        x, y = (i%4)*450, (i//4)*280
        sheet.paste(im.convert('RGB'), (x+8, y+6))
        ink.text((x+8, y+255), path.stem, fill='white')
    sheet.save(target / 'enhanced-contact-sheet.jpg', quality=94)
    (target / 'enhanced-audit.json').write_text(json.dumps(output_records, indent=2), encoding='utf-8')
