# Plugin artwork refresh

21 existing plugin covers were restored with the built-in `image_gen.imagegen` editor. Original files in `assets/plugins/` were not changed. Each original was visually inspected before editing. The edit target was supplied with `referenced_image_paths`; no API key, CLI fallback, generative batch substitution, hand-painted replacement, crop, or CSS zoom was used.

The result preserves the product's existing visual identity and main name while reconstructing the small raster source at higher resolution. Generated restoration can differ in small texture, typography and secondary-symbol details from the original; these are restored catalog images, not newly sourced official artwork.

## Deliverables

Every ID below has a PNG master and a WebP delivery image under `assets/plugins-enhanced/<id>`. Dimensions are **1672 × 941**, except `heat-distortion` and `signal` at **1672 × 940**. Both variants are approximately 16:9.

| ID | Original | Work completed |
| --- | --- | --- |
| aftercodecs | 265 × 265 | Removed black padding; extended magenta backdrop; restored wordmark and tagline. |
| autosway | 265 × 265 | Restored illustration and logo; rebuilt the intentional white background across the full frame. |
| ballpoint | 265 × 265 | Extended pen-drawing texture through white padding; restored title and hand. |
| bevelizer | 265 × 265 | Extended chrome backdrop through white padding; restored pink 3D wordmark. |
| clearplus | 265 × 265 | Extended blue sky/clouds through black padding; restored white typography. |
| deep-glow-v2 | 265 × 265 | Removed white padding; restored outlined rainbow-neon title and dark luminous background. |
| element-3d | 320 × 133 | Reconstructed three headphones with metallic details; extended red studio backdrop. |
| flow | 265 × 265 | Removed white padding; extended pale blue background; restored script logo and subtitle. |
| fxaa | 265 × 265 | Removed white padding; extended stepped charcoal background; restored red type. |
| heat-distortion | 529 × 75 | Expanded the existing very narrow banner into a full landscape cover, preserving the product box and exact title. |
| influx | 265 × 265 | Removed black padding/footer; extended mint background and restored turquoise lettering. |
| jpeg-glitch | 265 × 265 | Extended colorful glitch texture through black padding; preserved the intentional pixel distortion. |
| mask-prompter | 265 × 265 | Extended purple bird silhouettes and cream backdrop through black padding; restored both title bars. |
| newton | 265 × 265 | Removed black padding; extended orange backdrop; restored white NEWTON⁴ title and shadow. |
| omino | 480 × 360 | Removed black padding; restored the existing energy-ring tutorial artwork and main text. |
| optical-flares | 232 × 176 | Restored the existing blue music-video still; extended its stage, removed the external gray framing/caption. |
| rsmb | 600 × 600 | Removed white edge padding; expanded composition; restored sharp foreground typography while keeping the deliberate motion-blurred background. |
| saber | 480 × 360 | Extended sci-fi background through black padding; restored beams, machinery and title. |
| shadow-studio-3 | 265 × 265 | Extended colored cinematic background through white padding; restored the extruded title. |
| signal | 265 × 265 | Extended blue terrain through black padding; restored white title while preserving intentional CRT scanlines. |
| tracery | 265 × 265 | Extended the existing creature scene and lime title strip; restored the 3D subject and tracking lines. |

For website delivery, WebP files use quality **94**, method **6**, with **no resizing, cropping or image manipulation during encoding**. The bundled Pillow WebP codec was available. The 21 masters total **40,433,693 bytes**; the delivery WebPs total **5,102,690 bytes**, an approximately **87% reduction**. PNG masters remain available for later revisions.

## Inspection and unchanged assets

All 21 restored covers were visually reviewed in the final contact sheet. RSMB, Deep Glow v2 and Flow were additionally inspected as individual full-resolution images. Main product names are legible, full artwork fills the canvas without letterbox padding, and no product name has been cut off. Intentional darkness, white illustrated backgrounds, CRT noise and motion blur remain where part of the source design.

The original audit covered all **35 WebP files** and also identified the **2 SVG assets**. The following originals were retained because they are already suitable for catalog use or their layout is intentional:

- `twixtor`, `deep-glow-v1`, `glitchify`, `polytrace`: 960 × 540 artwork without padding defects.
- `bokeh`: 940 × 530, existing photographic/3D title cover; its depth blur is part of the artwork.
- `vc-color-vibrance`: 600 × 335, existing detailed cover suitable at catalog size.
- `fxconsole`: 960 × 320, intentional wide product render rather than a letterboxed thumbnail.
- `twitch`: 450 × 364, existing interface/product screenshot. Kept to preserve the legacy software UI and tiny original labels rather than inventing UI text during restoration.
- `topaz-video-enhance`: 600 × 600, intentionally square app icon.
- `bcc-continuum`, `bcc-sapphire`, `mocha-pro`: intentional horizontal logo assets; extra canvas would alter how these are treated as brand marks.
- `red-giant`, `pixdither`: intentional wordmarks against black backgrounds, not missing background artwork. Red Giant is shared by multiple catalog IDs.
- `film-convert-nitrate.svg` and `ezco-crt-emulator.svg`: scalable vector sources; generative raster restoration was unnecessary.

The source Optical Flares image was already a blue music-video still. Its existing subject was restored; the image has not been represented as a newly verified official product cover. Omino similarly retains its original tutorial-thumbnail identity.

## Reproduction files

- `assets/plugins-enhanced/prompts.json`: exact final edit prompt, original input, master and delivery paths for each of the 21 assets.
- `assets/plugins-enhanced/source-contact-sheet.jpg`: analysis-only contact sheet of all original raster covers.
- `assets/plugins-enhanced/enhanced-contact-sheet.jpg`: final visual QA sheet of all 21 PNG masters.
- `assets/plugins-enhanced/source-audit.json`: original dimensions, byte size and a simple near-black edge-row heuristic. A black background alone is not classified as a defect.
- `assets/plugins-enhanced/enhanced-audit.json`: PNG dimensions and sizes.
- `assets/plugins-enhanced/delivery-audit.json`: matching PNG/WebP sizes and dimensions.
- `tools/artwork-audit.py`: inspection/contact-sheet generation only; does not alter the website artwork.
- `tools/artwork-delivery.py`: WebP format encoding only, preserving pixel dimensions.

To rerun the local inspection or delivery encoding, use the bundled Python runtime with the corresponding script. Image generation itself is documented by the saved prompt set and was performed with the built-in tool.
