# Shards of Vael — Greenhollow (Phase 1 test build)

A WoW-inspired fantasy action RPG in the browser, built in three.js with an isometric camera. Original world.

**Play:** https://curtisrobertrc-droid.github.io/shards-of-vael/

## What's in this build
- One zone (Greenhollow Vale): village, Millbrook Farms, the Old Graveyard, Thornwood bandit camp, Bramble Shrine
- One class: the Warden (tank) with auto-attack + 4 skills (Shield Bash, Cleave, Charge, Second Wind) and a Resolve resource
- 4-quest storyline from Captain Edda Thorne and Pip Wickerly, ending with the Shrine Wraith boss
- Enemies with simple AI (wander, aggro, chase, leash home, respawn), an elite (Grubb) and a boss with red-circle attacks
- Loot with rarity colours (Common → Epic), 8 gear slots, stats, compare & equip
- XP and levelling (cap 10 for this build), gold, a vendor (buy/sell), healing draughts
- Progress saves in the browser (localStorage)
- Desktop: WASD + mouse; Phone: virtual joystick + skill buttons

## Controls
WASD/arrows move · click an enemy to target · F/Tab attack nearest · 1–4 skills · Q potion · E talk · C bag · mouse wheel zoom

## Run locally
Serve the folder with any static server, e.g. `python3 -m http.server`, and open `index.html`.

See CREDITS.md for asset credits.
