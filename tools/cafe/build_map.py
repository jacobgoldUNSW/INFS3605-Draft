"""Brewmind café map compiler.

Builds (from the LimeZu sheets in ../Assets):
  src/assets/cafe/cafe_ground.png   static ground: street, walls, floors, rugs, wall decor, partition
  src/assets/cafe/cafe_objects.png  atlas of every Y-sorted object
  src/assets/cafe/cafe_fx.png       animated frames (doors, clock, cake fridge, coffee, cat)
  src/sim/cafeMap.json              grid, objects (atlas rects + sort keys), stations, spots, lights
and a full preview PNG (ground + objects) for visual verification.

Grid: 30 cols x 17 rows of 32px (960 x 544).
  rows 0-2   street: road edge, footpath lane (row 1), building line (row 2)
  rows 3-4   north wall face (café front: windows + door | back office: brick)
  rows 5-15  interior floor (row 16 = south wall strip, decor only)
  cols 0/29  side walls; col 20 = partition wall between the café and the back office

Every sprite is cut from the sheets either as an exact connected component (`comp`) or as a
tile/pixel rect that passes the crop lint (no sprite may continue past the crop edge).
"""
import collections
import json
import os
import sys
from PIL import Image, ImageDraw, ImageOps

from common import (T, PROJECT, ANIM, Packer, bbox, hstack, sheet, tiles)

COLS, ROWS = 30, 17
W, H = COLS * T, ROWS * T
OUTLINE = (58, 58, 80, 255)
WHITE = (248, 248, 248, 255)
TRIM = (201, 134, 85, 255)

ground = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(ground)

# --------------------------------------------------------------------------------------
# crop lint: a crop is "cut" when opaque pixels sit on its edge and the sprite carries on
LINT = []


def lint(name, key, x, y, w, h, allow=()):
    sh = sheet(key)
    SW, SH = sh.size
    a = sh.load()
    op = lambda p: p[3] > 40
    for side in ('top', 'bottom', 'left', 'right'):
        if side in allow:
            continue
        n = 0
        rng = range(x, x + w) if side in ('top', 'bottom') else range(y, y + h)
        for i in rng:
            inside, outside = {
                'top': ((i, y), (i, y - 1)), 'bottom': ((i, y + h - 1), (i, y + h)),
                'left': ((x, i), (x - 1, i)), 'right': ((x + w - 1, i), (x + w, i)),
            }[side]
            ox, oy = outside
            if 0 <= ox < SW and 0 <= oy < SH and op(a[inside]) and op(a[outside]):
                n += 1
        if n >= 3:
            LINT.append(f'{name}: {key}({x},{y},{w}x{h}) sprite continues past the {side} edge ({n}px)')


def ptile(key, tx, ty, tw=1, th=1, name='?', allow=()):
    """Tile crop that must pass the lint."""
    lint(name, key, tx * T, ty * T, tw * T, th * T, allow)
    return tiles(key, tx, ty, tw, th)


def ppx(key, x, y, w, h, name='?', allow=()):
    lint(name, key, x, y, w, h, allow)
    return sheet(key).crop((x, y, x + w, y + h))


def comp(key, sx, sy, limit=None, thr=8, name='?', seeds=(), cut_ok=False):
    """The exact sprite: the 8-connected opaque component around pixel (sx, sy) (searching a few
    pixels for the nearest opaque one) plus the components of any extra `seeds`, clipped to
    `limit` (x, y, w, h). Pixels of neighbouring sprites inside the bounding box are masked out.
    `cut_ok` marks a deliberate clip (e.g. dropping a lectern's microphone)."""
    sh = sheet(key)
    SW, SH = sh.size
    lx0, ly0, lx1, ly1 = (0, 0, SW, SH) if not limit else (int(limit[0]), int(limit[1]), int(limit[0] + limit[2]), int(limit[1] + limit[3]))
    a = sh.getchannel('A').load()
    inside = lambda x, y: lx0 <= x < lx1 and ly0 <= y < ly1 and 0 <= x < SW and 0 <= y < SH

    def nearest(px, py):
        for r in range(0, 24):
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    x, y = int(px) + dx, int(py) + dy
                    if inside(x, y) and a[x, y] > thr:
                        return (x, y)
        raise ValueError(f'{name}: no opaque pixel near {px},{py}')

    seen = set()
    for s in [(sx, sy), *seeds]:
        start = nearest(*s)
        if start in seen:
            continue
        seen.add(start)
        q = collections.deque([start])
        while q:
            x, y = q.popleft()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if n not in seen and inside(*n) and a[n] > thr:
                        seen.add(n)
                        q.append(n)
    xs = [p[0] for p in seen]
    ys = [p[1] for p in seen]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    if limit and not cut_ok and (x0 == lx0 or y0 == ly0 or x1 == lx1 or y1 == ly1):
        LINT.append(f'{name}: component touches its limit box {limit} -> may be cut')
    out = Image.new('RGBA', (x1 - x0, y1 - y0))
    src = sh.load()
    dst = out.load()
    for (x, y) in seen:
        dst[x - x0, y - y0] = src[x, y]
    return out


# --------------------------------------------------------------------------------------
# walkability: 0 blocked, 1 walkable
walk = [[0] * COLS for _ in range(ROWS)]


def set_walk(c0, r0, c1, r1, v=1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            if 0 <= c < COLS and 0 <= r < ROWS:
                walk[r][c] = v


# --------------------------------------------------------------------------------------
# Floors.  Each LimeZu floor material is a 3x2 block: (0,0) corner shadow, (1,0) top shadow,
# (0,1) left shadow, (1,1)/(2,1) plain.
def floor_tile(block, kind='plain', alt=False):
    bx, by = block
    ox, oy = {'plain': (2 if alt else 1, 1), 'top': (1, 0), 'left': (0, 1), 'corner': (0, 0)}[kind]
    return tiles('FLOOR', bx + ox, by + oy)


OAK = (0, 12)        # honey oak planks — café floor
SLATE = (8, 28)      # dark slate tiles — back office (reads as "staff only")
PAVER = (8, 36)      # warm stone slabs — footpath
CHECKER = (4, 20)    # terracotta checker — behind the bar


def paint_floor(block, c0, r0, c1, r1, shadow_top=False, shadow_left=False):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            top = shadow_top and r == r0
            left = shadow_left and c == c0
            kind = 'corner' if (top and left) else 'top' if top else 'left' if left else 'plain'
            ground.alpha_composite(floor_tile(block, kind), (c * T, r * T))


# street: pavers rows 0-2, then a road strip + curb along the very top
paint_floor(PAVER, 0, 0, COLS - 1, 2)
ROAD_H = 13
gdraw.rectangle([0, 0, W, ROAD_H - 1], fill=(76, 79, 94, 255))
for x in range(0, W, 46):  # faint lane dashes
    gdraw.rectangle([x + 8, 3, x + 28, 4], fill=(214, 206, 170, 255))
gdraw.rectangle([0, ROAD_H, W, ROAD_H + 1], fill=(206, 204, 214, 255))   # curb top
gdraw.rectangle([0, ROAD_H + 2, W, ROAD_H + 3], fill=(150, 146, 160, 255))  # curb face

# interior floors
paint_floor(OAK, 1, 5, 20, 16, shadow_top=True, shadow_left=True)
paint_floor(SLATE, 21, 5, 28, 16, shadow_top=True, shadow_left=True)
paint_floor(CHECKER, 2, 5, 13, 6, shadow_top=True)

# --------------------------------------------------------------------------------------
# North wall (rows 3-4). Walls sheet sets are 3 wide x 2 tall: left-end, middle, right-end.
CAFE_WALL = (22, 24)   # cream plaster over sage wainscot
BOH_WALL = (0, 16)     # pale cream brick


def wall_run(block, c0, c1):
    bx, by = block
    for c in range(c0, c1 + 1):
        off = 0 if c == c0 else 2 if c == c1 else 1
        ground.alpha_composite(tiles('WALL', bx + off, by, 1, 2), (c * T, 3 * T))


wall_run(CAFE_WALL, 0, 20)
wall_run(BOH_WALL, 21, 29)

# --------------------------------------------------------------------------------------
# Side walls: white band + perspective side face + wood trim, LimeZu style
SAGE_SIDE = (84, 124, 112, 255)
BRICK_SIDE = (150, 146, 140, 255)


def side_wall(side):
    face = SAGE_SIDE if side == 'west' else BRICK_SIDE
    y_top = 3 * T
    for y in range(y_top, H):
        if y < 5 * T:
            k = (y - (y_top + 12)) / (5 * T - (y_top + 12))
            fw = max(0, min(12, round(12 * k)))
            tw = 4 if y >= 5 * T - 6 else 0
        else:
            fw, tw = 12, 4
        cols = [OUTLINE, OUTLINE] + [WHITE] * 10 + [OUTLINE, OUTLINE] + [face] * fw + [TRIM] * tw
        if y >= 5 * T:
            cols += [OUTLINE, OUTLINE]
        for i, colr in enumerate(cols):
            x = i if side == 'west' else W - 1 - i
            ground.putpixel((x, y), colr)


side_wall('west')
side_wall('east')
for x0 in (0, W - 14):
    gdraw.rectangle([x0, 3 * T, x0 + 13, 3 * T + 11], fill=WHITE)
    gdraw.rectangle([x0, 3 * T, x0 + 13, 3 * T + 1], fill=OUTLINE)
gdraw.rectangle([0, 3 * T, 1, H], fill=OUTLINE)
gdraw.rectangle([W - 2, 3 * T, W - 1, H], fill=OUTLINE)

# south wall band (drawn into the ground; row 16 is decor-only)
SB = H - 12
gdraw.rectangle([0, SB, W, SB + 1], fill=OUTLINE)
gdraw.rectangle([0, SB + 2, W, SB + 9], fill=WHITE)
gdraw.rectangle([0, SB + 10, W, H], fill=OUTLINE)

# --------------------------------------------------------------------------------------
# Objects
objects = []      # sorted objects (drawn interleaved with characters by z)
packer = Packer(1024)


def place(name, img, x, y, z=None, layer='sorted', block=None, meta=None, shadow=True):
    """Place an image whose top-left lands at pixel (x, y). Transparent padding is trimmed
    for the atlas; z defaults to the bottom edge of the visible pixels."""
    bb = bbox(img)
    if bb is None:
        raise ValueError(f'{name}: empty image')
    crop = img.crop(bb)
    ax, ay = bb[0], bb[1]
    if layer == 'ground':
        ground.alpha_composite(crop, (x + ax, y + ay))
    else:
        atlas_pos = packer.add(crop)
        o = {'n': name, 'a': [atlas_pos[0], atlas_pos[1], crop.size[0], crop.size[1]],
             'x': x + ax, 'y': y + ay, 'z': z if z is not None else y + bb[3]}
        if meta:
            o['m'] = meta
        if not shadow:
            o['ns'] = 1
        objects.append(o)
    if block:
        c0, r0, cw, rh = block
        set_walk(c0, r0, c0 + cw - 1, r0 + rh - 1, 0)
    return (x + ax, y + ay, crop.size[0], crop.size[1])


def put(name, key, tx, ty, tw, th, c, r, dx=0, dy=0, allow=(), **kw):
    """Place a tile-rect from a sheet with its top-left at map tile (c, r) + pixel nudge."""
    return place(name, ptile(key, tx, ty, tw, th, name, allow), c * T + dx, r * T + dy, **kw)


def stand(name, img, cx, base, **kw):
    """Place a trimmed sprite centred on pixel column cx with its visible bottom on `base`."""
    bb = bbox(img)
    img = img.crop(bb)
    return place(name, img, round(cx - img.size[0] / 2), base - img.size[1], **kw)


# ---------- walkable base areas ----------
set_walk(0, 1, COLS - 1, 1)          # footpath lane
set_walk(1, 2, COLS - 2, 2)          # building line (planters block parts of it)
set_walk(1, 5, 28, 15)               # interior
INNER_DOOR = (20, 8)
set_walk(20, 5, 20, 15, 0)           # the partition wall …
set_walk(*INNER_DOOR, *INNER_DOOR)   # … with one staff door

# ---------- custom micro-props drawn in LimeZu's palette ----------
PAL = {'O': (58, 58, 80, 255), 'W': (246, 246, 250, 255), 'w': (214, 214, 226, 255), 'S': (44, 50, 64, 255),
       's': (78, 96, 128, 255), 'b': (120, 200, 255, 255), 'g': (190, 194, 206, 255), 'G': (150, 154, 170, 255),
       'k': (30, 32, 40, 255), 'y': (250, 214, 92, 255), 'r': (236, 98, 86, 255), 'm': (124, 220, 160, 255),
       'c': (226, 206, 168, 255), 'C': (190, 160, 116, 255), 'v': (150, 120, 230, 255),
       'h': (222, 168, 112, 255), 'H': (178, 116, 70, 255), 'j': (128, 80, 48, 255), 'R': (196, 58, 52, 255), '.': None}


def bitmap(rows):
    h, w = len(rows), max(len(r) for r in rows)
    img = Image.new('RGBA', (w, h))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            col = PAL.get(ch)
            if col:
                img.putpixel((x, y), col)
    return img


POS_TABLET = bitmap([
    '..OOOOOOOOOOOO..',
    '.OWWWWWWWWWWWWO.',
    '.OWSSSSSSSSSSWO.',
    '.OWSbbbbsSSSSWO.',
    '.OWSSSSSSSsbSWO.',
    '.OWSbbsSSSSSSWO.',
    '.OWSSSSSSyySSWO.',
    '.OWSSSSSSSSSSWO.',
    '.OWWWWWWWWWWWWO.',
    '..OOOOOgOOOOOO..',
    '......OGO.......',
    '......OGO..OOO..',
    '....OOOGOOOkkkO.',
    '...OgggggggOkkO.',
    '...OOOOOOOOOOOO.',
])
LAPTOP = bitmap([
    '...OOOOOOOOOOOOOOOO...',
    '...OgggggggggggggggO..',
    '...OgSSSSSSSSSSSSSgO..',
    '...OgSbbbbSmmmSvvSgO..',
    '...OgSSSSSSSSSSSSSgO..',
    '...OgSbbSSyySSrrSSgO..',
    '...OgSSSSSSSSSSSSSgO..',
    '...OgSssssssssssSSgO..',
    '...OgSSSSSSSSSSSSSgO..',
    '...OgggggggggggggggO..',
    '..OOOOOOOOOOOOOOOOOOO.',
    '.OGgwgwgwgwgwgwgwgwGO.',
    '.OGwgwgwgwgwgwgwgwgGO.',
    'OGGGGGGGGGGGGGGGGGGGGO',
    'OOOOOOOOOOOOOOOOOOOOOO',
])
STAMP_CARDS = bitmap([
    '.OOOOOOO...',
    'OyyyyyyyO..',
    'OyrOyOyyOO.',
    'OyyyyyyyOyO',
    '.OOOOOOOyyO',
    '...OyyyyyyO',
    '...OOOOOOO.',
])
TAKEAWAY = bitmap([
    '.OOOOO...OOOOO...OOOOO.',
    'OWWWWWO.OWWWWWO.OWWWWWO',
    'OOOOOOO.OOOOOOO.OOOOOOO',
    '.OCcCO...OCcCO...OCcCO.',
    '.OccCO...OccCO...OccCO.',
    '.OkkkO...OyyyO...OkkkO.',
    '.OccCO...OccCO...OccCO.',
    '..OOO.....OOO.....OOO..',
])
SCANNER = bitmap([
    '.OOOO.',
    'OSbbSO',
    'OSSSSO',
    '.OGGO.',
    '.OGGO.',
    '.OGGO.',
    '..OO..',
])
WALL_SHELF = bitmap([
    'OOOOOOOOOOOOOOOOOOOO',
    'OhhhhhhhhhhhhhhhhhhO',
    'OHHHHHHHHHHHHHHHHHHO',
    'OOOOOOOOOOOOOOOOOOOO',
    '..OjO..........OjO..',
    '..OjO..........OjO..',
    '...O............O...',
])
BOOKING_BOOK = bitmap([
    '.OOOOOOOOOOO.',
    'OWWWWWOWWWWWO',
    'OWkWkWOWkkWWO',
    'OWWWWWOWWWWWO',
    'OWkkWWOWkWkWO',
    'ORRRRRORRRRRO',
    '.OOOOOOOOOOO.',
])


def micro(name, img, cx, bottom_px, z=None, layer='sorted'):
    """centre a micro-prop horizontally on pixel cx with its bottom at bottom_px"""
    return place(name, img, cx - img.size[0] // 2, bottom_px - img.size[1], z=z, layer=layer)


# ---------- chalk lettering (3x5 pixel font) on the menu board and the street A-frame ----------
FONT = {
 'A': ['010', '101', '111', '101', '101'], 'C': ['011', '100', '100', '100', '011'], 'E': ['111', '100', '110', '100', '111'],
 'F': ['111', '100', '110', '100', '100'], 'H': ['101', '101', '111', '101', '101'], 'I': ['111', '010', '010', '010', '111'],
 'L': ['100', '100', '100', '100', '111'], 'M': ['101', '111', '111', '101', '101'], 'N': ['101', '111', '111', '111', '101'],
 'O': ['010', '101', '101', '101', '010'], 'P': ['110', '101', '110', '100', '100'], 'S': ['011', '100', '010', '001', '110'],
 'T': ['111', '010', '010', '010', '010'], 'U': ['101', '101', '101', '101', '111'], 'W': ['101', '101', '111', '111', '101'],
 'R': ['110', '101', '110', '101', '101'], 'D': ['110', '101', '101', '101', '110'], 'K': ['101', '110', '100', '110', '101'],
 'Y': ['101', '101', '010', '010', '010'],
 '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['110', '001', '010', '100', '111'],
 '3': ['110', '001', '010', '001', '110'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '110', '001', '110'],
 '6': ['011', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'],
 '9': ['111', '101', '111', '001', '110'], '.': ['000', '000', '000', '000', '010'], '$': ['011', '110', '010', '011', '110'],
 ' ': ['000', '000', '000', '000', '000'], '-': ['000', '000', '111', '000', '000'],
}


def chalk(img, x, y, text, color):
    cx = x
    for ch in text:
        g = FONT.get(ch.upper(), FONT[' '])
        for yy, row in enumerate(g):
            for xx, bit in enumerate(row):
                if bit == '1':
                    img.putpixel((cx + xx, y + yy), color)
        cx += 4


CHALK = (236, 232, 214, 255)
CHALK_Y = (246, 208, 120, 255)
CHALK_P = (240, 150, 140, 255)


def dark_area(img, lum_max=70):
    """bbox of the dark chalk/screen surface of a board sprite"""
    px = img.load()
    pts = [(x, y) for x in range(img.size[0]) for y in range(img.size[1])
           if px[x, y][3] > 200 and sum(px[x, y][:3]) / 3 < lum_max]
    return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)


# ---------- Street furniture (row 2) ----------
def planter(c):
    img = Image.new('RGBA', (64, 80))
    img.alpha_composite(ptile('GR', 12, 64, 2, 2, 'planter body', allow=('top',)), (0, 16))
    img.alpha_composite(ptile('GR', 12, 63, 2, 1, 'planter top', allow=('bottom',)), (0, 4))
    place('planter', img, c * T, 3 * T - 80 + 2, block=(c, 2, 2, 1))


for c in (2, 6, 22):
    planter(c)
put('pots', 'GR', 4, 65, 1, 2, 10, 1, dy=2, block=(10, 2, 1, 1))
bench = comp('AR', 3 * T, 5 * T + 16, limit=(2 * T, 4 * T, 2 * T, 2 * T), name='bench', cut_ok=True)
stand('bench', bench, 19 * T, 3 * T - 2, block=(18, 2, 2, 1))
af_img = ptile('C', 10, 5, 2, 2, 'aframe', allow=('top', 'right')).copy()
green = [(x, y) for x in range(64) for y in range(64)
         if (lambda p: p[3] and p[1] > p[0] + 20 and p[1] >= p[2])(af_img.getpixel((x, y)))]
gx0, gy0 = min(x for x, _ in green), min(y for _, y in green)
gx1, gy1 = max(x for x, _ in green), max(y for _, y in green)
chalk(af_img, gx0 + 4, gy0 + 3, 'COFFEE', CHALK)
chalk(af_img, gx0 + 8, gy0 + 11, 'CAKE', CHALK_Y)
AF_X, AF_Y = 12 * T, 1 * T + 4
AFRAME = place('aframe', af_img, AF_X, AF_Y, block=(12, 2, 2, 1), meta={'role': 'aframe'})
AFRAME_BOARD = [AF_X + gx0, AF_Y + gy0, gx1 - gx0 + 1, gy1 - gy0 + 1]

# ---------- North wall decor (ground layer) ----------
WIN = (8, 43)


def window(c):
    return put('window', 'G', WIN[0], WIN[1], 2, 2, c, 3, dy=5, layer='ground')


WINDOWS = [window(c) for c in (1, 9, 18)]
for c in (1, 9, 18):
    put('bunting', 'B', 0, 4, 2, 1, c, 3, dy=-7, layer='ground')
painting = comp('AR', 13.5 * T, 5.1 * T, limit=(13 * T, 4 * T, T, 2 * T), name='painting')
stand('painting', painting, 12 * T + 16, 3 * T + 44, layer='ground')
open_sign = comp('GR', 1.5 * T, 50.5 * T, limit=(1 * T, 49 * T, T, 2 * T), name='openSign', cut_ok=True)
stand('openSign', open_sign, 14 * T + 16, 3 * T + 40, layer='ground')

menu = comp('C', 14 * T, 6 * T, limit=(13 * T, 5 * T, 2 * T, 2 * T), name='menuBoard').copy()
mx0, my0, mx1, my1 = dark_area(menu)
chalk(menu, mx0 + (mx1 - mx0 + 1 - 15) // 2, my0 + 3, 'MENU', CHALK_Y)
chalk(menu, mx0 + 3, my0 + 11, 'FLAT W 4.5', CHALK)
chalk(menu, mx0 + 3, my0 + 17, 'LATTE  4.8', CHALK)
chalk(menu, mx0 + 3, my0 + 23, 'CROISS 5.0', CHALK_P)
MENU = stand('menuBoard', menu, 7 * T, 3 * T + 48, layer='ground')

# the wall phone: a red retro phone on a little timber shelf
WALL_PHONE_X = 17 * T + 16
micro('phoneShelf', WALL_SHELF, WALL_PHONE_X, 3 * T + 44, layer='ground')
phone_red = comp('G', 12.9 * T, 41.8 * T, limit=(12 * T, 41 * T, 2 * T, 1.6 * T), name='wallPhone')
stand('wallPhone', phone_red, WALL_PHONE_X, 3 * T + 41, layer='ground')

# back-office wall
put('corkboard', 'C', 0, 6, 2, 1, 21, 3, dy=12, layer='ground')
roster = comp('C', 14 * T, 4.5 * T, limit=(13 * T, 3 * T, 2 * T, 2 * T), name='rosterBoard', cut_ok=True)
ROSTER = stand('rosterBoard', roster, 26 * T, 3 * T + 46, layer='ground')

# ---------- Doors ----------
DOOR = {'c': 15, 'r': 3, 'w': 2}


def doorway(c0, cols):
    """Cut the wall face (below the cap) so the street shows through when the door swings open."""
    x0, y0, x1, y1 = c0 * T, 3 * T + 12, (c0 + cols) * T, 5 * T
    pav = floor_tile(PAVER)
    for x in range(x0, x1, T):
        for y in range(y0 - 12, y1, T):
            ground.alpha_composite(pav.crop((0, 0, min(T, x1 - x), min(T, y1 - y))), (x, y))
    cap = tiles('WALL', CAFE_WALL[0] + 1, CAFE_WALL[1], 1, 1).crop((0, 0, T, 12))
    for x in range(x0, x1, T):
        ground.alpha_composite(cap.crop((0, 0, min(T, x1 - x), 12)), (x, 3 * T))
    sh = Image.new('RGBA', (x1 - x0, 14), (40, 30, 30, 0))
    for yy in range(14):
        ImageDraw.Draw(sh).line([0, yy, x1 - x0, yy], fill=(40, 30, 30, int(90 * (1 - yy / 14))))
    ground.alpha_composite(sh, (x0, y0))


doorway(15, 2)
doorway(27, 1)
set_walk(15, 2, 16, 4)
set_walk(27, 2, 27, 4)
door_mat = comp('G', 10 * T, 11 * T, limit=(9 * T, 10 * T, 2 * T, 2 * T), name='doorMat')
stand('doorMat', door_mat, 16 * T, 5 * T + 22, layer='ground')

# ---------- Partition wall between the café and the back office (col 20) ----------
PX0, PX1 = 20 * T + 12, 20 * T + 28          # cap strip (16px)
CAP_TOP, CAP_BOT = 3 * T, H - 12 - 2 * T + 12   # joins the north wall cap … ends above its south face
# the closed (edge-on) vertical door is a tall plank: measure it so the wall gap and sign fit around it
_door0 = Image.open(os.path.join(ANIM, 'animated_door_vertical_left_1_32x32.png')).convert('RGBA').crop((0, 0, 64, 96))
_db = bbox(_door0)
INNER_DOOR_SPRITE = {'x': (PX0 + PX1) // 2 - (_db[0] + _db[2]) // 2, 'y': INNER_DOOR[1] * T + T - 3 - _db[3],
                     'w': 64, 'h': 96, 'tile': list(INNER_DOOR)}
DOOR_TOP = INNER_DOOR_SPRITE['y'] + _db[1]
DOOR_GAP = (DOOR_TOP + 4, INNER_DOOR[1] * T + T - 4)


def cap_strip(y0, y1):
    gdraw.rectangle([PX0, y0, PX1 - 1, y1], fill=WHITE)
    gdraw.rectangle([PX0, y0, PX0 + 1, y1], fill=OUTLINE)
    gdraw.rectangle([PX1 - 2, y0, PX1 - 1, y1], fill=OUTLINE)


cap_strip(CAP_TOP, DOOR_GAP[0])
gdraw.rectangle([PX0, DOOR_GAP[0], PX1 - 1, DOOR_GAP[0] + 1], fill=OUTLINE)
cap_strip(DOOR_GAP[1], CAP_BOT)
gdraw.rectangle([PX0, DOOR_GAP[1] - 2, PX1 - 1, DOOR_GAP[1] - 1], fill=OUTLINE)
# south end face of the partition (cream plaster over a sage wainscot, like the café walls)
face_top = CAP_BOT
gdraw.rectangle([PX0, face_top, PX1 - 1, SB - 1], fill=(244, 232, 205, 255))
gdraw.rectangle([PX0, face_top + 30, PX1 - 1, SB - 1], fill=(120, 158, 140, 255))
gdraw.rectangle([PX0, face_top + 28, PX1 - 1, face_top + 29], fill=TRIM)
gdraw.rectangle([PX0, face_top, PX1 - 1, face_top + 1], fill=OUTLINE)
gdraw.rectangle([PX0, face_top, PX0 + 1, SB - 1], fill=OUTLINE)
gdraw.rectangle([PX1 - 2, face_top, PX1 - 1, SB - 1], fill=OUTLINE)
# soft shadow the partition throws onto the back-office floor
for i in range(10):
    gdraw.line([PX1 + i, 5 * T, PX1 + i, SB - 1], fill=(30, 22, 30, int(70 * (1 - i / 10))))
# "STAFF ONLY" plaque over the door
plaque = Image.new('RGBA', (25, 15), (0, 0, 0, 0))
pd = ImageDraw.Draw(plaque)
pd.rectangle([0, 0, 24, 14], fill=OUTLINE)
pd.rectangle([1, 1, 23, 13], fill=(250, 246, 236, 255))
chalk(plaque, 3, 2, 'STAFF', (196, 58, 52, 255))
chalk(plaque, 5, 8, 'ONLY', (58, 58, 80, 255))
ground.alpha_composite(plaque, ((PX0 + PX1) // 2 - 12, DOOR_TOP - 17))

# ---------- Espresso bar: stone worktop over timber cabinets ----------
worktop = hstack(ptile('K', 4, 6, name='worktop L', allow=('left', 'right', 'top', 'bottom')),
                 *[ptile('K', 5, 6, name='worktop M', allow=('left', 'right', 'top', 'bottom'))] * 8,
                 ptile('K', 6, 6, name='worktop R', allow=('left', 'right', 'top', 'bottom')))
fronts = hstack(ptile('K', 3, 7, name='fronts L', allow=('top', 'left', 'right')),
                *([ptile('K', 4, 7, name='fronts M', allow=('top', 'left', 'right')), ptile('K', 5, 7, name='fronts M2', allow=('top', 'left', 'right'))] * 4),
                ptile('K', 6, 7, name='fronts R', allow=('top', 'left', 'right')))
bar = Image.new('RGBA', (10 * T, 2 * T))
bar.alpha_composite(fronts, (0, T))
bar.alpha_composite(worktop, (0, 0))
RC = place('rearCounter', bar, 3 * T, 4 * T, block=(3, 5, 10, 1))
rear_z = RC[1] + RC[3]
TOP_REAR = 4 * T + 27     # where things stand on the worktop


def on_counter(name, img, cx, top_px, z):
    bb = bbox(img)
    img = img.crop(bb)
    return place(name, img, round(cx - img.size[0] / 2), top_px - img.size[1], z=z)


on_counter('grinder', ptile('K', 12, 29, name='grinder'), 3 * T + 18, TOP_REAR, rear_z + 1)
ESPRESSO = on_counter('espresso', ptile('K', 13, 29, 1, 2, 'espresso'), 4 * T + 20, TOP_REAR + 1, rear_z + 1)
on_counter('milkJugs', ptile('K', 15, 25, name='milkJugs'), 6 * T + 4, TOP_REAR, rear_z + 1)
on_counter('cups', ptile('B', 8, 4, name='cups'), 8 * T + 10, TOP_REAR, rear_z + 1)
on_counter('cups2', comp('B', 9.5 * T, 4.5 * T, limit=(9 * T, 4 * T, T, 1.7 * T), name='cups2', cut_ok=True), 8 * T + 26, TOP_REAR, rear_z + 1)
on_counter('beanJar1', ptile('K', 13, 7, name='beanJar1'), 10 * T + 6, TOP_REAR, rear_z + 1)
on_counter('beanJar2', ptile('K', 14, 7, name='beanJar2'), 10 * T + 20, TOP_REAR, rear_z + 1)
ESPRESSO2 = on_counter('espresso2', ptile('K', 15, 31, 1, 2, 'espresso2'), 11 * T + 18, TOP_REAR + 1, rear_z + 1)
cake_fridge = Image.open(os.path.join(ANIM, 'animated_canteen_fridge_cake_1_32x32.png')).convert('RGBA').crop((0, 0, 32, 96))
place('cakeFridge', cake_fridge, 13 * T, 6 * T - 96, block=(13, 5, 1, 1), meta={'anim': 'cakeFridge'})

gc = ptile('GR', 0, 58, 3, 2, 'frontCounter')
gl, gm, gr_ = gc.crop((0, 0, 32, 64)), gc.crop((32, 0, 64, 64)), gc.crop((64, 0, 96, 64))
front = hstack(gl, *([gm] * 6), gr_)                          # cols 3..10
FRONT_Y = 8 * T - 64 + 2
FC = place('frontCounter', front, 3 * T, FRONT_Y, block=(3, 7, 8, 1))
front_z = FC[1] + FC[3]
TOP_FRONT = FRONT_Y + 30
place('pastryCase', ptile('K', 4, 38, 3, 2, 'pastryCase'), 11 * T, 8 * T - 64 + 1, block=(11, 7, 3, 1))
PASS = micro('passCups', TAKEAWAY, 3 * T + 30, TOP_FRONT + 6, z=front_z + 1)
POS = micro('pos', POS_TABLET, 7 * T + 16, TOP_FRONT + 1, z=front_z + 1)
on_counter('tipJar', ptile('K', 15, 7, name='tipJar'), 9 * T + 16, TOP_FRONT + 1, front_z + 1)

# ---------- Host stand (Sunny) & guest-book lectern (Pia), by the front door ----------
# the conference lectern minus its microphone, with a booking diary on top = a café host stand
host = comp('CF', 7.5 * T, 3.2 * T, limit=(7 * T, 2 * T + 28, T, 44), name='hostStand', cut_ok=True).copy()
host.alpha_composite(BOOKING_BOOK, ((host.size[0] - BOOKING_BOOK.size[0]) // 2, 1))
stand('hostStand', host, 17 * T + 16, 7 * T - 2, block=(17, 6, 1, 1))
guestbook = comp('C', 15 * T, 16 * T, limit=(14 * T, 14 * T, 2 * T, 3 * T), name='guestBook',
                 seeds=[(15 * T, 15 * T), (14.8 * T, 15 * T + 6)])
stand('guestBook', guestbook, 19 * T + 16, 7 * T - 2, block=(19, 6, 1, 1))

# ---------- Dining ----------
SEATS = []
TABLE_IMG = comp('G', 11.5 * T, 34 * T, limit=(10.5 * T, 32.8 * T, 2.2 * T, 2.4 * T), name='table')
# LimeZu's side-on chair has its tall backrest on the RIGHT, so as drawn it faces left (measured from
# the pixels: the right-hand columns are the tall ones). Mirrored, it faces right.
CHAIR_L = ptile('G', 13, 50, 1, 2, 'chair')
CHAIR_L = CHAIR_L.crop(bbox(CHAIR_L))
CHAIR_R = ImageOps.mirror(CHAIR_L)
_a = CHAIR_L.getchannel('A')
_tall = [sum(1 for y in range(_a.size[1] // 2) if _a.getpixel((x, y)) > 40) for x in range(_a.size[0])]
assert sum(_tall[_a.size[0] // 2:]) > sum(_tall[:_a.size[0] // 2]), 'chair sprite: expected the backrest on the right'
CANDLES = []


CHAIR_BB = bbox(tiles('G', 13, 50, 1, 2))


def table_set(c, r):
    cx = c * T + 16
    tb = place('table', TABLE_IMG, cx - TABLE_IMG.size[0] // 2, (r + 1) * T + 1 - TABLE_IMG.size[1], block=(c, r, 1, 1))
    # both chairs face the table: the right-hand one is the left one mirrored about the table centre
    # left of the table: faces right (backrest on the outside); right of the table: faces left
    left = place('chairR', CHAIR_R, (c - 1) * T + 4 + CHAIR_BB[0], (r - 1) * T + 2 + CHAIR_BB[1])
    place('chairL', CHAIR_L, 2 * cx - (left[0] + left[2]), left[1])
    SEATS.append({'tile': [c - 1, r], 'face': 'right', 'table': [c, r]})
    SEATS.append({'tile': [c + 1, r], 'face': 'left', 'table': [c, r]})
    CANDLES.append([cx, tb[1] + 9])


for (c, r) in ((3, 10), (3, 13), (13, 10), (13, 13), (17, 13)):
    table_set(c, r)

# ---------- Lounge nook: rug, two facing armchairs, coffee table, lamp, plant, café cat ----------
put('rug', 'G', 6, 22, 6, 2, 6, 12, layer='ground', allow=('top', 'bottom', 'left'))
ARM_R = ppx('L', 290, 1164, 44, 84, 'armchairFacingRight', allow=('bottom',))   # backrest on its left
ARM_L = ppx('L', 242, 1164, 44, 84, 'armchairFacingLeft', allow=('bottom',))    # backrest on its right
LOUNGE_Y = 13 * T + 2
place('armchair', ARM_R, (7 * T + 16) - 25, LOUNGE_Y - ARM_R.size[1], z=LOUNGE_Y - 6, block=(7, 12, 1, 1))
place('armchair', ARM_L, (10 * T + 16) - 17, LOUNGE_Y - ARM_L.size[1], z=LOUNGE_Y - 6, block=(10, 12, 1, 1))
coffee = comp('L', 5 * T, 8 * T, limit=(4 * T, 7 * T, 2 * T, 2 * T), name='coffeeTable')
stand('coffeeTable', coffee, 9 * T, LOUNGE_Y - 4, block=(8, 12, 2, 1))
lamp = comp('L', 11.5 * T, 10 * T, limit=(11 * T - 4, 9 * T, T + 3, 2 * T + 5), name='floorLamp')
LAMP = stand('floorLamp', lamp, 6 * T + 12, 11 * T + 28, block=(6, 11, 1, 1))
plant_a = comp('L', 11 * T, 1.5 * T, limit=(10 * T, 0, 2 * T, 3 * T), name='plantA')
stand('plantA', plant_a, 11 * T + 16, 11 * T + 28, block=(11, 11, 1, 1))
SEATS.append({'tile': [10, 12], 'face': 'left', 'table': [9, 12], 'lounge': True})
CAT = {'x': 9 * T - 48 + 6, 'y': 13 * T + 30 - 32, 'z': 13 * T + 30, 'w': 96, 'h': 32}

# ---------- Plants around the café ----------
plant_b = ptile('L', 12, 0, 1, 3, 'plantB')
stand('plantB', plant_b, 19 * T + 16, 11 * T + 28, block=(19, 11, 1, 1))
plant_c = comp('G', 15.5 * T, 29 * T, limit=(15 * T, 27.5 * T, T, 3 * T), name='plantC', cut_ok=True)
stand('plantC', plant_c, 1 * T + 18, 15 * T + 28, block=(1, 15, 1, 1))
palm = comp('G', 14 * T, 27.3 * T, limit=(13 * T, 25 * T, 2 * T, 3 * T), name='palm')
stand('palm', palm, 19 * T + 12, 15 * T + 28, block=(19, 15, 1, 1))
put('plantE', 'GR', 4, 65, 1, 2, 11, 14, block=(11, 15, 1, 1))
clock = Image.open(os.path.join(ANIM, 'animated_pendulum_clock_32x32.png')).convert('RGBA').crop((0, 0, 32, 96))
place('clock', clock, 1 * T, 9 * T - 96 + 2, block=(1, 8, 1, 1), meta={'anim': 'clock'})
# south strip (row 16) — decor only, pots standing on the floor line
plant_f = comp('G', 6.5 * T, 57.5 * T, limit=(6 * T, 56 * T, T, 3 * T), name='plantF')
stand('plantF', plant_f, 5 * T + 16, SB - 1)
plant_g = comp('G', 7.5 * T, 57.5 * T, limit=(7 * T, 56 * T, T, 3 * T), name='plantG')
stand('plantG', plant_g, 15 * T + 16, SB - 1)

# ---------- Back office ----------
shelf = comp('L', 11 * T, 25.2 * T, limit=(10 * T, 24 * T, 2 * T, 3 * T), name='stockShelf', cut_ok=True)
stand('stockShelf', shelf, 22 * T, 6 * T - 2, block=(21, 5, 2, 1))
fridge = comp('K', 10.5 * T, 39 * T, limit=(10 * T, 37 * T, T, 3.5 * T), name='fridge', cut_ok=True)
stand('fridge1', fridge, 23 * T + 16, 6 * T - 2, block=(23, 5, 1, 1))
stand('fridge2', fridge, 24 * T + 16, 6 * T - 2, block=(24, 5, 1, 1))
crate_a = comp('GR', 1.5 * T, 61 * T, limit=(1 * T, 60 * T, T, 3 * T), name='crateA', cut_ok=True)
crate_b = comp('GR', 2.5 * T, 61 * T, limit=(2 * T, 60 * T, T, 3 * T), name='crateB', cut_ok=True)
boxes = comp('G', 12.5 * T, 60 * T, limit=(12 * T, 58.6 * T, T, 2.6 * T), name='boxes', cut_ok=True)
stand('boxes', boxes, 28 * T + 16, 5 * T + 28, block=(28, 5, 1, 1))
stand('crateA', crate_a, 28 * T + 16, 6 * T + 28, block=(28, 6, 1, 1))
stand('crateB', crate_b, 28 * T + 16, 7 * T + 28, block=(28, 7, 1, 1))
micro('scanner', SCANNER, 28 * T + 22, 7 * T - 4, z=8 * T + 31)

design_desk = ppx('C', 232, 336, 48, 80, 'designDesk')
place('designDesk', design_desk, 21 * T + 8, 10 * T - 80, block=(21, 9, 2, 1))
crm = ppx('L', 100, 356, 58, 56, 'crmDesk')
place('crmDesk', crm, 24 * T + 3, 10 * T - 56 + 2, block=(24, 9, 2, 1))
phone_blue = comp('G', 12.95 * T, 40.0 * T, limit=(12.2 * T, 39.3 * T, 1.4 * T, 1.3 * T), name='crmPhone')
micro('crmPhone', phone_blue, 24 * T + 20, 9 * T + 9, z=10 * T + 2)
micro('stampCards', STAMP_CARDS, 25 * T + 14, 9 * T + 10, z=10 * T + 2)
ops = ppx('L', 160, 358, 64, 48, 'opsDesk', allow=('right',))   # a mirror shelf touches its right edge on the sheet
stand('opsDesk', ops, 28 * T, 10 * T + 2, block=(27, 9, 2, 1))
micro('laptop', LAPTOP, 27 * T + 30, 9 * T + 10, z=10 * T + 2)
put('ledgerDesk', 'C', 5, 1, 2, 2, 21, 12, block=(21, 13, 2, 1))
cabinet = ptile('CO', 14, 10, 2, 2, 'cabinet')
stand('cabinet', cabinet, 25 * T, 15 * T + 30, block=(24, 15, 2, 1))
plant_d = comp('G', 15.5 * T, 29 * T, limit=(15 * T, 27.5 * T, T, 3 * T), name='plantD', cut_ok=True)
stand('plantD', plant_d, 28 * T + 16, 14 * T + 28, block=(28, 14, 1, 1))
bonsai = ptile('G', 14, 63, 1, 2, 'bonsai')
stand('bonsai', bonsai, 27 * T + 16, 15 * T + 28, block=(27, 15, 1, 1))

# --------------------------------------------------------------------------------------
# Stations (where each humanised worker works) and choreography spots
STATIONS = {
    'copilot':     {'tile': [27, 10], 'face': 'up',    'label': 'Admin & Ops Laptop'},
    'xero':        {'tile': [21, 14], 'face': 'up',    'label': 'Timber Ledger Desk'},
    'dext':        {'tile': [27, 7],  'face': 'right', 'label': 'Delivery Crates & Scanner'},
    'deputy':      {'tile': [25, 5],  'face': 'up',    'label': 'Wall Roster Board'},
    'square':      {'tile': [7, 6],   'face': 'down',  'label': 'Front POS Register'},
    'lightspeed':  {'tile': [3, 6],   'face': 'down',  'label': 'Coffee Pickup Pass'},
    'marketman':   {'tile': [12, 6],  'face': 'down',  'label': 'Pastry Case & Coolroom'},
    'ordermentum': {'tile': [21, 6],  'face': 'up',    'label': 'Bean & Milk Shelving'},
    'canva':       {'tile': [21, 10], 'face': 'up',    'label': 'Design Computer'},
    'podium':      {'tile': [19, 7],  'face': 'up',    'label': 'Guest Book & Review Stand'},
    'slang':       {'tile': [17, 5],  'face': 'down',  'label': 'Wall Phone & Booking Stand'},
    'mailchimp':   {'tile': [24, 10], 'face': 'up',    'label': 'Loyalty & CRM Corner'},
}
SPOTS = {
    'barista': {'tile': [4, 6], 'face': 'up'},
    'ownerHub': {'tile': [7, 12], 'face': 'right', 'sit': True},
    'ownerPos': {'tile': [7, 6], 'face': 'down'},
    'ownerPhone': {'tile': [17, 5], 'face': 'up'},
    'ownerDesk': {'tile': [21, 14], 'face': 'up'},
    'approach': [{'tile': [7, 13], 'face': 'up'}, {'tile': [6, 12], 'face': 'right'}, {'tile': [8, 13], 'face': 'up'}],
    'coolroom': {'tile': [23, 6], 'face': 'up'},
    'aframe': {'tile': [14, 2], 'face': 'left'},
    'streetLeft': {'tile': [-1, 1]}, 'streetRight': {'tile': [30, 1]},
    'doorOut': {'tile': [15, 2]}, 'doorIn': {'tile': [15, 5]},
    'doorOut2': {'tile': [16, 2]}, 'doorIn2': {'tile': [16, 5]},
    'staffOut': {'tile': [27, 2]}, 'staffIn': {'tile': [27, 5]},
    'innerDoor': {'tile': list(INNER_DOOR)},
    'queue': [[7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 9], [15, 9]],
    'pickup': [[3, 8], [4, 8], [5, 8], [2, 8]],
    'deliveryDrop': {'tile': [26, 7]},
    'browse': [[12, 9], [9, 9], [16, 8]],
}
DOOR_SPRITE = {'x': 15 * T, 'y': 3 * T - 32, 'w': 64, 'h': 96}
STAFF_DOOR_SPRITE = {'x': 27 * T, 'y': 3 * T, 'w': 32, 'h': 64}
ANIMATED = {
    'clock': {'x': 1 * T, 'y': 9 * T - 96 + 2, 'sheet': 'animated_pendulum_clock_32x32.png', 'fw': 32, 'fh': 96, 'frames': 4, 'fps': 2},
    'cakeFridge': {'x': 13 * T, 'y': 6 * T - 96, 'sheet': 'animated_canteen_fridge_cake_1_32x32.png', 'fw': 32, 'fh': 96, 'frames': 12, 'fps': 10},
}

# ---------- light sources for the renderer (world px) ----------
LIGHTS = {
    # warm pendant glows over the bar, the pass and the pastry case
    'pendants': [[4 * T + 20, 5 * T + 6], [8 * T + 2, 5 * T + 6], [11 * T + 10, 5 * T + 6], [5 * T, 7 * T + 4], [12 * T, 7 * T + 2]],
    # lamps that switch on in the afternoon (floor lamp + back-office desk lamps)
    'lamps': [[LAMP[0] + LAMP[2] // 2, LAMP[1] + 8, 1.0], [22 * T, 9 * T - 6, 0.85], [25 * T, 9 * T - 6, 0.85], [28 * T - 4, 9 * T - 6, 0.85], [22 * T, 12 * T + 4, 0.8]],
    # cool glows from machines and screens
    'glows': [[ESPRESSO[0] + ESPRESSO[2] // 2, ESPRESSO[1] + 10, 22, '#9fd2ff'], [ESPRESSO2[0] + ESPRESSO2[2] // 2, ESPRESSO2[1] + 10, 18, '#9fd2ff'],
              [13 * T + 16, 4 * T, 30, '#d8f2ff'], [21 * T + 30, 8 * T + 2, 20, '#8fe3ff'], [27 * T + 30, 9 * T, 18, '#a4c8ff']],
    'candles': CANDLES,
}
ZONES = {'street': [0, 0, W, 3 * T], 'front': [0, 3 * T, PX0, H], 'back': [PX1, 3 * T, W, H]}

# connectivity check from inside the front door
from collections import deque


def bfs(start):
    seen = {tuple(start)}
    q = deque([tuple(start)])
    while q:
        c, r = q.popleft()
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (c + dc, r + dr)
            if 0 <= n[0] < COLS and 0 <= n[1] < ROWS and walk[n[1]][n[0]] and n not in seen:
                seen.add(n)
                q.append(n)
    return seen


def reachable(tile):
    """a target is fine if it is open & reached, or blocked but next to a reached tile (seats)"""
    t = tuple(tile)
    if t in reach:
        return True
    c, r = t
    return any((c + dc, r + dr) in reach for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)))


reach = bfs(SPOTS['doorIn']['tile'])
problems = []
for k, s in STATIONS.items():
    if tuple(s['tile']) not in reach:
        problems.append(('station', k, s['tile']))
for k, s in SPOTS.items():
    items = s if isinstance(s, list) else [s]
    for it in items:
        t = it['tile'] if isinstance(it, dict) else it
        if 0 <= t[0] < COLS and not reachable(t):
            problems.append(('spot', k, t))
for s in SEATS:
    if not reachable(s['tile']):
        problems.append(('seat', s['tile']))
print('UNREACHABLE:', problems if problems else 'none')
set_walk(0, 16, COLS - 1, 16, 0)

# --------------------------------------------------------------------------------------
# outputs
OUT_ASSETS = os.path.join(PROJECT, 'src', 'assets', 'cafe')
os.makedirs(OUT_ASSETS, exist_ok=True)
ground.save(os.path.join(OUT_ASSETS, 'cafe_ground.png'))
atlas = packer.image()
atlas.save(os.path.join(OUT_ASSETS, 'cafe_objects.png'))

# ---------- fx atlas: animated doors / clock / cake fridge / coffee steam / café cat ----------
FX_SRC = {
    'door': ('animated_door_glass_double_32x32.png', 64, 96, [0, 1, 2, 3, 4]),
    'staffDoor': ('animated_door_1_32x32.png', 32, 64, [0, 1, 2, 3, 4]),
    'innerDoor': ('animated_door_vertical_left_1_32x32.png', 64, 96, [0, 1, 2, 3, 4]),
    'clock': ('animated_pendulum_clock_32x32.png', 32, 96, [0, 1, 2, 3]),
    'cakeFridge': ('animated_canteen_fridge_cake_1_32x32.png', 32, 96, list(range(12))),
    'coffee': ('animated_coffee_32x32.png', 32, 64, list(range(6))),
    'cat': ('animated_cat_32x32.png', 96, 32, list(range(12))),
}
fx_packer = Packer(1024)
FX = {}
for key, (fname, fw, fh, idxs) in FX_SRC.items():
    sheet_img = Image.open(os.path.join(ANIM, fname)).convert('RGBA')
    frames = []
    for i in idxs:
        pos = fx_packer.add(sheet_img.crop((i * fw, 0, (i + 1) * fw, fh)))
        frames.append([pos[0], pos[1], fw, fh])
    FX[key] = frames
fx_packer.image().save(os.path.join(PROJECT, 'src', 'assets', 'cafe', 'cafe_fx.png'))

data = {
    'cols': COLS, 'rows': ROWS, 'tile': T, 'fx': FX,
    'walk': [''.join(str(v) for v in row) for row in walk],
    'objects': objects,
    'windows': [list(w) for w in WINDOWS],
    'stations': STATIONS, 'spots': SPOTS, 'seats': SEATS,
    'door': DOOR_SPRITE, 'staffDoor': STAFF_DOOR_SPRITE, 'innerDoor': INNER_DOOR_SPRITE, 'animated': ANIMATED,
    'aframe': list(AFRAME), 'aframeBoard': AFRAME_BOARD, 'pass': list(PASS), 'pos': list(POS), 'espresso': list(ESPRESSO), 'roster': list(ROSTER),
    'menu': list(MENU), 'phone': [WALL_PHONE_X, 3 * T + 30], 'sign': {'x': 16 * T, 'y': 3 * T + 3},
    'partition': {'x0': PX0, 'x1': PX1, 'gap': list(DOOR_GAP)},
    'cat': CAT, 'lights': LIGHTS, 'zones': ZONES,
}
os.makedirs(os.path.join(PROJECT, 'src', 'sim'), exist_ok=True)
with open(os.path.join(PROJECT, 'src', 'sim', 'cafeMap.json'), 'w') as f:
    json.dump(data, f, separators=(',', ':'))

# preview
preview = ground.copy()
for o in sorted(objects, key=lambda o: o['z']):
    ax, ay, aw, ah = o['a']
    preview.alpha_composite(atlas.crop((ax, ay, ax + aw, ay + ah)), (o['x'], o['y']))
prev_path = next((a for a in sys.argv[1:] if not a.startswith('--')), os.path.join(PROJECT, 'tools', 'cafe', 'preview.png'))
big = preview.resize((W * 2, H * 2), Image.NEAREST)
if '--grid' in sys.argv:
    d = ImageDraw.Draw(big)
    for c in range(COLS):
        for r in range(ROWS):
            if not walk[r][c]:
                d.rectangle([c * 64 + 26, r * 64 + 26, c * 64 + 38, r * 64 + 38], outline=(255, 0, 0, 255))
    for c in range(COLS + 1):
        d.line([c * 64, 0, c * 64, H * 2], fill=(255, 255, 255, 40))
    for r in range(ROWS + 1):
        d.line([0, r * 64, W * 2, r * 64], fill=(255, 255, 255, 40))
big.save(prev_path)
print('objects', len(objects), 'atlas', atlas.size, '->', prev_path)
if LINT:
    print('CROP LINT FAILED:')
    for l in LINT:
        print('  -', l)
    if '--no-lint' not in sys.argv:
        sys.exit(1)
else:
    print('CROP LINT: every crop is clean')
