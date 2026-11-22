import { readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';

const dist = new URL('./dist/', import.meta.url);
const read = path => readFileSync(new URL(path, dist), 'utf8');
const types = {
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
};
const embedded = new Map();

function dataUrl(path) {
  if (!embedded.has(path)) {
    const bytes = readFileSync(new URL(path, dist));
    const type = types[extname(path)];
    if (!type) throw new Error('Unsupported offline asset: ' + path);
    embedded.set(path, `data:${type};base64,${bytes.toString('base64')}`);
  }
  return embedded.get(path);
}

function embedAssets(source) {
  return source.replace(/(["'])\.\/(assets\/[^"']+\.(?:svg|webp|jpe?g|png|woff2))\1/g, (_, quote, path) => {
    return quote + dataUrl(path) + quote;
  });
}

const licenseFiles = ['Leaflet-LICENSE', 'Cormorant-Garamond-OFL', 'Inter-OFL'];
const licenseComment = licenseFiles.map(name => read(`vendor/${name}`)).join('\n\n');
const html = read('index.html')
  .replace('<html lang="ru">', '<html lang="ru" data-offline>')
  .replace(/<link rel="stylesheet" href="\.\/(.*?)">/g, (_, path) => {
    const css = embedAssets(read(path)).replace(/url\(images\/[^)]+\)/g, 'none');
    return `<style>\n${css}\n</style>`;
  })
  .replace(/<script defer src="\.\/(.*?)"><\/script>/g, (_, path) => {
    const script = embedAssets(read(path))
      .replace(/^\/\/# sourceMappingURL=.*$/gm, '')
      .replace(/<\/script/gi, '<\\/script');
    return `<script>\n${script}\n</script>`;
  })
  .replace('</body>', `<!-- Third-party licenses\n${licenseComment.replaceAll('-->', '-- >')} -->\n</body>`);

writeFileSync(new URL('seychelles-route.html', dist), embedAssets(html));
