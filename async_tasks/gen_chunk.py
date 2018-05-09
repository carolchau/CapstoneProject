import sys, json, io, base64, os
from math import floor
from PIL import Image

gen_key_map = {
    0: 'sand',
    1: 'water',
    2: 'snow',
    3: 'jungle',
    4: 'swamp',
    5: 'grass'
}
biomes = {
    'sand': Image.open('public/img/Sand.png'),
    'water': Image.open('public/img/Water.png'),
    'snow': Image.open('public/img/Snow.png'),
    'jungle': Image.open('public/img/Jungle.png'),
    'swamp': Image.open('public/img/Swamp.png'),
    'grass': Image.open('public/img/Grass.png')
}

with open('public/js/graphics/gen2k.json') as f:
    gen_key = json.load(f)
gen_img_size = len(gen_key)

chunk_size = int(sys.argv[1])
unit = int(sys.argv[2])
world_size = int(sys.argv[3])
num_chunks = world_size*unit/chunk_size

if not os.path.exists('public/img/chunks'):
    os.mkdir('public/img/chunks');
for i in xrange(num_chunks):
    for j in xrange(num_chunks):
        chunk_id = str(i) + ',' + str(j)
        chunk = Image.new('RGB', (chunk_size, chunk_size))
        left= i*chunk_size
        top = j*chunk_size
        for x in xrange(left, left+chunk_size, unit):
            for y in xrange(top, top+chunk_size, unit):
                genx = int(floor(gen_img_size*(x/unit)/world_size))
                geny = int(floor(gen_img_size*(y/unit)/world_size))
                if genx > gen_img_size or geny > gen_img_size:
                    break
                gen_val = gen_key[genx][geny]
                chunk.paste(biomes[gen_key_map[gen_val]],(x-left, y-top, (x-left)+unit, (y-top)+unit))
        chunk.save('public/img/chunks/' + chunk_id + '.jpg')

