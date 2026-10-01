# KUPRAVA CREATIVE · Miranda Kuprava

Portfolio site for Miranda Kuprava, built from her reference design (`source/reference_design.png`)
and the material she emailed to contact@giorgi.codes.

## Run it

Double-click `start-site.bat`, or:

```
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` writes a static site to `dist/` that can be hosted anywhere.

## Folders

- `source/` – everything Miranda sent, untouched: `email/` (attachments grouped by email), `email/documents/` (PDF proposals and zips), `zips_extracted/`.
- `public/art/`, `public/docs/` – web-sized images, PDFs and rendered PDF pages (generated).
- `src/content.json` – which works go in which section (generated).
- `tools/build_assets.py` – regenerates the two above from `source/`. Edit the section lists there, then run `python tools/build_assets.py` (needs Pillow and PyMuPDF).
- `src/i18n.js` – EN / GE / FR / JP text.

## What Miranda asked for

Sources: her emails to contact@giorgi.codes, the WhatsApp chat (`source/whatsapp/chat.txt`, exported 1 Oct 2026) and her voice notes (`source/whatsapp/*.ogg`; machine transcripts in `voice_transcripts_*.md` are rough, Georgian speech recognition is weak).

From WhatsApp:
- **Home page = her reference image**, with every direction as a planet that opens into its projects.
- **Ten planets, in her order:** Sculpture / Artworks, Public Art, Outdoor Objects, Christmas Trees, Kinetic / Automotive, Spaces & Worlds, Functional Art, Brand Concepts, Works with Melita, Competitions / Submissions.
- **On entering, KUPRAVA climbs the K's staircase letter by letter.**
- **Opening render:** Merani rising out of darkness, headlights lighting up, with a Ferrari engine sound. She would like a short video here later. The site uses her dark Merani render and a synthesized engine; put a real recording at `public/audio/merani-engine.mp3` to replace it.
- **"Super modern" site**, visually led. She would like an **interactive 3D model** later.
- **XPENG / VW / Geely (and Ferrari, Wendy's) concepts must read as independent conceptual proposals**, never as official collaborations.
- **Melita collaborations kept separate with clear credits.**
- **About:** short bio, music → PR / public culture → contemporary art, with her papier-mâché method highlighted. (The text on the site is a draft built only from that line; Miranda should expand it.)
- **Contact:** professional email, Instagram (not sent yet) and a downloadable portfolio / CV (the Artworks PDF is used for now).
- **Some of her biggest projects can't be published yet** (still in negotiation); only what she sent is on the site. News / exhibitions only once their status allows.
- Domain: **kupravacreative.com** (she already has it).

From email (section texts and placement):
- Functional Art: her intro + Lighting, Chandeliers, Furniture, Paper & Light (Balenciaga paper lights with her exact caption).
- Brand Concepts: her intro; "put Merani here, and Wendy's too".
- Works with Melita: her intro (began with Nine Lives).
- Competitions / Submissions: The Man Who Was a Shadow (Amsterdam Light Festival 16) and The Deafening Silence.
- Christmas: "the Christmas tree files will be combined together".

Decisions made without her input (worth confirming):
- Emails with only photos (colour rabbits, ceramic rabbits, chairs/chandeliers) were placed by subject.
- Public Art holds Children's Park (Shanghai) and Pinocchios' Library (NYC); Spaces & Worlds holds Wine & Art and Tsinandali.
- GE / FR / JP translations are drafts to proofread.
