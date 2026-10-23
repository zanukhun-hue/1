"""Convert the supplied mascot artwork into browser icons without redrawing it."""
import argparse
from pathlib import Path

from PIL import Image, ImageOps


parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("--output", type=Path, default=Path("assets/brand"))
options = parser.parse_args()
image = Image.open(options.source).convert("RGB")
# Remove the large empty border, keeping all bright lines and decorations.
mask = image.convert("L").point(lambda value: 255 if value > 110 else 0)
bounds = mask.getbbox()
if not bounds:
    raise SystemExit("The source has no visible mascot artwork")
image = image.crop(bounds)
side = max(image.size)
square = Image.new("RGB", (side, side), "black")
square.paste(image, ((side - image.width) // 2, (side - image.height) // 2))
square = ImageOps.expand(square, border=round(side * .045), fill="black")
options.output.mkdir(parents=True, exist_ok=True)
for size in (16, 32, 48, 180, 512):
    square.resize((size, size), Image.Resampling.LANCZOS).save(
        options.output / f"mascot-{size}.png", optimize=True
    )
square.resize((256, 256), Image.Resampling.LANCZOS).save(
    options.output / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
)
print(f"Created mascot PNG and ICO icons in {options.output}")
