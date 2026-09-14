# Real likes

Counts live on a server, so everyone playing sees the same numbers. One like
per device per level, enforced server-side.

## Option A - Cloudflare Worker (free, public, ~2 minutes)

```
npm install -g wrangler
wrangler login
cd server
wrangler kv namespace create STATS      # paste the id it prints into wrangler.toml
wrangler deploy
```

It prints a URL like `https://dodge-the-swing-stats.<you>.workers.dev`.
Put it in `index.html`:

```js
const LIKES_API = 'https://dodge-the-swing-stats.you.workers.dev';
```

That's it. The daily panel will show real likes and plays, and the Like button
appears.

## Option B - plain Node (for testing on your own machine)

```
node server/server.js 8790
```

then `const LIKES_API = 'http://localhost:8790';`

This only works for you. For other people's likes to count, it has to be on a
public host - use Option A.

## API

| | |
|---|---|
| `GET /stats?level=<id>&device=<id>` | `{ likes, plays, liked }` |
| `POST /like` `{ level, device }` | `{ likes, plays, liked }` |
| `POST /play` `{ level }` | `{ likes, plays }` |

`level` for the daily is `daily-YYYY-MM-DD`, so each day counts separately.
`device` is a random id generated once per browser and kept in localStorage -
no accounts, no personal data.

## Note

Likes are only as honest as the people clicking them: a determined person can
clear their storage and like again. That's true of every like button without
logins, and logins are a much bigger build.

## Testing without destroying real data

The server writes to `server/stats.json`, which holds every account and
published level and exists nowhere else. **Never test against it.** Point the
server at a scratch file instead:

```
DATA_FILE=/tmp/test-stats.json node server/server.js 8796
```

On startup, and every five minutes, the live file is rolled into
`stats.json.bak1` … `.bak3`, so a bad wipe can be undone.

## Moving local data to the live server

The local server keeps everything in `server/stats.json`; the Worker keeps the
same records in KV under `acct:<uid>`, `name:<lowercase>`, `lvl:<id>`,
`meta:<id>` and `like:<level>:<uid>`.

Passwords survive the move: both sides hash with PBKDF2-SHA256, 100000
iterations, 32 bytes, hex, over the same per-account salt, so copying the
stored `salt` and `hash` across keeps the same password working. Verified by
registering through the Worker and recomputing its hash with Node.

Levels published before difficulty selection existed have no `diff`. They are
migrated as `diff: 0`, which lists them under ANY but under no particular
difficulty - republish from the editor to give them one.
