# Dodge the Swing

Swingcopters fall from above, spikes slide in from the sides, and you have one
cube and a jump button. Ten levels, an endless mode, a daily challenge, boss
fights, 59 unlockable icons and a vault full of secret codes.

**Play:** https://pon4ik10.github.io/dodge-the-swing/

## Credits

- **Sprites and sound effects** — [RobTop Games](https://www.robtopgames.com), used with credit
- **Music** — see the in-game Credits screen for the artist behind every track
- **Code, levels and design** — [TemuDash](https://www.youtube.com/@TemuDash-h5f)

## Controls

Arrows or WASD to move, Up / W / Space to jump. Esc pauses. On a phone, use the
three pads at the bottom.

## Running it locally

Just open `index.html`. For the installable app version (fullscreen, offline),
serve it instead:

```
python3 tools/serve.py
```

## Music

The published build ships without music, because the soundtrack belongs to the
individual artists rather than to this project. To play with music locally:

```
python3 tools/extract_gd_sprites.py     # needs Geometry Dash installed
```

That fills `assets-local/` from your own copy of the game. `music/tracks.js`
maps every slot, and `python3 tools/check_music.py` tells you which are missing.

To publish with music you would need tracks you have the rights to - drop them
in `music/`, point `tracks.js` at them, and remove the music lines from
`.gitignore`.

## Real likes

The daily level can show real like counts shared by everyone playing. Deploy
`server/worker.js` (free Cloudflare Worker, ~2 minutes) and paste the URL into
`LIKES_API` at the top of `index.html`. Full instructions in `server/README.md`.

## Tools

| | |
|---|---|
| `tools/extract_gd_sprites.py` | pulls sprites and music from a local Geometry Dash install |
| `tools/check_music.py` | verifies every music slot points at a real file |
| `tools/serve.py` | serves the game on localhost so it can be installed as an app |
