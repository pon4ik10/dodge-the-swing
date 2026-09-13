/**
 * Same API as worker.js, as a plain Node server with a JSON file for storage.
 * Useful for testing locally, or for hosting on anything that runs Node.
 *
 *   node server/server.js 8790
 *
 * For likes that other people can actually reach, this has to run on a public
 * host - a Cloudflare Worker (see worker.js) is the least hassle.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = parseInt(process.argv[2] || '8790', 10);
const FILE = path.join(__dirname, 'stats.json');

let db = { likes: {}, plays: {}, liked: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}
let dirty = false;
setInterval(() => { if (dirty) { fs.writeFileSync(FILE, JSON.stringify(db)); dirty = false; } }, 1000);

const clean = s => String(s || '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 64);
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
};
const send = (res, obj, code = 200) => { res.writeHead(code, CORS); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/stats') {
    const level = clean(url.searchParams.get('level'));
    const device = clean(url.searchParams.get('device'));
    if (!level) return send(res, { error: 'level required' }, 400);
    return send(res, {
      likes: db.likes[level] || 0,
      plays: db.plays[level] || 0,
      liked: !!db.liked[level + ':' + device],
    });
  }

  if (req.method === 'POST' && (url.pathname === '/like' || url.pathname === '/play')) {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 2000) req.destroy(); });
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw); } catch (e) {}
      const level = clean(body.level);
      if (!level) return send(res, { error: 'level required' }, 400);
      if (url.pathname === '/play') {
        db.plays[level] = (db.plays[level] || 0) + 1; dirty = true;
        return send(res, { likes: db.likes[level] || 0, plays: db.plays[level] });
      }
      const device = clean(body.device);
      if (!device) return send(res, { error: 'device required' }, 400);
      const k = level + ':' + device;
      if (!db.liked[k]) {                       // one like per device
        db.liked[k] = 1;
        db.likes[level] = (db.likes[level] || 0) + 1;
        dirty = true;
      }
      send(res, { likes: db.likes[level] || 0, plays: db.plays[level] || 0, liked: true });
    });
    return;
  }
  send(res, { error: 'not found' }, 404);
}).listen(PORT, () => console.log('stats API on http://localhost:' + PORT));
