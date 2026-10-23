const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const metadataPath = path.join(root, 'plugin-images.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const directory = path.join(root, 'assets', 'plugins-enhanced');
const applied = [];
for (const filename of fs.readdirSync(directory).sort()) {
  if (!filename.endsWith('.png')) continue;
  const id = filename.slice(0, -4);
  if (!metadata[id]) continue;
  const bytes = fs.readFileSync(path.join(directory, filename));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`Invalid PNG: ${filename}`);
  }
  const entry = metadata[id];
  const webpFilename = `${id}.webp`;
  const deliveryFilename = fs.existsSync(path.join(directory, webpFilename)) ? webpFilename : filename;
  if (!entry.originalImage) entry.originalImage = entry.image;
  Object.assign(entry, {
    image: `/assets/plugins-enhanced/${deliveryFilename}`,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    fit: 'cover',
    enhanced: true,
  });
  applied.push(id);
}
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
console.log(`Connected ${applied.length} enhanced covers: ${applied.join(', ')}`);
