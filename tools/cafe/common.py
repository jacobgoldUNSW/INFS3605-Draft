"""Shared helpers for the Brewmind café asset compiler.

Everything here works on LimeZu "Modern Interiors" 32x32 sheets. Coordinates are in
tiles unless a name ends in `_px`. Nothing is guessed at runtime: the compiler bakes
layers + an atlas + a JSON map that the React simulation reads.
"""
import os
from PIL import Image

T = 32
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.abspath(os.path.join(HERE, '..', '..'))
ASSETS = os.environ.get('BREWMIND_ASSETS') or os.path.abspath(os.path.join(PROJECT, '..', 'Assets', 'moderninteriors-win'))
INTERIORS = os.path.join(ASSETS, '1_Interiors', '32x32')
SORTER = os.path.join(INTERIORS, 'Theme_Sorter_32x32')
ROOMB = os.path.join(INTERIORS, 'Room_Bulder_subfiles_32x32')  # (sic) LimeZu's folder spelling
ANIM = os.path.join(ASSETS, '3_Animated_objects', '32x32', 'spritesheets')
CHARGEN = os.path.join(ASSETS, '2_Characters', 'Character_Generator')

SHEETS = {
    'K': os.path.join(SORTER, '12_Kitchen_32x32.png'),
    'G': os.path.join(SORTER, '1_Generic_32x32.png'),
    'C': os.path.join(SORTER, '5_Classroom_and_library_32x32.png'),
    'GR': os.path.join(SORTER, '16_Grocery_store_32x32.png'),
    'L': os.path.join(SORTER, '2_LivingRoom_32x32.png'),
    'CF': os.path.join(SORTER, '13_Conference_Hall_32x32.png'),
    'B': os.path.join(SORTER, '10_Birthday_party_32x32.png'),
    'AR': os.path.join(SORTER, '7_Art_32x32.png'),
    'CO': os.path.join(SORTER, '26_Condominium_32x32.png'),
    'IC': os.path.join(SORTER, '24_Ice_Cream_Shop_32x32.png'),
    'FLOOR': os.path.join(ROOMB, 'Room_Builder_Floors_32x32.png'),
    'WALL': os.path.join(ROOMB, 'Room_Builder_Walls_32x32.png'),
}

_cache = {}


def sheet(key):
    path = SHEETS.get(key, key)
    if path not in _cache:
        _cache[path] = Image.open(path).convert('RGBA')
    return _cache[path]


def tiles(key, tx, ty, tw=1, th=1):
    """Tile-aligned crop (keeps transparent padding so grid alignment is preserved)."""
    return sheet(key).crop((tx * T, ty * T, (tx + tw) * T, (ty + th) * T))


def px(key, x, y, w, h):
    return sheet(key).crop((x, y, x + w, y + h))


def bbox(img):
    return img.getchannel('A').getbbox()


def hstack(*imgs):
    w = sum(i.size[0] for i in imgs)
    h = max(i.size[1] for i in imgs)
    out = Image.new('RGBA', (w, h))
    x = 0
    for i in imgs:
        out.alpha_composite(i, (x, h - i.size[1]))
        x += i.size[0]
    return out


def vstack(*imgs):
    w = max(i.size[0] for i in imgs)
    h = sum(i.size[1] for i in imgs)
    out = Image.new('RGBA', (w, h))
    y = 0
    for i in imgs:
        out.alpha_composite(i, (0, y))
        y += i.size[1]
    return out


def layer_onto(base, top, x=0, y=0):
    """alpha-composite `top` onto a copy of `base` at (x, y), clipping to base."""
    out = base.copy()
    out.alpha_composite(top, (x, y))
    return out


def tint(img, rgb, amount):
    """Blend opaque pixels toward rgb (keeps alpha)."""
    r, g, b = rgb
    src = img.load()
    out = img.copy()
    dst = out.load()
    for yy in range(img.size[1]):
        for xx in range(img.size[0]):
            p = src[xx, yy]
            if p[3]:
                dst[xx, yy] = (round(p[0] + (r - p[0]) * amount), round(p[1] + (g - p[1]) * amount),
                               round(p[2] + (b - p[2]) * amount), p[3])
    return out


def recolor(img, mapping):
    """Exact-colour palette swap. mapping: {(r,g,b): (r,g,b)}"""
    out = img.copy()
    d = out.load()
    for yy in range(out.size[1]):
        for xx in range(out.size[0]):
            p = d[xx, yy]
            if p[3]:
                k = p[:3]
                if k in mapping:
                    d[xx, yy] = (*mapping[k], p[3])
    return out


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Packer:
    """Shelf packer for the object atlas."""

    def __init__(self, width=1024, pad=1):
        self.w, self.pad = width, pad
        self.x = self.y = self.row_h = 0
        self.items = []

    def add(self, img):
        w, h = img.size
        if self.x + w + self.pad > self.w:
            self.x, self.y, self.row_h = 0, self.y + self.row_h + self.pad, 0
        pos = (self.x, self.y)
        self.items.append((img, pos))
        self.x += w + self.pad
        self.row_h = max(self.row_h, h)
        return pos

    def image(self):
        h = self.y + self.row_h + self.pad
        h = (h + 31) // 32 * 32
        out = Image.new('RGBA', (self.w, h))
        for img, pos in self.items:
            out.alpha_composite(img, pos)
        return out
