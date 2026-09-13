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
