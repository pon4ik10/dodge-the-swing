/**
 * Dodge the Swing - accounts, published levels, plays and likes.
 * A Cloudflare Worker backed by one KV namespace.
 *
 * Deploy:
 *   npm install -g wrangler && wrangler login
 *   cd server
 *   wrangler kv namespace create STATS     # paste the id into wrangler.toml
 *   wrangler deploy
 *   put the URL it prints into LIKES_API at the top of index.html
 *
 * Accounts are a name and a password. The password is never stored: the server
 * keeps a PBKDF2 hash with a random salt per account. Signing in returns a
 * session token, so the password is never kept on the player's device either.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

const clean = (s, n = 64) => String(s == null ? '' : s).replace(/[^a-zA-Z0-9 _.:-]/g, '').trim().slice(0, n);
const idOk  = s => /^[A-Za-z0-9_-]{4,40}$/.test(String(s || ''));

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
/* Passwords are stretched with PBKDF2 so a stolen database is not a list of
   logins. 100k iterations, a fresh random salt for every account. */
async function pwHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password),
                                            'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt:new TextEncoder().encode(salt), iterations:100000, hash:'SHA-256' },
    key, 256);
  return hex(bits);
}
function safeEqual(a, b) {                     // constant time-ish compare
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const rnd = n => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, n * 2).toUpperCase();
};

/* Requests carry a session token, not the password. */
async function auth(env, body) {
  if (!idOk(body.uid) || !body.token) return null;
  const raw = await env.STATS.get('acct:' + body.uid);
  if (!raw) return null;
  const acct = JSON.parse(raw);
  const th = await sha(String(body.token));
  return safeEqual(th, acct.token || '') ? acct : null;
}
async function issueToken(env, acct) {
  const token = rnd(16);
  acct.token = await sha(token);
  await env.STATS.put('acct:' + acct.uid, JSON.stringify(acct));
  return token;
}

async function meta(env, lid) {
  const raw = await env.STATS.get('meta:' + lid);
  return raw ? JSON.parse(raw) : { plays: 0, likes: 0 };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (!env.STATS) return json({ error: 'KV namespace STATS is not bound' }, 500);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    let body = {};
    if (request.method === 'POST') { try { body = await request.json(); } catch (e) {} }

    /* ---------------- accounts ---------------- */
    if (path === '/register' && request.method === 'POST') {
      const name = clean(body.name, 20);
      const pw = String(body.password || '');
      if (name.length < 3) return json({ error: 'Name needs at least 3 characters' }, 400);
      if (pw.length < 6) return json({ error: 'Password needs at least 6 characters' }, 400);
      const key = 'name:' + name.toLowerCase();
      if (await env.STATS.get(key)) return json({ error: 'That name is taken' }, 409);
      const uid = 'u' + rnd(6);
      const salt = rnd(8);
      const acct = { uid, name, salt, hash: await pwHash(pw, salt), made: Date.now() };
      const token = await issueToken(env, acct);
      await env.STATS.put('name:' + name.toLowerCase(), uid);
      return json({ uid, name, token });
    }

    if (path === '/login' && request.method === 'POST') {
      const name = clean(body.name, 20);
      const pw = String(body.password || '');
      const uid = await env.STATS.get('name:' + name.toLowerCase());
      if (!uid) return json({ error: 'No account with that name' }, 401);
      const raw = await env.STATS.get('acct:' + uid);
      if (!raw) return json({ error: 'No account with that name' }, 401);
      const acct = JSON.parse(raw);
      const h = await pwHash(pw, acct.salt);
      if (!safeEqual(h, acct.hash)) return json({ error: 'Wrong password' }, 401);
      const token = await issueToken(env, acct);
      return json({ uid: acct.uid, name: acct.name, token });
    }

    /* ---------------- levels ---------------- */
    if (path === '/publish' && request.method === 'POST') {
      const acct = await auth(env, body);
      if (!acct) return json({ error: 'Sign in first' }, 401);
      const lv = body.level || {};
      const objs = Array.isArray(lv.obj) ? lv.obj.slice(0, 600) : [];
      if (!objs.length) return json({ error: 'Level has no objects' }, 400);
      const lid = clean(lv.id, 12) || rnd(3);
      const rec = {
        id: lid,
        name: clean(lv.name, 24) || 'Untitled',
        author: acct.name,
        authorId: acct.uid,
        secs: Math.max(5, Math.min(120, parseInt(lv.secs, 10) || 30)),
        diff: Math.max(0, Math.min(10, parseInt(lv.diff, 10) || 0)),
        obj: objs,
        bg: clean(lv.bg, 9), gr: clean(lv.gr, 9),
        music: clean(lv.music, 12),
        made: Date.now(),
      };
      const prev = await env.STATS.get('lvl:' + lid);
      if (prev) {
        const p = JSON.parse(prev);
        if (p.authorId !== acct.uid) return json({ error: 'That level id belongs to someone else' }, 403);
      }
      await env.STATS.put('lvl:' + lid, JSON.stringify(rec));
      return json({ ok: true, id: lid, name: rec.name, author: rec.author });
    }

    /* Taking a level down: the author can remove their own, and you can remove
       anything by setting an ADMIN_KEY secret on the Worker. Needed the moment
       strangers can publish to a site with your name on it. */
    if (path === '/delete' && request.method === 'POST') {
      const lid = clean(body.level, 12);
      if (!lid) return json({ error: 'level required' }, 400);
      const raw = await env.STATS.get('lvl:' + lid);
      if (!raw) return json({ error: 'No level with that id' }, 404);
      const lv = JSON.parse(raw);
      const isAdmin = env.ADMIN_KEY && body.admin && safeEqual(String(body.admin), String(env.ADMIN_KEY));
      if (!isAdmin) {
        const acct = await auth(env, body);
        if (!acct || acct.uid !== lv.authorId)
          return json({ error: 'Only the author can delete this' }, 403);
      }
      await env.STATS.delete('lvl:' + lid);
      await env.STATS.delete('meta:' + lid);
      return json({ ok: true, id: lid });
    }

    if (path === '/levels') {
      const q = clean(url.searchParams.get('q'), 24).toLowerCase();
      const wantDiff = parseInt(url.searchParams.get('diff') || '0', 10);
      const list = await env.STATS.list({ prefix: 'lvl:', limit: 200 });
      const out = [];
      for (const k of list.keys) {
        const raw = await env.STATS.get(k.name);
        if (!raw) continue;
        const lv = JSON.parse(raw);
        if (wantDiff && (lv.diff || 0) !== wantDiff) continue;
        if (q && lv.name.toLowerCase().indexOf(q) < 0 &&
                 lv.id.toLowerCase().indexOf(q) < 0 &&
                 lv.author.toLowerCase().indexOf(q) < 0) continue;
        const m = await meta(env, lv.id);
        out.push({ id: lv.id, name: lv.name, author: lv.author, diff: lv.diff || 0,
                   secs: lv.secs, objects: lv.obj.length, plays: m.plays, likes: m.likes });
        if (out.length >= 60) break;
      }
      out.sort((a, b) => b.likes - a.likes);
      return json({ levels: out });
    }

    if (path === '/level') {
      const lid = clean(url.searchParams.get('id'), 12);
      const raw = await env.STATS.get('lvl:' + lid);
      if (!raw) return json({ error: 'No level with that id' }, 404);
      const lv = JSON.parse(raw);
      const m = await meta(env, lid);
      const uid = clean(url.searchParams.get('uid'), 40);
      const liked = uid ? !!(await env.STATS.get(`like:${lid}:${uid}`)) : false;
      return json({ level: lv, plays: m.plays, likes: m.likes, liked });
    }

    /* ---------------- plays and likes ---------------- */
    if (path === '/play' && request.method === 'POST') {
      const lid = clean(body.level, 24);
      if (!lid) return json({ error: 'level required' }, 400);
      const m = await meta(env, lid);
      m.plays++;
      await env.STATS.put('meta:' + lid, JSON.stringify(m));
      return json(m);
    }

    if (path === '/like' && request.method === 'POST') {
      const acct = await auth(env, body);
      if (!acct) return json({ error: 'Sign in to like levels' }, 401);
      const lid = clean(body.level, 24);
      if (!lid) return json({ error: 'level required' }, 400);
      const key = `like:${lid}:${acct.uid}`;
      const m = await meta(env, lid);
      if (await env.STATS.get(key)) return json({ ...m, liked: true });
      await env.STATS.put(key, '1');
      m.likes++;
      await env.STATS.put('meta:' + lid, JSON.stringify(m));
      return json({ ...m, liked: true });
    }

    /* ---------------- endless leaderboard ----------------
       One row per player, their best run only, so nobody can bury the board
       under twenty of their own attempts. */
    if (path === '/score' && request.method === 'POST') {
      const acct = await auth(env, body);
      if (!acct) return json({ error: 'Sign in to get on the leaderboard' }, 401);
      const score = Math.max(0, Math.min(9999999, parseInt(body.score, 10) || 0));
      const secs  = Math.max(0, Math.min(86400, parseInt(body.secs, 10) || 0));
      const coins = Math.max(0, Math.min(99999, parseInt(body.coins, 10) || 0));
      if (!score) return json({ error: 'score required' }, 400);
      const key = 'score:' + acct.uid;
      const prev = await env.STATS.get(key);
      const had = prev ? JSON.parse(prev) : null;
      if (had && had.score >= score) return json({ ok: true, best: had.score, improved: false });
      const rec = { uid: acct.uid, name: acct.name, score, secs, coins, when: Date.now() };
      await env.STATS.put(key, JSON.stringify(rec));
      return json({ ok: true, best: score, improved: true });
    }

    if (path === '/board') {
      const list = await env.STATS.list({ prefix: 'score:', limit: 300 });
      const out = [];
      for (const k of list.keys) {
        const raw = await env.STATS.get(k.name);
        if (raw) out.push(JSON.parse(raw));
      }
      out.sort((a, b) => b.score - a.score || a.when - b.when);
      return json({ board: out.slice(0, 25).map(r => ({
        name: r.name, score: r.score, secs: r.secs, coins: r.coins, uid: r.uid })) });
    }

    /* the daily keeps its own counters, keyed daily-YYYY-MM-DD */
    if (path === '/stats') {
      const lid = clean(url.searchParams.get('level'), 24);
      const uid = clean(url.searchParams.get('uid'), 40);
      if (!lid) return json({ error: 'level required' }, 400);
      const m = await meta(env, lid);
      const liked = uid ? !!(await env.STATS.get(`like:${lid}:${uid}`)) : false;
      return json({ ...m, liked });
    }

    return json({ error: 'not found' }, 404);
  },
};
