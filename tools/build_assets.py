"""Turn Miranda's raw files in source/ into web-ready assets + src/content.json.

Run:  python tools/build_assets.py
"""
import json, os, re, shutil, glob
from PIL import Image, ImageOps
import fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source')
PUB = os.path.join(ROOT, 'public')
EM = os.path.join(SRC, 'email')
ZX = os.path.join(SRC, 'zips_extracted')
DOCS = os.path.join(EM, 'documents')
PHOTOS = os.path.join(ZX, 'KUPRAVA_CREATIVE_FINAL_PHOTOS_UNDER_25MB', 'KUPRAVA_CREATIVE_FINAL_PHOTOS')
FUNC = os.path.join(ZX, 'KUPRAVA_CREATIVE_FUNCTIONAL_ART_IMAGES')
MEL = os.path.join(ZX, 'KUPRAVA_CREATIVE_WORKS_WITH_MELITA', 'WORKS_WITH_MELITA')
OUT = os.path.join(ZX, 'KUPRAVA_CREATIVE_OUTDOOR_OBJECTS', 'OUTDOOR_OBJECTS')


def g(folder, *prefixes):
    """Files in folder whose name starts with any prefix, in prefix order."""
    names = sorted(os.listdir(folder))
    out = []
    for p in prefixes:
        out += [os.path.join(folder, n) for n in names if n.upper().startswith(p.upper())]
    return out


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


done = {}


def img(path, section, name):
    """Write a large + thumb JPG, return dict for the site."""
    key = (path, section)
    if key in done:
        return done[key]
    d = os.path.join(PUB, 'art', section)
    os.makedirs(d, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = im.size
    big = im.copy(); big.thumbnail((2000, 2000), Image.LANCZOS)
    big.save(os.path.join(d, name + '.jpg'), quality=84, optimize=True, progressive=True)
    th = im.copy(); th.thumbnail((720, 720), Image.LANCZOS)
    th.save(os.path.join(d, name + '-t.jpg'), quality=78, optimize=True, progressive=True)
    r = {'src': f'art/{section}/{name}.jpg', 'thumb': f'art/{section}/{name}-t.jpg', 'w': big.width, 'h': big.height}
    done[key] = r
    return r


pdf_cache = {}


def doc(fname, title):
    """Copy PDF, render every page to JPG, return doc dict."""
    if fname in pdf_cache:
        return pdf_cache[fname]
    s = slug(title)
    d = os.path.join(PUB, 'docs', s)
    os.makedirs(d, exist_ok=True)
    shutil.copy2(os.path.join(DOCS, fname), os.path.join(PUB, 'docs', s + '.pdf'))
    pdf = fitz.open(os.path.join(DOCS, fname))
    pages = []
    for i, p in enumerate(pdf):
        z = 1700 / max(p.rect.width, p.rect.height)
        pix = p.get_pixmap(matrix=fitz.Matrix(z, z))
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        fn = f'{i + 1:02d}.jpg'
        im.save(os.path.join(d, fn), quality=80, optimize=True, progressive=True)
        th = im.copy(); th.thumbnail((640, 640))
        th.save(os.path.join(d, f'{i + 1:02d}-t.jpg'), quality=74, optimize=True)
        pages.append({'src': f'docs/{s}/{fn}', 'thumb': f'docs/{s}/{i + 1:02d}-t.jpg', 'w': im.width, 'h': im.height})
    r = {'title': title, 'pdf': f'docs/{s}.pdf', 'pages': pages,
         'sizeMB': round(os.path.getsize(os.path.join(DOCS, fname)) / 1e6, 1)}
    pdf_cache[fname] = r
    return r


def imgs(paths, section, base):
    return [img(p, section, f'{base}-{i + 1:02d}') for i, p in enumerate(paths)]


def pages(d, idx):
    return [d['pages'][i] for i in idx]


content = {'sections': []}
S = content['sections']

# ---------------------------------------------------------------- SCULPTURE
works = [
    ('01_INCITATUS', 'Incitatus'), ('02_BLUE_HORSE', 'Blue Horse'), ('03_DICTATORS_FATE', "Dictator's Fate"),
    ('04_DOGS', 'Dogs'), ('05_BULL', 'Bull'), ('06_GEN_Z', 'Gen Z'), ('07_SACRIFICE', 'Sacrifice'),
    ('08_IPHIGENIA', 'Iphigenia'), ('09_WOMAN', 'Woman'), ('10_THE_GAZE_OF_GOD', 'The Gaze of God'),
    ('11_MAN_WITH_A_LANTERN', 'Man with a Lantern'), ('12_MEDEA', 'Medea'), ('13_HECATE', 'Hecate'),
    ("14_DONT_EAT_GOLDFISH", "Don't Eat Goldfish"), ('15_PIXEL', 'Pixel'), ('16_BLACK_CAT', 'Black Cat'),
    ('17_MADAME_BUTTERFLY', 'Madame Butterfly'), ('18_ANGRY_PUPPY', 'Angry Puppy'), ('19_HORSE', 'Horse'),
    ('20_YOUNG_HORSE', 'Young Horse'),
]
projects = []
for folder, title in works:
    files = sorted(glob.glob(os.path.join(PHOTOS, folder, '*')))
    extra = []
    if folder == '01_INCITATUS':
        extra = g(os.path.join(EM, 't01_images'), 'FE85CBEE')
    projects.append({'title': title, 'images': imgs(files + extra, 'sculpture', slug(title))})
projects.append({'title': 'Ceramic Rabbits', 'kicker': 'Series',
                 'images': imgs(g(os.path.join(EM, 't01_images'), '1A2F38BF', '4A9C4472', 'C3B90351', 'C44D016E', 'DE2C3835', 'EDE66AB5', 'F760D814'), 'sculpture', 'ceramic-rabbits')})
projects.append({'title': 'Rabbits', 'kicker': 'Series · interior studies',
                 'images': imgs(g(os.path.join(EM, 't00_images'), '551CCDBD', '7F129E16', 'EDA61C73', '2A4EA603', 'CB8DB2C7', '42FBF0D1', 'BBC61715', '92B77E94', '0C4F2521', 'C8B40BF4', 'B489912E', 'F2B8AC57'), 'sculpture', 'rabbits')})
WA = os.path.join(SRC, 'whatsapp')
_orig_doc = doc


def doc(fname, title):  # noqa: F811 - also look in the WhatsApp folder
    if not os.path.exists(os.path.join(DOCS, fname)):
        shutil.copy2(os.path.join(WA, fname), os.path.join(DOCS, fname))
    return _orig_doc(fname, title)


IND = 'Independent conceptual proposal'
artworks = doc('KUPRAVA_CREATIVE_ARTWORKS_FINAL_GENZ_4_PHOTOS.pdf', 'Artworks Portfolio')
S.append({'id': 'sculpture', 'doc': artworks, 'projects': projects})

# ---------------------------------------------------------------- PUBLIC ART
park = doc('CHILDRENS_PARK_OF_IMAGINATION_SHANGHAI_FINAL_FOR_JIN_WEIQING.pdf', "Children's Park of Imagination")
pino = doc('PINOCCHIOS_LIBRARY_NEW_YORK_FINAL_NO_WEBSITE.pdf', "Pinocchios' Library")
S.append({'id': 'public', 'projects': [
    {'title': "Children's Park of Imagination", 'kicker': 'Shanghai · public park concept',
     'credit': 'Original idea: Melita Iosava · Concept & artistic direction: Miranda Kuprava',
     'text': 'A real place for children’s ideas. “I believe children’s drawings should not disappear in drawers. They can become sculptures, places, furniture, lights, gardens and even architecture.” (Melita Iosava, 12)',
     'images': pages(park, [0, 3, 5, 8, 11, 14]), 'doc': park},
    {'title': "Pinocchios' Library", 'kicker': 'New York City · public library concept',
     'credit': 'Original thought & first drawing: Melita Iosava · Project author, artist & designer: Miranda Kuprava',
     'text': '“As many Pinocchios can exist as there are logs, if there is someone who can carve a person out of a log.” A child’s thought and drawing became the starting point for an artist’s library.',
     'images': pages(pino, [0, 3, 6, 9, 12, 15]), 'doc': pino},
]})

# ---------------------------------------------------------------- OUTDOOR OBJECTS
S.append({'id': 'outdoor', 'projects': [
    {'title': 'Outdoor Objects', 'kicker': 'Gardens · terraces · courtyards · pools',
     'images': imgs(sorted(glob.glob(os.path.join(OUT, '*'))), 'outdoor', 'outdoor')},
]})

# ---------------------------------------------------------------- CHRISTMAS TREES
trees = doc('KUPRAVA_CREATIVE_CHRISTMAS_TREE_PROPOSALS_2026_CORRECTED.pdf', 'Christmas Tree Proposals')
dali = doc('KUPRAVA_CREATIVE_HOMAGE_TO_SALVADOR_DALI_INTERNATIONAL_PROPOSAL.pdf', 'Homage to Salvador Dali')
xmas = doc('KUPRAVA_CREATIVE_CHRISTMAS_ART_COMPLETED_WORKS_FINAL_HQ_20MB.pdf', 'Art at the Centre of Christmas')
S.append({'id': 'christmas', 'projects': [
    {'title': 'Art at the Centre of Christmas', 'kicker': 'Completed works · The Promise of Tomorrow · Illuminated Figure',
     'text': 'Two sculptural Christmas works conceived as art objects first and seasonal installations second. The surrounding environment adapts to the space; the original sculptures remain the focal point.',
     'images': pages(xmas, [3, 4, 6, 7, 10, 13, 14, 15]), 'doc': xmas},
    {'title': 'Christmas Tree Proposals', 'kicker': 'Three sculptural concepts',
     'text': 'Three original Christmas installations conceived for a monumental, brick-vaulted hospitality interior, each with its own night identity.',
     'images': pages(trees, [0, 3, 6, 9, 12, 15]), 'doc': trees},
    {'title': 'Homage to Salvador Dalí', 'kicker': 'Christmas sculpture proposal',
     'text': 'An elongated golden silhouette, sculptural lips, egg-like forms and butterflies transform the traditional Christmas tree into a monumental art object: theatrical, luminous and deliberately unexpected.',
     'images': pages(dali, list(range(len(dali['pages'])))), 'doc': dali},
]})

# ---------------------------------------------------------------- KINETIC / AUTOMOTIVE
space = doc('KUPRAVA_CREATIVE_SPACE_AGE_DUBAI_HIGH_QUALITY.pdf', 'Space Age')
merani = doc('KUPRAVA_CREATIVE_MERANI_FERRARI_PROPOSAL_FINAL_EMAIL_FIXED.pdf', 'Merani')
merani_hero = img(os.path.join(WA, 'merani_dark_p8.jpeg'), 'kinetic', 'merani-hero')
S.append({'id': 'kinetic', 'projects': [
    {'title': 'Merani', 'kicker': IND + ' · inspired by Ferrari design',
     'text': 'Born from the meeting of Ferrari design and Nikoloz Baratashvili’s poem “Merani”, where the horse becomes an image of freedom, sacrifice and the courage to open an untrodden path. Original concept and hand-sculpted model by Miranda Kuprava.',
     'images': [merani_hero] + pages(merani, [3, 5, 6, 8, 11, 12]), 'doc': merani},
    {'title': 'Space Age', 'kicker': 'Kinetic monument · Dubai',
     'text': 'A kinetic sculpture inspired by the visual memory of the 1960s Space Age. Independently moving rings orbit a luminous central structure; in Christmas mode the whole work becomes a celebration of light.',
     'images': pages(space, [3, 2, 4, 5, 6]), 'doc': space},
    {'title': 'From One Root, Every Future', 'kicker': IND + ' for XPENG · kinetic tree',
     'text': 'The tree is not decoration. It is a spatial metaphor of evolution: root as origin and energy, central spine as intelligence, spiral roads as mobility, orbital nodes as transition, and the upper air-space as the point where movement becomes three-dimensional. Road → intelligence → physical AI → flight.',
     'images': imgs([os.path.join(WA, 'WhatsApp Image 2026-10-01 at 13.18.16.jpeg')], 'kinetic', 'xpeng-tree')},
    {'title': 'Automotive Tree', 'kicker': IND + ' · technological sculptural tree',
     'text': 'A sculptural tree conceived as a dialogue between automotive engineering and seasonal ritual, designed for showroom and atrium scale.',
     'images': imgs(g(os.path.join(EM, 't19_kinetic_automotive'), 'B66D4D8F', '456C321A'), 'kinetic', 'automotive-tree')},
]})

# ---------------------------------------------------------------- SPACES & WORLDS
wine = doc('KUPRAVA_CREATIVE_WINE_ESTATES_2026_REORDERED_CLEAN.pdf', 'Vitis Vinifera')
tsin = doc('KUPRAVA_CREATIVE_TSINANDALI_CHILD_IMAGINATION.pdf', 'Tsinandali')
S.append({'id': 'spaces', 'projects': [
    {'title': 'Wine & Art · Vitis Vinifera', 'kicker': 'Collectible art & lighting for wine estates, châteaux and wineries',
     'text': 'A singular sculptural object built around an old grapevine, the central and irreplaceable element of the work. Functional art and site-specific design for European wine estates.',
     'images': pages(wine, [0, 2, 3, 4, 5, 6]), 'doc': wine},
    {'title': 'Sculpting a Child’s Imagination', 'kicker': 'Tsinandali · exhibition & outdoor sculpture space',
     'credit': 'Miranda Kuprava × Melita Iosava',
     'text': 'The adult author does not “correct” the child’s figures: proportion, movement, strange form and colour remain untouched. That raw precision is the work’s main value.',
     'images': pages(tsin, list(range(len(tsin['pages'])))), 'doc': tsin},
]})

# ---------------------------------------------------------------- FUNCTIONAL ART
t03 = os.path.join(EM, 't03_functional_art'); t04 = os.path.join(EM, 't04_images'); t09 = os.path.join(EM, 't09_functional_art_sections'); t02 = os.path.join(EM, 't02_balenciaga_paper')
S.append({'id': 'functional', 'subsections': True, 'projects': [
    {'title': 'Sculptural Lighting', 'kicker': '01 — Lighting', 'key': 'lighting',
     'images': imgs(g(FUNC, '09_', '10_', '11_', '12_', '07_', '08_', '16_', '15_', '17_', '18_', '05_', '06_', '20_', '19_') +
                    g(t03, '533685B0', '7B291A21') + g(t04, '026FF70F', 'BAC792FB'), 'functional', 'lighting')},
    {'title': 'Sculptural Chandeliers', 'kicker': '02 — Chandeliers', 'key': 'chandeliers',
     'images': imgs(g(FUNC, '13_') + g(t03, '429F0219', 'C2FF1B93') + g(t04, '3B1ED93E', '138E2452', '256889CC') + g(t09, '945C8834'), 'functional', 'chandeliers')},
    {'title': 'Sculptural Furniture', 'kicker': '03 — Furniture', 'key': 'furniture',
     'images': imgs(g(FUNC, '01_', '02_', '03_', '04_') + g(t09, '403340B4', '558D47C6', '9ED56547', '27E59286', '9807136A', '9A429744', '30BF6A6A', 'D3FE57D5', 'B74964AC') +
                    g(t04, 'A1226C56', '2C85E486', '70541661', '714F7280', '2D3E12D3', 'B61BCCCD', '3B952B19'), 'functional', 'furniture')},
    {'title': 'Balenciaga Paper Lights', 'kicker': '04 — Paper & Light', 'key': 'paper',
     'text': 'Sculptural lighting objects created from original Balenciaga paper. The material is neither painted nor recolored; its existing graphic language becomes part of the artwork.',
     'images': imgs(g(t02, '152BCB73', 'B8BDFA03', '6AC16FB9', 'A27BFEAC', '7B3F890C', 'IMG_1612', 'IMG_6568', 'IMG_6140', 'IMG_7022'), 'functional', 'balenciaga-paper')},
]})

# ---------------------------------------------------------------- BRAND CONCEPTS
wendys = doc('WENDYS_CHINA_FINAL_HQ_23MB.pdf', "Wendy's China")
S.append({'id': 'brand', 'projects': [
    {'title': 'Merani', 'kicker': IND + ' · Ferrari × Georgian Romanticism',
     'text': 'Every great design begins with an emotion. An original concept and hand-sculpted model uniting the language of Ferrari design with the Georgian poem “Merani”.',
     'images': pages(merani, [0, 2, 4, 6, 9, 10]), 'doc': merani},
    {'title': "Wendy's / China", 'kicker': IND + ' · from packaging to papier-mâché',
     'text': "Ecological, educational and functional art: used Wendy's paper is collected, transformed into papier-mâché and returned to the restaurants as tables, lamps and public art.",
     'images': pages(wendys, [0, 2, 4, 6, 8]), 'doc': wendys},
]})

# ---------------------------------------------------------------- WORKS WITH MELITA
mel = sorted(os.listdir(MEL))
mel_files = [os.path.join(MEL, n) for n in mel if not n.startswith('IMG_7107')]
S.append({'id': 'melita', 'projects': [
    {'title': 'Drawings made real', 'kicker': 'Miranda Kuprava × Melita Iosava',
     'credit': 'Ideas and drawings: Melita Iosava · Artworks: Miranda Kuprava',
     'images': imgs(mel_files, 'melita', 'melita')},
    {'title': 'Also with Melita', 'kicker': 'Projects that began with Melita’s drawings',
     'text': "Children's Park of Imagination (Shanghai) and Pinocchios' Library (New York) in Public Art, the Tsinandali exhibition in Spaces & Worlds, and The Deafening Silence, which grew from Melita’s drawing Freedom, in Competitions / Submissions.",
     'images': [park['pages'][0], pino['pages'][0], tsin['pages'][0]]},
]})

# ---------------------------------------------------------------- COMPETITIONS / SUBMISSIONS
silence = doc('KUPRAVA_CREATIVE_THE_DEAFENING_SILENCE_FINAL_CONTACT.pdf', 'The Deafening Silence')
t05 = os.path.join(EM, 't05_public_art_shadow_amsterdam')
S.append({'id': 'competitions', 'projects': [
    {'title': 'The Man Who Was a Shadow', 'kicker': 'Light sculpture · submitted to Amsterdam Light Festival, Edition 16, 2027–2028',
     'text': 'A bronze-toned figure whose head is a lamp: he lights the street for others while his own face stays in shadow.',
     'images': imgs(g(t05, '7BCF858A', 'IMG_6961', '8C3C3E48', '63CA44AB'), 'competitions', 'man-who-was-a-shadow')},
    {'title': 'The Deafening Silence', 'kicker': 'Public art / light & sound installation · competition submission, Germany, 2026',
     'credit': 'Concept & artistic direction: Miranda Kuprava · Original inspiration: Melita Iosava’s drawing Freedom',
     'text': 'Dedicated to the children affected by the war in Ukraine. Child-sized, faceless figures stand within a field of light, each holding a balloon. Made from unpainted fiberglass, all visible colour is created by light. The installation unfolds in three acts: everyday city life, the sudden interruption of an air-raid siren, and finally silence accompanied by Mahler’s Kindertotenlieder.',
     'images': pages(silence, list(range(len(silence['pages'])))), 'doc': silence},
]})

content['intro'] = merani_hero
os.makedirs(os.path.join(ROOT, 'src'), exist_ok=True)
with open(os.path.join(ROOT, 'src', 'content.json'), 'w', encoding='utf-8') as f:
    json.dump(content, f, ensure_ascii=False, indent=1)
n = sum(len(p['images']) for s in S for p in s['projects'])
print('sections', len(S), 'images', n, 'docs', len(pdf_cache))
