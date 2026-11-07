"""Compose Cafinity's café characters from LimeZu Character Generator parts.

Layering order (from LimeZu's CHARACTER_GENERATOR.txt): body -> eyes -> outfit -> hairstyle -> accessory.
Every AI worker is a *human* café employee whose outfit is retinted to their tool's brand colour.

Output: src/assets/cafe/cafe_chars.png + src/sim/cafeChars.json
Sheet rows kept from each 1792x1312 generator sheet (frames are 32x64, dirs: 0 right, 1 up, 2 left, 3 down):
  y=0 static(4)  y=64 idle(24)  y=128 walk(24)  y=256 sit(12)  y=384 phone(12)  y=448 book(12)
  y=576 pick-up(48)  y=640 gift/hand-off(40)
"""
import colorsys
import json
import os
import random
import sys
from PIL import Image, ImageDraw

from common import CHARGEN, PROJECT, hexrgb

FW, FH = 32, 64
_parts = {}


def part(kind, name):
    key = (kind, name)
    if key not in _parts:
        _parts[key] = Image.open(os.path.join(CHARGEN, kind, '32x32', name)).convert('RGBA')
    return _parts[key]


def body(n):
    if n == 'deep':  # a deeper brown, darkened from LimeZu's body 1 (keeps its shading)
        key = ('Bodies', 'deep')
        if key not in _parts:
            src = body(1)
            out = src.copy()
            px = out.load()
            for y in range(out.size[1]):
                for x in range(out.size[0]):
                    p = px[x, y]
                    if p[3] and p[:3] != (58, 58, 80):
                        px[x, y] = (round(p[0] * 0.74), round(p[1] * 0.70), round(p[2] * 0.68), p[3])
            _parts[key] = out
        return _parts[key]
    return part('Bodies', f'Body_32x32_{n:02d}.png')
def eyes(n): return part('Eyes', f'Eyes_32x32_{n:02d}.png')
def outfit(s, v): return part('Outfits', f'Outfit_{s:02d}_32x32_{v:02d}.png')
def hair(s, v): return part('Hairstyles', f'Hairstyle_{s:02d}_32x32_{v:02d}.png')


def accessory(name, v):
    return part('Accessories', f'Accessory_{name}_32x32_{v:02d}.png')


# ---- outfit colour groups (source palettes measured from the sheets) ----
SHIRT9 = ['#b2aecb', '#c6bdd5', '#ebe4f2', '#f8f8f8']
GROUPS = {
    (9, 1): {'apron': ['#9e2b2d', '#d93232', '#e63f38'], 'detail': ['#fc5c46'], 'pants': ['#3b7aa2'], 'shirt': SHIRT9},
    (9, 2): {'apron': ['#9e6b2d', '#d98232', '#e6ad38'], 'detail': ['#4a8e46'], 'pants': ['#6c7865'], 'shirt': SHIRT9},
    (9, 3): {'apron': ['#50677e', '#5a9a9f', '#5aada7'], 'detail': ['#e47c46'], 'pants': ['#c55a65'], 'shirt': SHIRT9},
    (1, 1): {'top': ['#805e8e', '#9f74a8'], 'pants': ['#5d6043', '#687253']},
    (17, 1): {'top': ['#437e8f', '#4b9296'], 'pants': ['#91a5cf'], 'collar': ['#f1eaf9']},
    (16, 1): {'top': ['#ed931e', '#f5aa14'], 'pants': ['#ebe4f2'], 'detail': ['#6c6e85']},
    (25, 1): {'top': ['#355668', '#0970d4', '#0092e3'], 'pants': ['#67697b'], 'collar': ['#dd71a3', '#f7a8be', '#fbabc6']},
    (12, 1): {'top': ['#c6bdd5', '#d8d0e0', '#ebe4f2'], 'pants': ['#6c6e85', '#738ca8', '#91a5cf'], 'badge': ['#50a7e8', '#568d61']},
}


def hls(rgb):
    return colorsys.rgb_to_hls(*(c / 255 for c in rgb))


def to_rgb(h, l, s):
    return tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, l, s))


def retint_group(sources, target):
    """Map a group of source colours onto a target colour, preserving each colour's
    lightness offset from the group's middle tone (keeps LimeZu's shading)."""
    if isinstance(target, (list, tuple)) and not isinstance(target, str):
        # explicit per-colour targets, dark -> light
        srcs = sorted(sources, key=lambda h: hls(hexrgb(h))[1])
        tg = list(target)
        while len(tg) < len(srcs):
            tg.append(tg[-1])
        return {hexrgb(s): hexrgb(t) for s, t in zip(srcs, tg)}
    th, tl, ts = hls(hexrgb(target))
    ls = [hls(hexrgb(s))[1] for s in sources]
    mid = sorted(ls)[len(ls) // 2]
    out = {}
    for s, l in zip(sources, ls):
        nl = max(0.05, min(0.97, tl + (l - mid) * 1.1))
        out[hexrgb(s)] = to_rgb(th, nl, ts)
    return out


def recolored_outfit(style, variant, colors):
    img = outfit(style, variant)
    groups = GROUPS.get((style, variant), {})
    mapping = {}
    for g, target in (colors or {}).items():
        if g in groups:
            mapping.update(retint_group(groups[g], target))
    if not mapping:
        return img
    out = img.copy()
    d = out.load()
    for y in range(out.size[1]):
        for x in range(out.size[0]):
            p = d[x, y]
            if p[3] and p[:3] in mapping:
                d[x, y] = (*mapping[p[:3]], p[3])
    return out


def recolor_layer(img, target_hex):
    """Retint every non-outline pixel of an accessory (e.g. tortoiseshell glasses)."""
    th, tl, ts = hls(hexrgb(target_hex))
    out = img.copy()
    d = out.load()
    for y in range(out.size[1]):
        for x in range(out.size[0]):
            p = d[x, y]
            if p[3] and p[:3] != (58, 58, 80):
                _, l, _ = hls(p[:3])
                d[x, y] = (*to_rgb(th, max(0.08, min(0.9, tl + (l - 0.5) * 0.6)), ts), p[3])
    return out


def compose(spec):
    layers = [body(spec['body']), eyes(spec.get('eyes', 1))]
    layers.append(recolored_outfit(*spec['outfit'], spec.get('colors')))
    if spec.get('hair'):
        layers.append(hair(*spec['hair']))
    for acc in spec.get('acc', []):
        img = accessory(acc[0], acc[1])
        if len(acc) > 2:
            img = recolor_layer(img, acc[2])
        layers.append(img)
    out = Image.new('RGBA', layers[0].size)
    for L in layers:
        out.alpha_composite(L)
    return out


def frames(sheet, y, c0, n):
    return [sheet.crop(((c0 + i) * FW, y, (c0 + i + 1) * FW, y + FH)) for i in range(n)]


def strip(fr):
    out = Image.new('RGBA', (FW * len(fr), FH))
    for i, f in enumerate(fr):
        out.alpha_composite(f, (i * FW, 0))
    return out


STAFF_W = 48 * FW


def staff_block(sheet):
    """4 rows x 48 frames: [idle24|walk24] [pickup48] [gift40|static4] [sit12|phone12|book12|sit2 12]"""
    out = Image.new('RGBA', (STAFF_W, FH * 4))
    out.alpha_composite(strip(frames(sheet, 64, 0, 24) + frames(sheet, 128, 0, 24)), (0, 0))
    out.alpha_composite(strip(frames(sheet, 576, 0, 48)), (0, FH))
    out.alpha_composite(strip(frames(sheet, 640, 0, 40) + frames(sheet, 0, 0, 4)), (0, FH * 2))
    out.alpha_composite(strip(frames(sheet, 256, 0, 12) + frames(sheet, 384, 0, 12) + frames(sheet, 448, 0, 12) + frames(sheet, 320, 0, 12)), (0, FH * 3))
    return out


def extra_block(sheet):
    """2 rows: [idle24|walk24] [sit12|phone12|book12|sit2 12]"""
    out = Image.new('RGBA', (STAFF_W, FH * 2))
    out.alpha_composite(strip(frames(sheet, 64, 0, 24) + frames(sheet, 128, 0, 24)), (0, 0))
    out.alpha_composite(strip(frames(sheet, 256, 0, 12) + frames(sheet, 384, 0, 12) + frames(sheet, 448, 0, 12) + frames(sheet, 320, 0, 12)), (0, FH))
    return out


WHITE_SHIRT = None
# body: 01 brown, 02 light, 03 peach, 04 tan-brown, 07 warm peach, 'deep' (01 darkened).
# 05/06/08/09 read as olive-yellow, grey, pink and lilac at 32px, so nobody uses them.
STAFF = {
    'owner':       dict(body=2, eyes=1, outfit=(9, 1), hair=(6, 4),
                        colors={'apron': ['#3d2416', '#5c3a24', '#7a4e30'], 'detail': '#d9a066', 'shirt': ['#d9cbb3', '#e6d9c2', '#f3e7d7', '#faf4ec'], 'pants': '#3d4a66'}),
    'barista':     dict(body=3, eyes=2, outfit=(9, 1), hair=(20, 7),
                        colors={'apron': ['#22222b', '#33333f', '#45455a'], 'detail': '#c9a27a', 'pants': '#2f3446'}),
    # the owner's human crew grows with the team size they told us (survey): a second barista, then a floor hand
    'barista2':    dict(body='deep', eyes=4, outfit=(9, 1), hair=(13, 1),
                        colors={'apron': ['#3b2a1f', '#4e3829', '#634836'], 'detail': '#d9a066', 'pants': '#2f2b33'}),
    'floor':       dict(body=7, eyes=1, outfit=(9, 2), hair=(24, 5),
                        colors={'apron': ['#5b6b4a', '#6f8559', '#86a06b'], 'detail': '#f3e7d7', 'pants': '#3a3530'}),
    # Bea, Cafinity's advisor in the chat (not in the café): auburn buns, terracotta apron
    'bea':         dict(body=2, eyes=2, outfit=(9, 1), hair=(11, 3),
                        colors={'apron': ['#8f3e17', '#c85a24', '#e07a45'], 'detail': '#fce9c8', 'pants': '#3d2a20'}),
    'copilot':     dict(body=4, eyes=3, outfit=(1, 1), hair=(17, 7),
                        colors={'top': ['#3443c8', '#5262ea'], 'pants': ['#2b2f42', '#363b52']}),
    'xero':        dict(body=3, eyes=1, outfit=(12, 1), hair=(1, 4), acc=[('15_Glasses', 1, '#8a5a2b')],
                        colors={'top': ['#0b86b4', '#13b5ea', '#5fd0f3'], 'pants': ['#2c3e5c', '#34486a', '#3d5379'], 'badge': ['#ffffff', '#ffffff']}),
    'dext':        dict(body=4, eyes=4, outfit=(9, 1), hair=(21, 7),
                        colors={'apron': ['#b8380a', '#ff5a1f', '#ff7d4a'], 'detail': '#ffd0a8', 'shirt': ['#2a2a33', '#33333d', '#3d3d48', '#4a4a57'], 'pants': '#2b2b36'}),
    'deputy':      dict(body=7, eyes=2, outfit=(25, 1), hair=(16, 3),
                        colors={'top': ['#163f94', '#1b4fb8', '#2e7cf6'], 'pants': '#3a3f52', 'collar': ['#1b3a7a', '#dfe9ff', '#eef4ff']}),
    'square':      dict(body=2, eyes=5, outfit=(9, 1), hair=(15, 4),
                        colors={'apron': ['#141c2b', '#1e293b', '#334155'], 'detail': '#f8fafc', 'pants': '#1f2533'}),
    'lightspeed':  dict(body=1, eyes=1, outfit=(9, 1), hair=(26, 2),
                        colors={'apron': ['#7f1515', '#e21b22', '#f0474d'], 'detail': '#ffffff', 'pants': '#2b2f3c'}),
    'marketman':   dict(body=4, eyes=3, outfit=(9, 2), hair=(3, 4), acc=[('12_Mustache', 3)],
                        colors={'apron': ['#9a4a07', '#f59e0b', '#fbbf24'], 'detail': '#7c4a12', 'pants': '#4a4136'}),
    'ordermentum': dict(body=3, eyes=4, outfit=(17, 1), hair=(8, 1),
                        colors={'top': ['#0a5f58', '#0d9488'], 'pants': '#3b4256', 'collar': '#d6fff7'}),
    'canva':       dict(body='deep', eyes=5, outfit=(9, 3), hair=(10, 3),
                        colors={'apron': ['#7d2ae8', '#4f6fe6', '#00c4cc'], 'detail': '#ffffff', 'pants': '#33304a'}),
    'podium':      dict(body=7, eyes=2, outfit=(1, 1), hair=(23, 7),
                        colors={'top': ['#3f37c9', '#5b54ee'], 'pants': ['#2a2a40', '#34344d']}),
    'slang':       dict(body=1, eyes=5, outfit=(16, 1), hair=(11, 7),
                        colors={'top': ['#d11a43', '#f43f5e'], 'pants': '#3a2f45', 'detail': '#2b2b36'}),
    'mailchimp':   dict(body=2, eyes=3, outfit=(16, 1), hair=(22, 2),
                        colors={'top': ['#c58a05', '#eab308'], 'pants': '#3f3a33', 'detail': '#5a4a20'}),
}

# ---- the crowd: generated from the Character Generator parts, with taste rules ----
SKIN = [2, 3, 7, 4, 1, 'deep']
EYES = [1, 2, 3, 4, 5, 6]
# no fringes over the eyes (9, 18, 25), no head plaster (14), no anime colours (27-29)
HAIR_OK = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 19, 20, 21, 22, 23, 24, 26]
HAIR_COLOURS = [(1, 3), (2, 4), (3, 4), (4, 4), (5, 1), (6, 2), (7, 2)]   # (variant, weight): grey & navy are rarer
# everyday clothes only: no uniforms/aprons (8, 9), costumes (15, 23, 28, 30), pyjama print (24),
# swimwear (32), gowns (33) or clerical collars (3)
OUTFIT_OK = [1, 2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 29, 31]
HEADWEAR = [('15_Glasses', 6, 0.16), ('11_Beanie', 5, 0.07), ('04_Snapback', 6, 0.05)]   # (part, variants, chance)
EXTRAS_ACC = [('03_Backpack', 10, 0.10), ('13_Beard', 5, 0.06), ('12_Mustache', 5, 0.03)]
N_CUSTOMERS = 28
FRONT = (18 * FW, 64)   # idle, facing down, frame 0


def front(img):
    return img.crop((FRONT[0], FRONT[1], FRONT[0] + FW, FRONT[1] + FH))


def face_ok(spec):
    """The face must read at 32px: pupils uncovered and most of the face skin visible."""
    b = front(body(spec['body']))
    e = front(eyes(spec['eyes']))
    pupils = [(x, y) for x in range(FW) for y in range(FH) if e.getpixel((x, y))[3] > 200 and sum(e.getpixel((x, y))[:3]) < 300]
    covers = [front(hair(*spec['hair'])), front(outfit(*spec['outfit']))]
    covers += [front(accessory(a[0], a[1])) for a in spec.get('acc', []) if 'Glasses' not in a[0]]
    if any(L.getpixel(p)[3] > 120 for p in pupils for L in covers):
        return False
    face = [(x, y) for x in range(4, 28) for y in range(28, 47) if b.getpixel((x, y))[3] > 200]
    hidden = sum(1 for p in face if any(L.getpixel(p)[3] > 120 for L in covers))
    return 1 - hidden / len(face) >= 0.42


def variants(kind, prefix):
    d = os.path.join(CHARGEN, kind, '32x32')
    return sorted(int(n[-6:-4]) for n in os.listdir(d) if n.startswith(prefix))


def generate_crowd(n=N_CUSTOMERS, seed=2026):
    """Seeded, so the crowd is the same on every build. Skin tones are dealt out evenly; no two
    customers share a hairstyle+colour or an outfit+colour; every face must pass face_ok."""
    rng = random.Random(seed)
    skins = (SKIN * (n // len(SKIN) + 1))[:n]
    rng.shuffle(skins)
    used_hair, used_outfit, crowd = set(), set(), {}
    for i in range(n):
        for _ in range(400):
            style = rng.choice(HAIR_OK)
            colour = rng.choices([c for c, _ in HAIR_COLOURS], [w for _, w in HAIR_COLOURS])[0]
            o = rng.choice(OUTFIT_OK)
            ov = rng.choice(variants('Outfits', f'Outfit_{o:02d}_'))
            if (style, colour) in used_hair or (o, ov) in used_outfit:
                continue
            spec = dict(body=skins[i], eyes=rng.choice(EYES), outfit=(o, ov), hair=(style, colour), acc=[])
            for part_name, nv, chance in HEADWEAR:
                if rng.random() < chance:
                    spec['acc'].append((part_name, rng.randint(1, nv)))
                    if 'Glasses' not in part_name:
                        break       # one hat at most (glasses go with anything)
            facial = False
            for part_name, nv, chance in EXTRAS_ACC:
                if rng.random() < chance:
                    if part_name in ('13_Beard', '12_Mustache'):
                        if facial:
                            continue
                        facial = True
                    spec['acc'].append((part_name, rng.randint(1, nv)))
            if not face_ok(spec):
                continue
            used_hair.add((style, colour))
            used_outfit.add((o, ov))
            crowd[f'cust{i + 1}'] = spec
            break
    return crowd


EXTRAS = {
    **generate_crowd(),
    'courier': dict(body=4, eyes=1, outfit=(16, 1), hair=(12, 4),
                    colors={'top': ['#6e5134', '#8a6a45'], 'pants': '#3a3530', 'detail': '#2b2b36'}),
}


def build():
    blocks = []
    meta = {}
    y = 0
    for name, spec in STAFF.items():
        b = staff_block(compose(spec))
        blocks.append((b, y))
        meta[name] = {'y': y, 'kind': 'staff'}
        y += b.size[1]
    for name, spec in EXTRAS.items():
        b = extra_block(compose(spec))
        blocks.append((b, y))
        meta[name] = {'y': y, 'kind': 'extra'}
        y += b.size[1]
    atlas = Image.new('RGBA', (STAFF_W, y))
    for b, yy in blocks:
        atlas.alpha_composite(b, (0, yy))
    out_dir = os.path.join(PROJECT, 'src', 'assets', 'cafe')
    atlas.save(os.path.join(out_dir, 'cafe_chars.png'), optimize=True)
    with open(os.path.join(PROJECT, 'src', 'sim', 'cafeChars.json'), 'w') as f:
        json.dump({'fw': FW, 'fh': FH, 'chars': meta}, f, indent=1)
    return atlas, meta


def lineup(atlas, meta, path):
    """Preview: each character front / right / back / walk / sit / phone, at 3x."""
    names = list(meta)
    sc = 3
    cols = [('static D', 2, 43), ('static R', 2, 40), ('static U', 2, 41), ('walk L', 0, 24 + 12 + 2), ('sit R', 3, 2), ('phone', 3, 18), ('book', 3, 27), ('gift D', 2, 33)]
    cw, ch = FW * sc + 6, 48 * sc + 18
    img = Image.new('RGBA', (cw * len(cols) + 120, ch * len(names)), (222, 214, 200, 255))
    d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        m = meta[n]
        d.text((4, i * ch + 6), n, fill=(40, 30, 20, 255))
        for j, (_, row, col) in enumerate(cols):
            if m['kind'] == 'extra':
                if row == 2:
                    row, col = 0, {43: 18, 40: 0, 41: 6, 33: 18}.get(col, 18)
                if row == 3:
                    row = 1
            fr = atlas.crop((col * FW, m['y'] + row * FH + 16, (col + 1) * FW, m['y'] + (row + 1) * FH))
            fr = fr.resize((FW * sc, 48 * sc), Image.NEAREST)
            img.alpha_composite(fr, (120 + j * cw, i * ch + 14))
    img.save(path)


if __name__ == '__main__':
    atlas, meta = build()
    print('atlas', atlas.size, 'chars', len(meta))
    if len(sys.argv) > 1:
        lineup(atlas, meta, sys.argv[1])
