/**
 * Real likes for Dodge the Swing - a Cloudflare Worker.
 *
 * Deploy (free, ~2 minutes):
 *   1. npm install -g wrangler && wrangler login
 *   2. wrangler kv namespace create STATS
 *      -> copy the id it prints into wrangler.toml
 *   3. wrangler deploy
 *   4. put the URL it gives you into LIKES_API at the top of index.html
 *
 * Endpoints
 *   GET  /stats?level=daily-2026-09-13            -> { likes, plays, liked }
 *   POST /like   { level, device }                -> { likes, plays, liked }
 *   POST /play   { level }                        -> { likes, plays }
 *
 * One like per device per level, enforced server side.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

const clean = s => String(s || '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 64);

async function counts(env, level) {
  const [likes, plays] = await Promise.all([
    env.STATS.get('likes:' + level),
    env.STATS.get('plays:' + level),
  ]);
  return { likes: parseInt(likes || '0', 10), plays: parseInt(plays || '0', 10) };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (!env.STATS) return json({ error: 'KV namespace STATS is not bound' }, 500);

    if (url.pathname === '/stats') {
      const level = clean(url.searchParams.get('level'));
      const device = clean(url.searchParams.get('device'));
      if (!level) return json({ error: 'level required' }, 400);
      const c = await counts(env, level);
      const liked = device ? !!(await env.STATS.get(`liked:${level}:${device}`)) : false;
      return json({ ...c, liked });
    }

    if (request.method === 'POST' && (url.pathname === '/like' || url.pathname === '/play')) {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const level = clean(body.level);
      if (!level) return json({ error: 'level required' }, 400);

      if (url.pathname === '/play') {
        const c = await counts(env, level);
        await env.STATS.put('plays:' + level, String(c.plays + 1));
        return json({ ...c, plays: c.plays + 1 });
      }

      const device = clean(body.device);
      if (!device) return json({ error: 'device required' }, 400);
      const key = `liked:${level}:${device}`;
      const already = await env.STATS.get(key);
      const c = await counts(env, level);
      if (already) return json({ ...c, liked: true });       // one per device, no double counting
      await Promise.all([
        env.STATS.put(key, '1'),
        env.STATS.put('likes:' + level, String(c.likes + 1)),
      ]);
      return json({ ...c, likes: c.likes + 1, liked: true });
    }

    return json({ error: 'not found' }, 404);
  },
};
