const fs = require('node:fs');
const path = require('node:path');
const { robotsTxt, sitemapXml } = require('../server-original');

const root = path.resolve(__dirname, '..');
const publish = path.join(root, 'netlify-public');
const mediaExtensions = new Set(['.avif', '.css', '.gif', '.glb', '.ico', '.jpeg', '.jpg', '.js', '.png', '.svg', '.webp', '.woff', '.woff2']);

fs.rmSync(publish, { recursive: true, force: true });
fs.mkdirSync(publish, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(publish, 'assets'), {
  recursive: true,
  filter(source) {
    return fs.statSync(source).isDirectory() || mediaExtensions.has(path.extname(source).toLowerCase());
  }
});

for (const file of ['style.css', 'client.js', 'google3dda0bd7c0af07a0.html', 'yandex_4c9bf369d0611ade.html']) {
  fs.copyFileSync(path.join(root, file), path.join(publish, file));
}
fs.copyFileSync(path.join(root, 'assets', 'brand', 'favicon.ico'), path.join(publish, 'favicon.ico'));
fs.writeFileSync(path.join(publish, 'robots.txt'), robotsTxt());
fs.writeFileSync(path.join(publish, 'sitemap.xml'), sitemapXml());
