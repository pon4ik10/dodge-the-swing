#!/usr/bin/env node
/* Assemble the files the Android app ships with.
 *
 * Everything the game needs goes in, nothing it does not: the published music
 * copies (not the full-quality originals), the sprites, the icons. The one
 * change to the page is a flag telling it that it is a real app now, so it
 * talks to the live server instead of looking for a laptop on localhost.
 */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'native', 'www');

const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    n += e.isDirectory() ? copyDir(a, b) : (fs.copyFileSync(a, b), 1);
  }
  return n;
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const flag = '<script>window.DTS_NATIVE = true;</script>';
// must run before the game script reads it
html = html.replace('<link rel="manifest" href="manifest.json">', flag + '\n<link rel="manifest" href="manifest.json">');
if (html.indexOf(flag) < 0) throw new Error('could not inject the native flag');
fs.writeFileSync(path.join(out, 'index.html'), html);

let files = 1;
for (const [from, to] of [
  ['music/tracks.js', 'music/tracks.js'],
  ['manifest.json', 'manifest.json'],
]) {
  fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(out, to));
  files++;
}
for (const d of ['assets-local/gd', 'music/web', 'icons']) {
  const n = copyDir(path.join(root, d), path.join(out, d));
  console.log('  ' + d.padEnd(18) + n + ' files');
  files += n;
}

const size = (function du(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((a, f) => a + du(path.join(p, f)), 0);
})(out);

console.log('  ' + files + ' files, ' + (size / 1048576).toFixed(1) + ' MB -> native/www');
