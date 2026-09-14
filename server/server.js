/**
 * Same API as worker.js, as a plain Node server with a JSON file for storage.
 * For local testing:  node server/server.js 8790
 * For likes other people can reach, deploy worker.js instead.
 */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = parseInt(process.argv[2] || '8790', 10);
// Tests must never run against the real database. Point DATA_FILE somewhere
// else and this server will not touch the live one.
const FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, 'stats.json');

let db = { acct: {}, names: {}, lvl: {}, meta: {}, liked: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}

/* Keep the last few versions. Accounts and levels are irreplaceable - there is
   no other copy of them anywhere - so a bad wipe should always be undoable. */
function backup() {
  if (!fs.existsSync(FILE)) return;
  try {
    for (let i = 3; i > 1; i--) {
      const older = FILE + '.bak' + (i - 1), newer = FILE + '.bak' + i;
      if (fs.existsSync(older)) fs.copyFileSync(older, newer);
    }
    fs.copyFileSync(FILE, FILE + '.bak1');
  } catch (e) {}
}
backup();
setInterval(backup, 5 * 60 * 1000);
let dirty = false;
setInterval(() => { if (dirty) { fs.writeFileSync(FILE, JSON.stringify(db)); dirty = false; } }, 800);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
};
const send = (res, obj, code = 200) => { res.writeHead(code, CORS); res.end(JSON.stringify(obj)); };
const clean = (s, n = 64) => String(s == null ? '' : s).replace(/[^a-zA-Z0-9 _.:-]/g, '').trim().slice(0, n);
const idOk = s => /^[A-Za-z0-9_-]{4,40}$/.test(String(s || ''));
const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
// PBKDF2 so a stolen database is not a list of usable logins
const pwHash = (pw, salt) =>
  crypto.pbkdf2Sync(String(pw), String(salt), 100000, 32, 'sha256').toString('hex');
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
const rnd = n => crypto.randomBytes(n).toString('hex').toUpperCase().slice(0, n * 2);
const meta = lid => db.meta[lid] || { plays: 0, likes: 0 };

function auth(body) {
  if (!idOk(body.uid) || !body.token) return null;
  const a = db.acct[body.uid];
  if (!a || !a.token) return null;
  return safeEqual(sha(body.token), a.token) ? a : null;
}
function issueToken(a) {
  const token = rnd(16);
  a.token = sha(token);
  dirty = true;
  return token;
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/\/+$/, '') || '/';

  const go = body => {
    if (p === '/register' && req.method === 'POST') {
      const name = clean(body.name, 20);
      const pw = String(body.password || '');
      if (name.length < 3) return send(res, { error: 'Name needs at least 3 characters' }, 400);
      if (pw.length < 6) return send(res, { error: 'Password needs at least 6 characters' }, 400);
      if (db.names[name.toLowerCase()]) return send(res, { error: 'That name is taken' }, 409);
      const uid = 'u' + rnd(3), salt = rnd(8);
      db.acct[uid] = { uid, name, salt, hash: pwHash(pw, salt), made: Date.now() };
      db.names[name.toLowerCase()] = uid;
      const token = issueToken(db.acct[uid]);
      dirty = true;
      return send(res, { uid, name, token });
    }
    if (p === '/login' && req.method === 'POST') {
      const name = clean(body.name, 20);
      const pw = String(body.password || '');
      const uid = db.names[name.toLowerCase()];
      const a = uid && db.acct[uid];
      if (!a) return send(res, { error: 'No account with that name' }, 401);
      if (!safeEqual(pwHash(pw, a.salt), a.hash)) return send(res, { error: 'Wrong password' }, 401);
      const token = issueToken(a);
      return send(res, { uid: a.uid, name: a.name, token });
    }
    if (p === '/publish' && req.method === 'POST') {
      const a = auth(body);
      if (!a) return send(res, { error: 'Sign in first' }, 401);
      const lv = body.level || {};
      const objs = Array.isArray(lv.obj) ? lv.obj.slice(0, 600) : [];
      if (!objs.length) return send(res, { error: 'Level has no objects' }, 400);
      const lid = clean(lv.id, 12) || rnd(3);
      const prev = db.lvl[lid];
      if (prev && prev.authorId !== a.uid) return send(res, { error: 'That level id belongs to someone else' }, 403);
      db.lvl[lid] = { id: lid, name: clean(lv.name, 24) || 'Untitled', author: a.name, authorId: a.uid,
                      secs: Math.max(5, Math.min(120, parseInt(lv.secs, 10) || 30)), obj: objs,
                      diff: Math.max(0, Math.min(10, parseInt(lv.diff, 10) || 0)),
                      bg: clean(lv.bg, 9), gr: clean(lv.gr, 9), music: clean(lv.music, 12), made: Date.now() };
      dirty = true;
      return send(res, { ok: true, id: lid, name: db.lvl[lid].name, author: a.name });
    }
    if (p === '/delete' && req.method === 'POST') {
      const lid = clean(body.level, 12);
      const lv = db.lvl[lid];
      if (!lv) return send(res, { error: 'No level with that id' }, 404);
      const isAdmin = process.env.ADMIN_KEY && body.admin &&
                      safeEqual(String(body.admin), String(process.env.ADMIN_KEY));
      if (!isAdmin) {
        const a = auth(body);
        if (!a || a.uid !== lv.authorId) return send(res, { error: 'Only the author can delete this' }, 403);
      }
      delete db.lvl[lid]; delete db.meta[lid]; dirty = true;
      return send(res, { ok: true, id: lid });
    }
    if (p === '/levels') {
      const q = clean(url.searchParams.get('q'), 24).toLowerCase();
      const wantDiff = parseInt(url.searchParams.get('diff') || '0', 10);
      const out = Object.values(db.lvl)
        .filter(lv => !wantDiff || (lv.diff || 0) === wantDiff)
        .filter(lv => !q ||
        lv.name.toLowerCase().includes(q) || lv.id.toLowerCase().includes(q) || lv.author.toLowerCase().includes(q))
        .map(lv => ({ id: lv.id, name: lv.name, author: lv.author, secs: lv.secs, diff: lv.diff || 0,
                      objects: lv.obj.length, plays: meta(lv.id).plays, likes: meta(lv.id).likes }))
        .sort((a, b) => b.likes - a.likes).slice(0, 60);
      return send(res, { levels: out });
    }
    if (p === '/level') {
      const lid = clean(url.searchParams.get('id'), 12);
      const lv = db.lvl[lid];
      if (!lv) return send(res, { error: 'No level with that id' }, 404);
      const uid = clean(url.searchParams.get('uid'), 40);
      return send(res, { level: lv, ...meta(lid), liked: !!db.liked[lid + ':' + uid] });
    }
    if (p === '/play' && req.method === 'POST') {
      const lid = clean(body.level, 24);
      if (!lid) return send(res, { error: 'level required' }, 400);
      const m = meta(lid); m.plays++; db.meta[lid] = m; dirty = true;
      return send(res, m);
    }
    if (p === '/like' && req.method === 'POST') {
      const a = auth(body);
      if (!a) return send(res, { error: 'Sign in to like levels' }, 401);
      const lid = clean(body.level, 24);
      if (!lid) return send(res, { error: 'level required' }, 400);
      const k = lid + ':' + a.uid;
      const m = meta(lid);
      if (db.liked[k]) return send(res, { ...m, liked: true });
      db.liked[k] = 1; m.likes++; db.meta[lid] = m; dirty = true;
      return send(res, { ...m, liked: true });
    }
    if (p === '/stats') {
      const lid = clean(url.searchParams.get('level'), 24);
      const uid = clean(url.searchParams.get('uid'), 40);
      if (!lid) return send(res, { error: 'level required' }, 400);
      return send(res, { ...meta(lid), liked: !!db.liked[lid + ':' + uid] });
    }
    send(res, { error: 'not found' }, 404);
  };

  if (req.method === 'POST') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 400000) req.destroy(); });
    req.on('end', () => { let b = {}; try { b = JSON.parse(raw); } catch (e) {} go(b); });
  } else go({});
}).listen(PORT, () => {
  console.log('API on http://localhost:' + PORT);
  console.log('data: ' + FILE);
});
