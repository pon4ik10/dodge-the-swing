/* Offline shell for Dodge the Swing.
 *
 * Three rules, because one rule was wrong in both directions:
 *   - the API (likes, levels, accounts) is never cached, or an installed phone
 *     would keep showing the level list it saw the very first time
 *   - the page and its data files go to the network first, so a pushed update
 *     actually reaches phones that already installed the game
 *   - sprites, sounds and music are cache-first, since they never change and
 *     that is what makes the game work with no signal
 */
const CACHE = 'dts-v2';
const CORE = ['./', 'index.html', 'manifest.json', 'assets-local/gd/frames.js'];
const FRESH = /\.(html|json|js)$/;          // small, and changes when I push

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // the likes server: always live

  const keep = res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  };

  if (req.mode === 'navigate' || FRESH.test(url.pathname)) {
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(keep)));
});
