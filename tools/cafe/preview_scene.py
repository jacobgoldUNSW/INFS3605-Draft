"""Visual verification: compose ground + Y-sorted objects + characters exactly the way the
runtime renderer does, with every worker at their station, so occlusion/alignment can be
checked in a PNG before anything ships."""
import json
import os
import sys
from PIL import Image

from common import PROJECT

A = os.path.join(PROJECT, 'src', 'assets', 'cafe')
MAP = json.load(open(os.path.join(PROJECT, 'src', 'sim', 'cafeMap.json')))
CH = json.load(open(os.path.join(PROJECT, 'src', 'sim', 'cafeChars.json')))
ground = Image.open(os.path.join(A, 'cafe_ground.png')).convert('RGBA')
atlas = Image.open(os.path.join(A, 'cafe_objects.png')).convert('RGBA')
chars = Image.open(os.path.join(A, 'cafe_chars.png')).convert('RGBA')
T = 32
FEET = 4          # feet sit this many px above the tile's bottom edge
SIT_DY = -4       # sitting sprites are nudged so the body lands on the chair seat
DIRS = {'right': 0, 'up': 1, 'left': 2, 'down': 3}


def frame(name, anim, face='down', f=0):
    meta = CH['chars'][name]
    y0 = meta['y']
    d = DIRS[face]
    staff = meta['kind'] == 'staff'
    if anim == 'idle':
        row, col = 0, d * 6 + f % 6
    elif anim == 'walk':
        row, col = 0, 24 + d * 6 + f % 6
    elif anim == 'sit':
        row, col = (3 if staff else 1), (0 if face == 'right' else 6) + f % 6
    elif anim == 'sit2':
        row, col = (3 if staff else 1), 36 + (0 if face == 'right' else 6) + f % 6
    elif anim == 'phone':
        row, col = (3 if staff else 1), 12 + 4 + f % 6
    elif anim == 'book':
        row, col = (3 if staff else 1), 24 + 1 + f % 6
    else:
        raise ValueError(anim)
    return chars.crop((col * 32, y0 + row * 64, col * 32 + 32, y0 + row * 64 + 64))


def actor(name, tile, face='down', anim='idle', f=0, dy=0):
    c, r = tile
    feet_y = r * T + T - FEET
    img = frame(name, anim, face, f)
    x = c * T
    y = feet_y - 64 + FEET + dy + (SIT_DY if anim in ('sit', 'sit2') else 0)
    return {'img': img, 'x': x, 'y': y, 'z': feet_y + 0.5}


fx = Image.open(os.path.join(A, 'cafe_fx.png')).convert('RGBA')
def fxf(key, i=0):
    r = MAP['fx'][key][i]
    return fx.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
items = []
for o in MAP['objects']:
    ax, ay, aw, ah = o['a']
    anim = o.get('m', {}).get('anim')
    if anim:
        a = MAP['animated'][anim]
        items.append({'img': fxf(anim), 'x': a['x'], 'y': a['y'], 'z': o['z']})
        continue
    items.append({'img': atlas.crop((ax, ay, ax + aw, ay + ah)), 'x': o['x'], 'y': o['y'], 'z': o['z']})
if MAP.get('cat'):
    c = MAP['cat']
    items.append({'img': fxf('cat'), 'x': c['x'], 'y': c['y'], 'z': c['z']})

st = MAP['stations']
anims = {'xero': 'book', 'deputy': 'book', 'slang': 'idle', 'podium': 'phone', 'dext': 'phone'}
for wid, s in st.items():
    items.append(actor(wid, s['tile'], s['face'], anims.get(wid, 'idle')))
sp = MAP['spots']
hub = sp['ownerHub']
items.append(actor('owner', hub['tile'], hub['face'], 'sit2' if hub.get('sit') else 'idle'))
items.append(actor('barista', sp['barista']['tile'], 'up'))
for i, t in enumerate(sp['queue'][:4]):
    items.append(actor(f'cust{i + 1}', t, 'up' if i == 0 else 'left'))
items.append(actor('cust5', sp['pickup'][0], 'up'))
for i, seat in enumerate(MAP['seats']):
    if i % 2 == 0 or seat.get('lounge'):
        items.append(actor(f'cust{6 + i}', seat['tile'], seat['face'], 'sit2' if seat.get('lounge') else 'sit'))
items.append(actor('cust9', [5, 1], 'right', 'walk', 2))
items.append(actor('courier', [24, 1], 'left', 'walk', 4))

scene = ground.copy()
for key, spr in (('door', MAP['door']), ('staffDoor', MAP['staffDoor']), ('innerDoor', MAP.get('innerDoor'))):
    if spr:
        scene.alpha_composite(fxf(key), (spr['x'], spr['y']))
for it in sorted(items, key=lambda i: i['z']):
    scene.alpha_composite(it['img'], (int(it['x']), int(it['y'])))
scale = int(sys.argv[2]) if len(sys.argv) > 2 else 2
out = scene.resize((scene.size[0] * scale, scene.size[1] * scale), Image.NEAREST)
out.save(sys.argv[1] if len(sys.argv) > 1 else os.path.join(PROJECT, 'tools', 'cafe', 'scene.png'))
print('ok', out.size)
