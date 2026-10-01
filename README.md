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
- `src/hero.js` – the home page, drawn in the pixel coordinates of Miranda's reference image (1672 × 941): staircase, orbits, construction lines, painted moons and the ten planet links. `src/cosmos.js` is the galaxy behind it.
- The K itself is traced from the reference: `python tools/trace_k.py [reference image]` (needs Pillow, numpy, scipy; defaults to `source/reference_design.png`) follows the direction of its threads and samples its colours into `src/k-threads.json`, which `src/k-threads.js` draws as crisp lines at the screen's resolution. Re-run it if the reference changes.
- `src/intro.js` – the opening scene (WebGL shader over the Merani render, 2D canvas fallback). Its timing comes from `src/engine-timeline.js`, which the sound is built from too, so picture and engine stay in step.
- `public/audio/merani-engine.mp3` – the opening sound, rendered by `node tools/build_engine_audio.mjs <sprite.m4a> <sprite.json>` (needs ffmpeg; see the file for where the recording comes from).

## Opening sound

A real recording, not a synth: a Mercedes-AMG C63 (6.2 V8) by Pole Position Production from the free
Sonniss #GameAudioGDC 2020 bundle (royalty-free, commercial use allowed, no attribution required:
https://sonniss.com/gdc-bundle-license/). The clip was taken from the processed version in
github.com/yassinsolim/personal-portfolio (`static/sounds/race/amg-c63-507`), using only its recorded parts
(start-up, idle, full-load and overrun loops). The start, the two blips and the pull to the limiter are cut and
resampled from those. No free Ferrari recording was reachable; to use one, replace the mp3 (keep it about 9 s with
the engine firing at 0.8 s, or edit `src/engine-timeline.js` to match).

## What Miranda asked for

Sources: her emails to contact@giorgi.codes, the WhatsApp chat (`source/whatsapp/chat.txt`, exported 1 Oct 2026) and her voice notes (`source/whatsapp/*.ogg`; machine transcripts in `voice_transcripts_*.md` are rough, Georgian speech recognition is weak).

From WhatsApp:
- **Home page = her reference image**, with every direction as a planet that opens into its projects.
- **Ten planets, in her order:** Sculpture / Artworks, Public Art, Outdoor Objects, Christmas Trees, Kinetic / Automotive, Spaces & Worlds, Functional Art, Brand Concepts, Works with Melita, Competitions / Submissions.
- **On entering, KUPRAVA climbs the K's staircase letter by letter.**
- **Opening render:** Merani rising out of darkness, headlights lighting up, with a Ferrari engine sound. She would like a short video here later. The site opens on an engine START button: the starter cranks while the headlights flicker, the engine fires and the showroom lights up from the headlights, two throttle blips write her name, then a full pull dives into a headlight and the flash opens onto the universe. Sound: see *Opening sound* above.
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
- The reference shows seven planets; the three she named later (Outdoor Objects, Christmas Trees, Competitions / Submissions) sit on the reference's unlabelled moons and one new spot at the lower left.
