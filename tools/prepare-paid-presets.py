"""Recover catalogued FFX assets from an explicit Git ref into private ZIPs."""
import argparse
import base64
import gzip
import json
import pathlib
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--ref', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(args.output).resolve()
if out == root or root in out.parents:
    raise SystemExit('Choose a private output directory outside the repository')
out.mkdir(parents=True, exist_ok=True)
index = gzip.decompress(base64.b64decode((root / 'presets-index.tsv.gz.b64').read_text())).decode()
groups = {}
for line in index.splitlines():
    ident, category, file, title, size, source = line.split('\t')
    groups.setdefault(category, []).append((file, title, int(size)))
report = []
for category, items in groups.items():
    target = out / (category + '.zip')
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for file, title, size in items:
            data = subprocess.check_output(['git', 'show', args.ref + ':assets/' + file], cwd=root)
            if len(data) != size:
                raise SystemExit('Unexpected file size: ' + file)
            archive.writestr(pathlib.PurePosixPath(file).name, data)
        archive.writestr('READ-ME.txt', 'After Effects: Animation > Apply Animation Preset.\nSome effects require additional plugins.\n')
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert len([name for name in archive.namelist() if name.endswith('.ffx')]) == len(items)
    report.append({'pack': category, 'presets': len(items), 'bytes': target.stat().st_size})
(out / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps({'packs':len(report),'presets':sum(row['presets'] for row in report),'output':str(out)},ensure_ascii=False))
