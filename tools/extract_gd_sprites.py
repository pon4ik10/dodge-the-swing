#!/usr/bin/env python3
"""
Pull the real Geometry Dash sprites out of a local Geometry Dash install
and write them into assets-local/gd/ for the game to load.

The output folder is gitignored on purpose: these are RobTop's assets. They stay
on this machine. Anyone else who wants the real skins runs this against their
own copy of the game.

    python3 tools/extract_gd_sprites.py [path/to/Geometry Dash.app/Contents/Resources]
"""
import json, os, plistlib, re, shutil, sys
from PIL import Image

DEFAULT_RES = os.path.expanduser(
    "~/Library/Application Support/Steam/steamapps/common/"
    "Geometry Dash/Geometry Dash.app/Contents/Resources")

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets-local", "gd")

# sheet suffix -> how many pixels per GD unit
SHEET_SCALE = {"": 1, "-hd": 2, "-uhd": 4}

# out_name: (sheet base, sheet suffix, frame name)
SPRITES = {
    # cube icon 1, the layers GD tints with colour 1 and colour 2
    "cube":        ("GJ_GameSheetIcons", "-hd", "player_01_001.png"),
    "cube_2":      ("GJ_GameSheetIcons", "-hd", "player_01_2_001.png"),
    "cube_glow":   ("GJ_GameSheetGlow",  "-hd", "player_01_glow_001.png"),
    # swingcopter icon 1
    "swing":       ("GJ_GameSheetIcons", "-hd", "swing_01_001.png"),
    "swing_2":     ("GJ_GameSheetIcons", "-hd", "swing_01_2_001.png"),
    "swing_x":     ("GJ_GameSheetIcons", "-hd", "swing_01_extra_001.png"),
    "swing_glow":  ("GJ_GameSheetGlow",  "-hd", "swing_01_glow_001.png"),
    # spike (the 1-block one) + its glow
    "spike":       ("GJ_GameSheet",      "-uhd", "spike_01_001.png"),
    "spike_glow":  ("GJ_GameSheetGlow",  "-uhd", "spike_01_glow_001.png"),
    # ground line
    "floorline":   ("GJ_GameSheet",      "-uhd", "floorLine_001.png"),
}
# secret coin: 4-frame spin animation, three layers each
for i in range(1, 5):
    SPRITES[f"coin_{i}"]   = ("GJ_GameSheet02", "-uhd", f"secretCoin_01_00{i}.png")
    SPRITES[f"coin_2_{i}"] = ("GJ_GameSheet02", "-uhd", f"secretCoin_2_01_00{i}.png")
    SPRITES[f"coin_b_{i}"] = ("GJ_GameSheet02", "-uhd", f"secretCoin_b_01_00{i}.png")

# --- UI: the real level-complete banner, buttons and coin markers ---
UI = {
    "levelComplete": "GJ_levelComplete_001.png",
    "coinUI":        "secretCoinUI_001.png",
    "checkOn":       "GJ_completesIcon_001.png",
    "replayBtn":     "GJ_replayBtn_001.png",
    "menuBtn":       "GJ_menuBtn_001.png",
    "nextBtn":       "GJ_playBtn2_001.png",
    "arrow":         "GJ_arrow_03_001.png",
    "lock":          "GJ_lock_001.png",
    "chest":         "GJ_freeChestBtn_001.png",
    "chestOpen":     "GJ_adChestBtn_001.png",
    "chestIcon":     "chestIcon_001.png",
    "likesIcon":     "GJ_likesIcon_001.png",
    "likeBtn":       "GJ_likeBtn_001.png",
    "playsIcon":     "GJ_downloadsIcon_001.png",
}
for _i in range(0, 11):                       # difficulty faces, easy -> extreme demon
    UI[f"diff{_i:02d}"] = f"difficulty_{_i:02d}_btn_001.png"
for _n, _f in UI.items():
    SPRITES[_n] = ("GJ_GameSheet03", "-hd", _f)
SPRITES["playBtn"] = ("GJ_GameSheet04", "-hd", "GJ_playBtn_001.png")   # big menu play button
for _n, _f in {"practiceBtn":"GJ_practiceBtn_001.png",
               "practiceTxt":"GJ_practiceTxt_001.png",
               "practiceComplete":"GJ_practiceComplete_001.png"}.items():
    SPRITES[_n] = ("GJ_GameSheet03", "-hd", _f)

# GD's real speed portals are the "boost" chevrons: 0.5x, 1x, 2x, 3x, 4x
for _i in range(1, 6):
    SPRITES[f"boost{_i}"] = ("GJ_GameSheet02", "-hd", f"boost_{_i:02d}_001.png")
for _n, _f in {"saw1":"sawblade_01_001.png", "saw2":"sawblade_02_001.png",
               "saw3":"sawblade_03_001.png"}.items():
    SPRITES[_n] = ("GJ_GameSheet", "-uhd", _f)
for _n, _f in {"ring1":"ring_01_001.png", "ring2":"ring_02_001.png",
               "ring3":"ring_03_001.png", "ring4":"dashRing_01_001.png"}.items():
    SPRITES[_n] = ("GJ_GameSheet", "-uhd", _f)
for _n, _f in {"checkpoint":"checkpoint_01_001.png",
               "checkpointGlow":"checkpoint_01_glow_001.png"}.items():
    SPRITES[_n] = ("GJ_GameSheet02", "-hd", _f)

# --- the cube library for the icon picker ---
# a curated set: 12 free, 15 bought with coins, 10 level prizes, 9 secrets
CUBE_IDS = [1, 2, 3, 4, 5, 7, 16, 22, 28, 34, 46, 52,
            64, 70, 76, 82, 88, 100, 106, 118, 124, 130, 136, 148, 160, 166, 172,
            10, 40, 58, 94, 112, 142, 154, 178, 184, 244,
            190, 196, 202, 208, 214, 220, 226, 232, 238,
            20, 36, 50, 66, 86, 104, 126, 158, 180, 246,   # all-three-coins prizes
            98, 144, 234]                                  # channel, creator code, boss
OPTIONAL = set()
for _c in CUBE_IDS:
    SPRITES[f"cube{_c}"]   = ("GJ_GameSheetIcons", "-hd", f"player_{_c:02d}_001.png")
    SPRITES[f"cube{_c}_2"] = ("GJ_GameSheetIcons", "-hd", f"player_{_c:02d}_2_001.png")
    SPRITES[f"cube{_c}_x"] = ("GJ_GameSheetIcons", "-hd", f"player_{_c:02d}_extra_001.png")
    OPTIONAL |= {f"cube{_c}", f"cube{_c}_2", f"cube{_c}_x"}

# plain files that sit in Resources already, no sheet needed
STANDALONE = {
    "bg":     ("game_bg_01_001-uhd.png", 4),
    "ground": ("groundSquare_01_001-uhd.png", 4),
    "panel":  ("GJ_square01-hd.png", 2),
    "gradBG": ("GJ_gradientBG-hd.png", 2),
}

# --- music, straight from the installed game ---
MUSIC = {
    "menuLoop":            "menuLoop.mp3",
    "BackOnTrack":         "BackOnTrack.mp3",
    "Polargeist":          "Polargeist.mp3",
    "CantLetGo":           "CantLetGo.mp3",
    "Jumper":              "Jumper.mp3",
    "TimeMachine":         "TimeMachine.mp3",
    "Clutterfunk":         "Clutterfunk.mp3",
    "Electrodynamix":      "Electrodynamix.mp3",
    "Clubstep":            "Clubstep.mp3",
    "TheoryOfEverything2": "TheoryOfEverything2.mp3",
    "Deadlocked":          "Deadlocked.mp3",
    "HexagonForce":        "HexagonForce.mp3",
    "Fingerdash":          "Fingerdash.mp3",
    "BlastProcessing":     "BlastProcessing.mp3",
    "GeometricalDominator":"GeometricalDominator.mp3",
    "StereoMadness":       "StereoMadness.mp3",
}

PAIR = re.compile(r"-?\{\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\}")

def nums(s):
    return [float(x) for x in re.findall(r"[-0-9.]+", s)]

def frame_rect(meta):
    """Return (x, y, w, h, rotated) for either plist format."""
    if "textureRect" in meta:
        x, y, w, h = nums(meta["textureRect"])
        return x, y, w, h, bool(meta.get("textureRotated"))
    x, y, w, h = nums(meta["frame"])
    return x, y, w, h, bool(meta.get("rotated"))

def frame_offset(meta):
    return nums(meta.get("spriteOffset") or meta.get("offset") or "{0,0}")

def frame_source(meta, w, h):
    s = meta.get("spriteSourceSize") or meta.get("sourceSize")
    return nums(s) if s else [w, h]

def cut(sheet, meta):
    """Crop one frame and paste it into a canvas of its untrimmed source size,
    so every layer of an icon lines up on a shared centre like it does in GD."""
    x, y, w, h, rotated = frame_rect(meta)
    if rotated:                                   # packed turned 90 degrees
        box = (x, y, x + h, y + w)
        img = sheet.crop(tuple(int(v) for v in box)).transpose(Image.ROTATE_90)
    else:
        img = sheet.crop((int(x), int(y), int(x + w), int(y + h)))
    sw, sh = frame_source(meta, img.width, img.height)
    ox, oy = frame_offset(meta)
    canvas = Image.new("RGBA", (int(round(sw)), int(round(sh))), (0, 0, 0, 0))
    # cocos2d: +y is up, so the y offset is subtracted
    px = int(round((sw - img.width) / 2 + ox))
    py = int(round((sh - img.height) / 2 - oy))
    canvas.paste(img, (px, py))
    return canvas

def main():
    res = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_RES
    if not os.path.isdir(res):
        sys.exit(f"Geometry Dash resources not found:\n  {res}\n"
                 "Pass the path to 'Geometry Dash.app/Contents/Resources' as an argument.")
    os.makedirs(OUT, exist_ok=True)

    sheets, plists = {}, {}
    manifest, missing = {}, []

    for out_name, (base, suf, frame) in SPRITES.items():
        key = base + suf
        if key not in plists:
            pl = os.path.join(res, key + ".plist")
            pn = os.path.join(res, key + ".png")
            if not (os.path.exists(pl) and os.path.exists(pn)):
                plists[key], sheets[key] = None, None
            else:
                plists[key] = plistlib.load(open(pl, "rb"))["frames"]
                sheets[key] = Image.open(pn).convert("RGBA")
        if not plists.get(key) or frame not in plists[key]:
            if out_name not in OPTIONAL:
                missing.append(f"{out_name} ({frame} in {key})")
            continue
        img = cut(sheets[key], plists[key][frame])
        img.save(os.path.join(OUT, out_name + ".png"))
        scale = SHEET_SCALE[suf]
        manifest[out_name] = {"file": out_name + ".png",
                              "w": round(img.width / scale, 3),
                              "h": round(img.height / scale, 3)}

    for out_name, (fname, scale) in STANDALONE.items():
        src = os.path.join(res, fname)
        if not os.path.exists(src):
            missing.append(f"{out_name} ({fname})")
            continue
        img = Image.open(src).convert("RGBA")
        img.save(os.path.join(OUT, out_name + ".png"))
        manifest[out_name] = {"file": out_name + ".png",
                              "w": round(img.width / scale, 3),
                              "h": round(img.height / scale, 3)}

    # music: copied so the page can load it with a plain relative path
    mus_dir = os.path.join(os.path.dirname(OUT), "music")
    os.makedirs(mus_dir, exist_ok=True)
    music = {}
    for key, fname in MUSIC.items():
        src = os.path.join(res, fname)
        if not os.path.exists(src):
            missing.append(f"music {key} ({fname})")
            continue
        dst = os.path.join(mus_dir, fname)
        if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(src):
            shutil.copyfile(src, dst)
        music[key] = {"file": fname, "title": os.path.splitext(fname)[0]}
    print(f"music: {len(music)} tracks -> {mus_dir}")

    with open(os.path.join(OUT, "frames.json"), "w") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    # also as a plain script, so index.html works by double-clicking it
    # (fetch() is blocked on file:// URLs, a <script> tag is not)
    with open(os.path.join(OUT, "frames.js"), "w") as f:
        f.write("window.GD_FRAMES = " + json.dumps(manifest, indent=1, sort_keys=True) + ";\n")
        f.write("window.GD_MUSIC = " + json.dumps(music, indent=1, sort_keys=True) + ";\n")
        f.write("window.GD_CUBES = " + json.dumps(
            [c for c in CUBE_IDS if f"cube{c}" in manifest]) + ";\n")

    print(f"wrote {len(manifest)} sprites -> {OUT}")
    for n in sorted(manifest):
        m = manifest[n]
        print(f"  {n:12s} {m['w']:6.1f} x {m['h']:5.1f} units")
    if missing:
        print("\nnot found (the game falls back to drawn shapes for these):")
        for m in missing:
            print("  " + m)

if __name__ == "__main__":
    main()
