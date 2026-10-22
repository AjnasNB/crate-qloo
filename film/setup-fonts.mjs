import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = process.env.CRATE_FONT_DIR ?? path.join(process.env.WINDIR ?? 'C:/Windows', 'Fonts');
const target = fileURLToPath(new URL('./assets/local-fonts/', import.meta.url));
fs.mkdirSync(target, { recursive: true });
for (const name of ['georgia.ttf', 'segoeui.ttf', 'segoeuib.ttf']) {
  const file = path.join(source, name);
  if (!fs.existsSync(file)) throw new Error(`Supply your licensed ${name} in CRATE_FONT_DIR.`);
  fs.copyFileSync(file, path.join(target, name));
}
console.log('Prepared existing licensed local fonts. Their binaries remain ignored and are not redistributed.');
