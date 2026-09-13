#!/usr/bin/env python3
"""Verify every music slot points at a file that actually exists.

A slot pointing at a missing file plays silence with no error, which is easy to
ship by accident - this catches it.

    python3 tools/check_music.py
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "music", "tracks.js")).read()
body = src.split("window.CUSTOM_MUSIC")[1].split("};")[0]
entries = re.findall(r"(\w+):\s*\{([^}]*)\}", body)
def path_of(f):
    return (os.path.join(ROOT, "assets-local", "music", f[3:]) if f.startswith("gd:")
            else os.path.join(ROOT, "music", f))
bad = waiting = 0
for slot, blob in entries:
    m = re.search(r"file:'([^']+)'", blob)
    if not m: continue
    f = m.group(1)
    fb = re.search(r"fallback:'([^']+)'", blob)
    ok = os.path.exists(path_of(f))
    if ok:
        print(f"  OK       {slot:8s} {f:34s} {os.path.getsize(path_of(f))//1024}KB")
    elif fb and os.path.exists(path_of(fb.group(1))):
        print(f"  WAITING  {slot:8s} {f:34s} -> falls back to {fb.group(1)}")
        waiting += 1
    else:
        print(f"  MISSING  {slot:8s} {f:34s} (no working fallback - this slot is silent)")
        bad += 1
print(f"{len(entries)} slots, {bad} broken, {waiting} waiting for a download")
sys.exit(1 if bad else 0)
