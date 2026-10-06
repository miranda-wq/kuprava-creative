import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-300-italic.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/jost/latin-300.css';
import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import content from './content.json';
import { T, LANGS, ORDER } from './i18n.js';
import { createCosmos } from './cosmos.js';
import { buildHero } from './hero.js';
import { createPlanetView } from './planet-view.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BASE = import.meta.env.BASE_URL;
const url = (p) => BASE + p;
const pad = (n) => String(n).padStart(2, '0');

let lang = 'en';
try { lang = localStorage.getItem('kc-lang') || 'en'; } catch {}
if (!LANGS.includes(lang)) lang = 'en';
const t = () => T[lang];

const sections = ORDER.map((id) => content.sections.find((s) => s.id === id));

/* ---------------------------------------------------------------- cosmos + hero */
let cosmos = null;
try { cosmos = createCosmos($('#cosmos')); } catch (e) { document.body.classList.add('no-webgl'); }

const labels = () => ({ ...Object.fromEntries(ORDER.map((id) => [id, t().sections[id].title])), contact: t().contact });
// a planet opens its section in the planet view (created further down, once the lightbox exists)
const hero = buildHero({
  svg: $('.hero-svg'), nodesBox: $('.nodes'), labels: labels(),
  onNavigate: (id, el) => id === 'contact' ? goTo('contact') : planetView.open(id, el),
  onHover: (id) => { if (id !== 'contact') planetView.prefetch(id); },
});

function goTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  closeMenu();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

/* ---------------------------------------------------------------- sections */
const root = $('#sections');

function imgTag(im, alt, cls = '') {
  return `<img class="${cls}" src="${url(im.thumb)}" data-full="${url(im.src)}" width="${im.w}" height="${im.h}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async" />`;
}

function docCard(d) {
  const cover = d.pages[0];
  return `
    <button class="doc" data-doc="${d.pdf}">
      <span class="doc-cover">${imgTag(cover, d.title)}</span>
      <span class="doc-meta">
        <span class="doc-kind">PDF · ${d.pages.length} <span data-i18n="pages">${t().pages}</span> · ${d.sizeMB} MB</span>
        <span class="doc-title">${d.title}</span>
        <span class="doc-cta"><span data-i18n="viewProposal">${t().viewProposal}</span> <i>→</i></span>
      </span>
    </button>`;
}

const docs = {};
const portfolioDoc = content.sections.find((x) => x.id === 'sculpture')?.doc;
const galleries = [];
const sectionWorks = {}; // per section: each project's gallery and images, for the planet view

function renderSections() {
  root.innerHTML = '';
  sections.forEach((s, si) => {
    const total = s.id === 'christmas' ? s.projects.length : s.projects.reduce((a, p) => a + p.images.length, 0);
    const sec = document.createElement('section');
    sec.className = `sec sec-${s.id}`;
    sec.id = s.id;
    sec.dataset.index = si;
    let html = `
      <header class="sec-head reveal">
        <div class="sec-orbit" aria-hidden="true"><svg viewBox="0 0 120 120"><ellipse cx="60" cy="60" rx="56" ry="22" transform="rotate(-18 60 60)"/><circle class="sp" r="5"/></svg><span>${pad(si + 1)}</span></div>
        <h2 class="sec-title" data-sec-title="${s.id}">${t().sections[s.id].title}</h2>
        <p class="sec-intro" data-sec-intro="${s.id}">${t().sections[s.id].intro}</p>
        ${s.id === 'brand' ? `<ul class="commission-services" data-commission-services>${t().commissionServices.map((item) => `<li>${item}</li>`).join('')}</ul>` : ''}
        <div class="sec-count">${total} <span data-i18n="works">${t().works}</span></div>
        ${s.doc ? `<div class="sec-doc">${docCard(s.doc)}</div>` : ''}
      </header>`;
    if (s.doc) docs[s.doc.pdf] = s.doc;

    if (s.id === 'functional') {
      html += `<div class="subnav reveal">${s.projects.map((p) => `<a href="#fa-${p.key}">${p.kicker.replace(/^\d+ — /, '')}</a>`).join('')}</div>`;
    }

    if (s.id === 'sculpture') {
      html += `<div class="works">`;
      s.projects.forEach((p, pi) => {
        const gi = galleries.push({ title: p.title, kicker: p.kicker || t().sections[s.id].title, images: p.images }) - 1;
        (sectionWorks[s.id] ||= []).push({ gi, title: p.title, images: p.images });
        html += `
          <figure class="work reveal" data-gallery="${gi}" data-idx="0" style="--d:${(pi % 4) * 70}ms">
            <div class="work-img">${imgTag(p.images[0], p.title)}</div>
            <figcaption><span class="w-num">${pad(pi + 1)}</span><span class="w-title">${p.title}</span>${p.images.length > 1 ? `<span class="w-n">${p.images.length}</span>` : ''}</figcaption>
          </figure>`;
      });
      html += `</div>`;
    } else {
      s.projects.forEach((p) => {
        const gi = galleries.push({ sectionId: s.id, title: p.title, kicker: p.kicker, status: p.status, location: p.location, images: p.images, doc: p.doc }) - 1;
        (sectionWorks[s.id] ||= []).push({ gi, title: p.title, images: p.images });
        if (p.doc) docs[p.doc.pdf] = p.doc;
        const sub = s.id === 'functional' && p.key && t().functionalSubs[p.key];
        const many = p.images.length > 12;
        html += `
          <article class="proj" ${p.key ? `id="fa-${p.key}"` : ''}>
            <div class="proj-meta reveal">
              ${p.kicker ? `<div class="kicker">${p.kicker}</div>` : ''}
              <h3>${p.title}</h3>
              ${p.status ? `<p class="proj-status">${p.status}</p>` : ''}
              ${p.location ? `<p class="proj-location">${p.location}</p>` : ''}
              ${sub ? `<p class="proj-sub" data-fa="${p.key}">${sub}</p>` : ''}
              ${p.credit ? `<p class="proj-credit">${p.credit}</p>` : ''}
              ${p.text ? `<p class="proj-text">${p.text}</p>` : ''}
              ${p.doc ? docCard(p.doc) : ''}
            </div>
            <div class="gallery ${many ? 'is-clamped' : ''}">
              ${p.images.map((im, i) => `<figure class="g-item reveal" data-gallery="${gi}" data-idx="${i}" style="--d:${(i % 3) * 60}ms">${imgTag(im, `${p.title} ${i + 1}`)}</figure>`).join('')}
              ${many ? `<button class="more">+ ${p.images.length - 12}</button>` : ''}
            </div>
          </article>`;
      });
    }
    sec.innerHTML = html;
    root.appendChild(sec);
  });

  const about = document.createElement('section');
  about.className = 'sec sec-about';
  about.id = 'about';
  about.innerHTML = `
    <div class="about-grid reveal">
      <div class="about-k" aria-hidden="true"><img src="${url('k-emblem-m.webp')}" srcset="${url('k-emblem-m.webp')} 1x, ${url('k-emblem.webp')} 2x" width="628" height="552" alt="" loading="lazy" decoding="async" /></div>
      <div>
        <div class="kicker" data-i18n="about">${t().about}</div>
        <h2 class="about-name">Miranda Kuprava</h2>
        <div class="about-role" data-i18n="artistRole">${t().artistRole}</div>
        <div class="about-text">${t().aboutText.map((x) => `<p>${x}</p>`).join('')}</div>
        <div class="about-actions">
          <a class="btn" href="mailto:miranda@kupravacreative.com">miranda@kupravacreative.com</a>
          ${portfolioDoc ? `<a class="btn ghost" href="${url(portfolioDoc.pdf)}" download data-i18n="portfolio">${t().portfolio}</a>` : ''}
        </div>
      </div>
    </div>`;
  root.appendChild(about);

  const contact = document.createElement('section');
  contact.className = 'sec sec-contact';
  contact.id = 'contact';
  contact.innerHTML = `
    <div class="contact-card reveal">
      <div class="kicker" data-i18n="contact">${t().contact}</div>
      <h2 class="contact-title" data-i18n="contactTitle">${t().contactTitle}</h2>
      <p class="contact-text" data-i18n="contactText">${t().contactText}</p>
      <a class="contact-email" href="mailto:miranda@kupravacreative.com"><span>miranda@kupravacreative.com</span><i aria-hidden="true">↗</i></a>
    </div>`;
  root.appendChild(contact);

  $$('.gallery .more').forEach((b) => b.addEventListener('click', () => { b.parentElement.classList.remove('is-clamped'); b.remove(); }));
  $$('[data-gallery]').forEach((f) => f.addEventListener('click', () => openLightbox(+f.dataset.gallery, +f.dataset.idx)));
  $$('.doc').forEach((b) => b.addEventListener('click', () => openDoc(b.dataset.doc)));
  $$('.subnav a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    $(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  observeReveals();
}

/* ---------------------------------------------------------------- language */
function applyLang() {
  document.documentElement.lang = { en: 'en', ge: 'ka', fr: 'fr', jp: 'ja' }[lang];
  document.body.dataset.lang = lang;
  $$('.langs button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  $$('[data-i18n]').forEach((n) => { const v = t()[n.dataset.i18n]; if (typeof v === 'string') n.textContent = v; });
  $$('.tl1').forEach((n) => (n.textContent = t().tagline[0]));
  $$('.tl2').forEach((n) => (n.textContent = t().tagline[1]));
  $$('[data-sec-title]').forEach((n) => (n.textContent = t().sections[n.dataset.secTitle].title));
  $$('[data-sec-intro]').forEach((n) => (n.textContent = t().sections[n.dataset.secIntro].intro));
  const services = $('[data-commission-services]');
  if (services) services.replaceChildren(...t().commissionServices.map((label) => {
    const item = document.createElement('li');
    item.textContent = label;
    return item;
  }));
  $$('[data-fa]').forEach((n) => (n.textContent = t().functionalSubs[n.dataset.fa]));
  const at = $('.about-text');
  if (at) at.innerHTML = t().aboutText.map((x) => `<p>${x}</p>`).join('');
  hero.setLabels(labels());
  renderMenu();
  renderOrbitList();
  renderRail();
  planetView.refresh();
}
$$('.langs button').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('kc-lang', lang); } catch {}
  applyLang();
}));

/* ---------------------------------------------------------------- menu */
const menu = $('.menu');
const burger = $('.burger');
function renderMenu() {
  $('.menu-list').innerHTML = sections.map((s, i) => `
    <li style="--i:${i}"><a href="#${s.id}" data-id="${s.id}"><span class="m-num">${pad(i + 1)}</span><span class="m-title">${t().sections[s.id].title}</span></a></li>`).join('') +
    `<li style="--i:${sections.length}"><a href="#about" data-id="about"><span class="m-num">✦</span><span class="m-title">${t().about}</span></a></li>` +
    `<li style="--i:${sections.length + 1}"><a href="#contact" data-id="contact"><span class="m-num">↗</span><span class="m-title">${t().contact}</span></a></li>`;
  $$('.menu-list a').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); goTo(a.dataset.id); });
    a.addEventListener('pointerenter', () => {
      const s = sections.find((x) => x.id === a.dataset.id);
      $('.menu-preview').classList.toggle('preserve-proportions', s?.id === 'christmas');
      const im = s ? s.projects[0].images[0] : content.intro;
      const img = $('.menu-preview img');
      img.src = url(im.thumb);
      $('.menu-preview').classList.add('on');
      if (s?.id !== 'christmas' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        img.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
    });
  });
}
function openMenu() { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); burger.classList.add('x'); burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('locked'); }
function closeMenu() { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); burger.classList.remove('x'); burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('locked'); }
burger.addEventListener('click', () => (menu.classList.contains('open') ? closeMenu() : openMenu()));
$('.top-contact').addEventListener('click', (e) => { e.preventDefault(); goTo('contact'); });

function renderOrbitList() {
  $('.orbit-list').innerHTML = sections.map((s, i) => `<li><a href="#${s.id}" data-id="${s.id}"><i></i><span>${t().sections[s.id].title}</span><em>${pad(i + 1)}</em></a></li>`).join('') +
    `<li><a href="#contact" data-id="contact"><i></i><span>${t().contact}</span><em>↗</em></a></li>`;
  $$('.orbit-list a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    a.dataset.id === 'contact' ? goTo('contact') : planetView.open(a.dataset.id, a.querySelector('i'));
  }));
}

/* ---------------------------------------------------------------- side rail */
function renderRail() {
  $('.rail ul').innerHTML = sections.map((s, i) => `<li data-id="${s.id}"><a href="#${s.id}"><i></i><span>${t().sections[s.id].title}</span></a></li>`).join('') +
    `<li data-id="contact"><a href="#contact"><i></i><span>${t().contact}</span></a></li>`;
  $$('.rail a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(a.parentElement.dataset.id); }));
}

/* ---------------------------------------------------------------- lightbox */
const lb = $('.lightbox');
const lbImg = $('.lb-fig img');
let cur = { g: null, i: 0 };

function showLB() {
  const g = cur.g;
  const im = g.images[cur.i];
  lb.classList.add('loading');
  const pre = new Image();
  pre.onload = () => { lbImg.src = pre.src; lb.classList.remove('loading'); };
  pre.src = url(im.src);
  lbImg.alt = `${g.title} ${cur.i + 1}`;
  $('.lb-kicker').textContent = g.kicker || '';
  $('.lb-name').textContent = g.title;
  $('.lb-status').textContent = g.status || '';
  $('.lb-location').textContent = g.location || '';
  $('.lb-count').textContent = `${pad(cur.i + 1)} / ${pad(g.images.length)}`;
  const pdf = $('.lb-pdf');
  if (g.doc) { pdf.href = url(g.doc.pdf); pdf.textContent = t().downloadPdf; pdf.hidden = false; } else { pdf.hidden = true; }
  $$('.lb-strip button').forEach((b, i) => b.classList.toggle('on', i === cur.i));
  $('.lb-strip button.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  [1, -1].forEach((d) => { const n = g.images[(cur.i + d + g.images.length) % g.images.length]; new Image().src = url(n.src); });
}
function openGallery(g, i) {
  cur = { g, i };
  lb.classList.toggle('preserve-proportions', g.sectionId === 'christmas');
  $('.lb-strip').innerHTML = g.images.length > 1 ? g.images.map((im, k) => `<button data-k="${k}"><img src="${url(im.thumb)}" alt="" loading="lazy"/></button>`).join('') : '';
  $$('.lb-strip button').forEach((b) => b.addEventListener('click', () => { cur.i = +b.dataset.k; showLB(); }));
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
  showLB();
}
function openLightbox(gi, i) { openGallery(galleries[gi], i); }
function openDoc(pdf) {
  const d = docs[pdf];
  openGallery({ title: d.title, kicker: 'PDF', images: d.pages, doc: d }, 0);
}
function closeLB() {
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  if (!document.body.classList.contains('pv-open')) document.body.classList.remove('locked');
}
const step = (d) => { cur.i = (cur.i + d + cur.g.images.length) % cur.g.images.length; showLB(); };
$('.lb-close').addEventListener('click', closeLB);
$('.lb-prev').addEventListener('click', () => step(-1));
$('.lb-next').addEventListener('click', () => step(1));
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-fig')) closeLB(); });
window.addEventListener('keydown', (e) => {
  if (lb.classList.contains('open')) {
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  } else if (planetView.isOpen()) {
    if (e.key === 'Escape') planetView.close();
    if (e.key === 'ArrowRight') planetView.nudge(1);
    if (e.key === 'ArrowLeft') planetView.nudge(-1);
  } else if (e.key === 'Escape') closeMenu();
});
let sx = null;
lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  sx = null;
});

/* ---------------------------------------------------------------- planet view */
// up to `cap` works of a section, taking each project's images in turn so every project shows
function planetItems(id, cap) {
  const projects = sectionWorks[id] || [], out = [];
  if (id === 'christmas') {
    return projects.slice(0, cap).map((p) => {
      const im = p.images[0];
      return { gi: p.gi, idx: 0, thumb: url(im.thumb), w: im.w, h: im.h, title: p.title, preserveProportions: true };
    });
  }
  for (let r = 0; out.length < cap; r++) {
    let any = false;
    for (const p of projects) {
      const im = p.images[r];
      if (!im || out.length >= cap) continue;
      out.push({ gi: p.gi, idx: r, thumb: url(im.thumb), w: im.w, h: im.h, title: p.title, preserveProportions: id === 'christmas' });
      any = true;
    }
    if (!any) break;
  }
  return out;
}
const planetView = createPlanetView({
  items: planetItems,
  planet: (id) => hero.planet(id),
  openItem: (it) => openLightbox(it.gi, it.idx),
  toSection: goTo,
  strings: t,
  order: ORDER,
  total: (id) => id === 'christmas' ? (sectionWorks[id] || []).length : (sectionWorks[id] || []).reduce((a, p) => a + p.images.length, 0),
  covered: () => lb.classList.contains('open'),
});

/* ---------------------------------------------------------------- reveal + scroll */
let io;
function observeReveals() {
  io?.disconnect();
  io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((n) => io.observe(n));
}

const secObs = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) {
    const id = en.target.id;
    $$('.rail li').forEach((li) => li.classList.toggle('on', li.dataset.id === id));
  }
}), { rootMargin: '-45% 0px -50% 0px' });

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY, h = window.innerHeight || 1;
    const k = Math.min(1, y / h);
    document.body.style.setProperty('--hero-k', k.toFixed(3));
    document.body.classList.toggle('scrolled', y > h * 0.6);
    cosmos?.setScroll(k);
    const max = document.documentElement.scrollHeight - h;
    $('.rail-line i').style.transform = `scaleY(${max > 0 ? y / max : 0})`;
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

/* ---------------------------------------------------------------- cursor */
const cursor = $('.cursor');
if (window.matchMedia('(pointer: fine)').matches) {
  let cx = 0, cy = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('on'); });
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('big', !!e.target.closest('[data-gallery], .doc, .pv-card'));
    cursor.classList.toggle('link', !!e.target.closest('a, button'));
  });
  (function loop() {
    cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
}

/* ---------------------------------------------------------------- boot */
renderSections();
applyLang();
$$('.sec').forEach((s) => secObs.observe(s));
onScroll();

document.addEventListener('visibilitychange', () => (document.hidden ? cosmos?.pause() : cosmos?.resume()));

document.body.classList.add('ready');
hero.relayout();
setTimeout(() => hero.climb(), 2500); // once the staircase has drawn itself
if (location.hash && location.hash !== '#top') setTimeout(() => goTo(location.hash.slice(1)), 600);
