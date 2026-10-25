"""Cut LimeZu's pixel UI icons and emote bubbles into one small sheet for the café.

Output: src/assets/cafe/cafe_ui.png + src/sim/cafeUi.json ({name: [x, y, w, h]})
  row 0 (16x16): round icons used by the café menu and its pixel popups
  row 1 (16x18): emote bubbles drawn over people in the café (wait timers, heart, angry, typing dots)
Source: 4_User_Interface_Elements/UI_16x16.png (18 x 16 cells of 16 px).
"""
import json
import os
from PIL import Image

from common import ASSETS, PROJECT

SRC = os.path.join(ASSETS, '4_User_Interface_Elements', 'UI_16x16.png')

# name: (cell column, cell row) on the 16 px grid
ICONS = {
    'coin': (7, 4), 'hammer': (8, 4), 'bang': (9, 4), 'bangRed': (10, 4), 'gear': (11, 4), 'sun': (12, 4),
    'question': (7, 5), 'heart': (8, 5), 'note': (10, 5), 'moon': (11, 5),
    'questionGold': (7, 6), 'heartPink': (8, 6), 'quill': (9, 6), 'notes': (10, 6), 'cross': (11, 6), 'dots': (12, 6),
    'star': (6, 7), 'zzz': (8, 7), 'drop': (11, 7),
    'arrowNE': (0, 1), 'arrowNW': (1, 1), 'arrowUp': (2, 1), 'arrowDown': (3, 1), 'arrowRight': (2, 2), 'arrowLeft': (3, 2),
}
# name: (x, y) of a 16x18 bubble frame (measured from the sheet's alpha bounds)
BUBBLES = {}
for k in range(8):
    BUBBLES[f'wait{k}'] = (k * 16, 137)   # green clock bubble filling up
    BUBBLES[f'late{k}'] = (k * 16, 169)   # orange-to-red clock bubble
    BUBBLES[f'typing{k}'] = (k * 16, 201)  # "..." bubble
BUBBLES['love'] = (96, 9)     # heart bubble
BUBBLES['angry'] = (176, 136)  # red cross bubble

src = Image.open(SRC).convert('RGBA')
out = Image.new('RGBA', (max(len(ICONS), len(BUBBLES)) * 16, 16 + 18))
meta = {}
for i, (name, (c, r)) in enumerate(ICONS.items()):
    cell = src.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))
    assert cell.getbbox(), f'empty icon cell {name}'
    out.alpha_composite(cell, (i * 16, 0))
    meta[name] = [i * 16, 0, 16, 16]
for i, (name, (x, y)) in enumerate(BUBBLES.items()):
    cell = src.crop((x, y, x + 16, y + 18))
    bb = cell.getbbox()
    assert bb, f'empty bubble {name}'
    # the whole bubble must sit inside the crop (no clipped outline)
    full = src.crop((x, y - 2, x + 16, y + 20)).getbbox()
    assert full[1] >= 2 and full[3] <= 20, f'bubble {name} is clipped by its crop'
    out.alpha_composite(cell, (i * 16, 16))
    meta[name] = [i * 16, 16, 16, 18]

out_png = os.path.join(PROJECT, 'src', 'assets', 'cafe', 'cafe_ui.png')
out_json = os.path.join(PROJECT, 'src', 'sim', 'cafeUi.json')
out.save(out_png)
with open(out_json, 'w', encoding='utf-8') as f:
    json.dump(meta, f, separators=(',', ':'))
print('wrote', out_png, out.size, len(meta), 'sprites')
