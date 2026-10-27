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
import artworkDrafts from './artwork-drafts.json';
import artworkMetadata from './artwork-metadata.json';
import functionalArtworks from './functional-artworks.json';
import { T, LANGS, ORDER } from './i18n.js';
import { imageUrl } from './asset-config.js';
import { createCosmos } from './cosmos.js';
import { buildHero } from './hero.js';
import { createPlanetView } from './planet-view.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BASE = import.meta.env.BASE_URL;
// Keep local visual review independent of the remote photo upload. Production
// builds use the public bucket; Vite development uses the original local files.
const url = (p) => import.meta.env.DEV
  ? `${BASE}${String(p ?? '').replace(/^\/+/, '')}`
  : imageUrl(p, BASE);
const pad = (n) => String(n).padStart(2, '0');

let lang = 'en';
try { lang = localStorage.getItem('kc-lang') || 'en'; } catch {}
if (!LANGS.includes(lang)) lang = 'en';
const t = () => T[lang];
const translated = (path) => path.split('.').reduce((value, part) => value?.[part], t());
const projectStatus = (project) => project.statusKey
  ? `${t().statuses[project.statusKey]}${project.statusYear ? ` · ${project.statusYear}` : ''}`
  : (project.status || '');
const projectField = (project, key) => t().projectCopy?.[slugFor(project)]?.[key] ?? project[key];

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
const draftArtworkSlugs = new Set(artworkDrafts.filter((artwork) => artwork.status === 'draft').map((artwork) => artwork.slug));
const artworkMetadataBySlug = new Map(artworkMetadata.map((entry) => [entry.slug, entry]));
const functionalProducts = functionalArtworks.products;
const artworkView = document.createElement('section');
artworkView.className = 'artwork-detail';
artworkView.id = 'artwork-view';
artworkView.setAttribute('aria-live', 'polite');
document.querySelector('main').appendChild(artworkView);
let detailGalleryIndex = null;

const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const slugFor = (project) => project.key || project.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const localizedArtworkValue = (value) => value && typeof value === 'object' ? (value[lang] || value.en || '') : value;
const homeSeo = {
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.content || '',
  image: document.querySelector('meta[property="og:image"]')?.content || '',
};
function setSeo({ title, description, canonical, image }) {
  document.title = title;
  const setContent = (selector, value) => {
    const node = document.querySelector(selector);
    if (node && value) node.setAttribute('content', value);
  };
  setContent('meta[name="description"]', description);
  setContent('meta[property="og:title"]', title);
  setContent('meta[property="og:description"]', description);
  setContent('meta[property="og:url"]', canonical);
  setContent('meta[property="og:image"]', image);
  setContent('meta[property="og:image:alt"]', title);
  setContent('meta[name="twitter:title"]', title);
  setContent('meta[name="twitter:description"]', description);
  setContent('meta[name="twitter:image"]', image);
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink && canonical) canonicalLink.href = canonical;
}
const getArtworkRecords = () => {
  return functionalProducts.map((project) => ({
    ...project,
    key: project.slug,
    category: project.group,
    status: 'published',
  }));
};
const getProjectRecords = () => content.sections
  .filter((section) => section.id !== 'outdoor')
  .flatMap((section) => (section.projects || []).map((project) => ({
    ...project,
    slug: slugFor(project),
    sectionId: section.id,
    category: t().sections[section.id].title,
  })));

function renderArtworkPage(slug) {
  const record = getArtworkRecords().find((artwork) => artwork.slug === slug);
  if (!record || record.status !== 'published') return false;
  const images = record.images;
  const artworkUrl = `${location.origin}/artwork/${record.slug}/`;
  if (detailGalleryIndex !== null) galleries[detailGalleryIndex] = { title: record.title, images };
  else detailGalleryIndex = galleries.push({ title: record.title, images }) - 1;
  const imageAlt = (image, index) => image.alt || `${record.title}, view ${index + 1}`;
  const inquiryBody = `Hello KUPRAVA CREATIVE,\n\nI would like to inquire about ${record.title}.\n\nArtwork: ${record.title}\nCategory: ${record.category}\nWebsite: ${artworkUrl}`;
  const label = (key) => t().artworkFields[key];
  const description = localizedArtworkValue(record.description || record.text);
  const fields = [
    ['artist', 'Miranda Kuprava'], ['brand', 'KUPRAVA CREATIVE'], ['category', record.category], ['type', localizedArtworkValue(record.type)], ['materials', localizedArtworkValue(record.materials)], ['dimensions', localizedArtworkValue(record.dimensions)],
    ['year', localizedArtworkValue(record.year)], ['price', localizedArtworkValue(record.price)], ['edition', localizedArtworkValue(record.edition)], ['availability', localizedArtworkValue(record.availability) || t().orderInfo.availability], ['productionTime', localizedArtworkValue(record.productionTime) || t().orderInfo.productionTime], ['orderTerms', localizedArtworkValue(record.orderTerms) || t().orderInfo.orderTerms], ['installation', localizedArtworkValue(record.installationRequirements)],
  ].filter(([, value]) => value).map(([key, value]) => [label(key), value]);
  artworkView.innerHTML = `
    <div class="artwork-detail-inner">
      <a class="artwork-back" href="/#functional">← <span>${t().artworkBack}</span></a>
      <header class="artwork-detail-head">
        <p class="kicker">${escapeHTML(record.category)}</p>
        <h1>${escapeHTML(record.title)}</h1>
        ${description ? `<p class="artwork-description">${escapeHTML(description)}</p>` : ''}
      </header>
      ${images.length ? `<button class="artwork-main-image" type="button" data-artwork-image="0" aria-label="${escapeHTML(t().viewArtwork)}: ${escapeHTML(record.title)}">
        ${imgTag(images[0], imageAlt(images[0], 0), 'artwork-main-photo')}
      </button>` : ''}
      ${images.length > 1 ? `<div class="artwork-thumbnails" aria-label="${escapeHTML(t().viewArtwork)}: ${escapeHTML(record.title)}">${images.map((image, index) => `
        <button class="artwork-thumb" type="button" data-artwork-image="${index}" aria-label="${escapeHTML(t().viewArtwork)} ${escapeHTML(imageAlt(image, index))}">${imgTag(image, imageAlt(image, index))}</button>`).join('')}</div>` : ''}
      <div class="artwork-detail-bottom">
        ${fields.length ? `<dl class="artwork-information">${fields.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>` : ''}
        <a class="artwork-inquiry" href="mailto:Miranda@kupravacreative.com?subject=${encodeURIComponent(`Inquiry about ${record.title}`)}&body=${encodeURIComponent(inquiryBody)}">${t().inquireWork} <span aria-hidden="true">↗</span></a>
      </div>
    </div>`;
  const mainPhoto = $('.artwork-main-photo', artworkView);
  if (mainPhoto) {
    mainPhoto.src = url(images[0].src);
    mainPhoto.removeAttribute('data-full');
  }
  setSeo({
    title: `${record.title} · KUPRAVA CREATIVE`,
    description: description || `${record.title} — functional artwork by Miranda Kuprava, KUPRAVA CREATIVE.`,
    canonical: artworkUrl,
    image: new URL(url(images[0]?.src || 'art/sculpture/incitatus-02.jpg'), location.origin).href,
  });
  document.body.classList.add('artwork-open');
  $$('.artwork-detail [data-artwork-image]').forEach((button) => button.addEventListener('click', () => openLightbox(detailGalleryIndex, +button.dataset.artworkImage)));
  window.scrollTo({ top: 0, behavior: 'instant' });
  return true;
}

function renderProjectPage(sectionId, slug) {
  const record = getProjectRecords().find((project) => project.sectionId === sectionId && project.slug === slug);
  if (!record) return false;
  const images = record.images || [];
  const description = projectField(record, 'text') || '';
  const credit = projectField(record, 'credit') || '';
  const kicker = projectField(record, 'kicker') || record.category;
  if (images.length) {
    if (detailGalleryIndex !== null) galleries[detailGalleryIndex] = { sectionId, title: record.title, images };
    else detailGalleryIndex = galleries.push({ sectionId, title: record.title, images }) - 1;
  }
  const projectUrl = `${location.origin}/work/${sectionId}/${slug}/`;
  const inquiryBody = `Hello KUPRAVA CREATIVE,\n\nI would like to inquire about ${record.title}.\n\nProject: ${record.title}\nCategory: ${record.category}\nWebsite: ${projectUrl}`;
  artworkView.innerHTML = `
    <div class="artwork-detail-inner">
      <a class="artwork-back" href="/#${sectionId}">← <span>${t().back}</span></a>
      <header class="artwork-detail-head">
        <p class="kicker">${escapeHTML(kicker)}</p>
        <h1>${escapeHTML(projectField(record, 'title') || record.title)}</h1>
        ${record.statusKey ? `<p class="proj-status">${escapeHTML(projectStatus(record))}</p>` : ''}
        ${record.location ? `<p class="proj-location">${escapeHTML(record.location)}</p>` : ''}
        ${description ? `<p class="artwork-description">${escapeHTML(description)}</p>` : ''}
        ${credit ? `<p class="proj-credit">${escapeHTML(credit)}</p>` : ''}
      </header>
      ${images.length ? `<button class="artwork-main-image" type="button" data-artwork-image="0" aria-label="${escapeHTML(t().viewArtwork)}: ${escapeHTML(record.title)}">
        ${imgTag(images[0], images[0].alt || record.title, 'artwork-main-photo')}
      </button>` : ''}
      ${images.length > 1 ? `<div class="artwork-thumbnails" aria-label="${escapeHTML(record.title)} photographs">${images.map((image, index) => `
        <button class="artwork-thumb" type="button" data-artwork-image="${index}" aria-label="${escapeHTML(t().viewArtwork)} ${index + 1}">${imgTag(image, image.alt || `${record.title}, view ${index + 1}`)}</button>`).join('')}</div>` : ''}
      ${record.doc ? `<div class="artwork-project-document">${docCard(record.doc)}</div>` : ''}
      <a class="artwork-inquiry" href="mailto:Miranda@kupravacreative.com?subject=${encodeURIComponent(`Inquiry about ${record.title}`)}&body=${encodeURIComponent(inquiryBody)}">${t().inquireWork} <span aria-hidden="true">↗</span></a>
    </div>`;
  const mainPhoto = $('.artwork-main-photo', artworkView);
  if (mainPhoto) { mainPhoto.src = url(images[0].src); mainPhoto.removeAttribute('data-full'); }
  setSeo({
    title: `${record.title} · KUPRAVA CREATIVE`,
    description: description || `${record.title} — selected project by Georgian artist Miranda Kuprava, KUPRAVA CREATIVE.`,
    canonical: projectUrl,
    image: new URL(url(images[0]?.src || record.doc?.pages?.[0]?.src || 'art/sculpture/incitatus-02.jpg'), location.origin).href,
  });
  document.body.classList.add('artwork-open');
  $$('.artwork-detail [data-artwork-image]').forEach((button) => button.addEventListener('click', () => openLightbox(detailGalleryIndex, +button.dataset.artworkImage)));
  $('.artwork-detail .doc')?.addEventListener('click', (event) => openDoc(event.currentTarget.dataset.doc));
  window.scrollTo({ top: 0, behavior: 'instant' });
  return true;
}

function syncArtworkRoute() {
  const productPath = location.pathname.match(/^\/artwork\/([a-z0-9-]+)\/?$/i);
  const projectPath = location.pathname.match(/^\/work\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
  const legacyProduct = location.hash.match(/^#artwork\/([a-z0-9-]+)$/i);
  if (!productPath && !projectPath && !legacyProduct) {
    document.body.classList.remove('artwork-open');
    artworkView.replaceChildren();
    setSeo({ title: homeSeo.title, description: homeSeo.description, canonical: 'https://kupravacreative.com/', image: homeSeo.image });
    return;
  }
  const valid = projectPath
    ? renderProjectPage(projectPath[1].toLowerCase(), projectPath[2].toLowerCase())
    : !draftArtworkSlugs.has((productPath || legacyProduct)[1].toLowerCase()) && renderArtworkPage((productPath || legacyProduct)[1].toLowerCase());
  if (!valid) {
    if (location.pathname.startsWith('/work/') || location.pathname.startsWith('/artwork/')) location.replace('/#functional');
    else history.replaceState(null, '', '#functional');
    document.body.classList.remove('artwork-open');
    artworkView.replaceChildren();
  }
}
window.addEventListener('hashchange', syncArtworkRoute);

function imgTag(im, alt, cls = '') {
  const dimensions = im.w && im.h ? ` width="${im.w}" height="${im.h}"` : '';
  return `<img class="${cls}" src="${url(im.thumb)}" data-full="${url(im.src)}"${dimensions} alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async" />`;
}

const imageAspectStyle = (im) => im?.w && im?.h
  ? `--image-ratio:${Number(im.w) / Number(im.h)}`
  : '';

function docCard(d) {
  const cover = d.pages[0];
  const isPortfolio = d.pdf === portfolioDoc?.pdf;
  const cta = isPortfolio ? t().viewProposal : t().viewPdf;
  const ctaKey = isPortfolio ? 'viewProposal' : 'viewPdf';
  return `
    <button class="doc" data-doc="${d.pdf}">
      <span class="doc-cover">${imgTag(cover, d.title)}</span>
      <span class="doc-meta">
        <span class="doc-kind">PDF · ${d.pages.length} <span data-i18n="pages">${t().pages}</span> · ${d.sizeMB} MB</span>
        <span class="doc-title">${d.title}</span>
        <span class="doc-cta"><span data-i18n="${ctaKey}">${cta}</span> <i>→</i></span>
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
    const total = s.id === 'functional' ? functionalProducts.length : (s.workCount ?? (['christmas', 'kinetic'].includes(s.id) ? s.projects.length : s.projects.reduce((a, p) => a + p.images.length, 0)));
    const sec = document.createElement('section');
    sec.className = `sec sec-${s.id}`;
    sec.id = s.id;
    sec.dataset.index = si;
    let html = `
      <header class="sec-head reveal">
        <div class="sec-orbit" aria-hidden="true"><svg viewBox="0 0 120 120"><ellipse cx="60" cy="60" rx="56" ry="22" transform="rotate(-18 60 60)"/><circle class="sp" r="5"/></svg><span>${pad(si + 1)}</span></div>
        <h2 class="sec-title" data-sec-title="${s.id}">${t().sections[s.id].title}</h2>
        ${t().sections[s.id].subtitle ? `<p class="sec-subtitle" data-sec-subtitle="${s.id}">${t().sections[s.id].subtitle}</p>` : ''}
        <p class="sec-intro" data-sec-intro="${s.id}">${t().sections[s.id].intro}</p>
        ${s.id === 'brand' ? `<ul class="commission-services" data-commission-services>${t().commissionServices.map((item) => `<li>${item}</li>`).join('')}</ul><p class="commission-brief" data-i18n="commissionBrief">${t().commissionBrief}</p><a class="btn commission-discuss" data-i18n="commissionDiscuss" href="mailto:Miranda@kupravacreative.com?subject=${encodeURIComponent(t().commissionEmailSubject)}&body=${encodeURIComponent(t().commissionEmailBody)}">${t().commissionDiscuss}</a>` : ''}
        ${total > 0 ? `<div class="sec-count">${total} <span data-i18n="works">${t().works}</span></div>` : ''}
        ${s.doc ? `<div class="sec-doc">${docCard(s.doc)}</div>` : ''}
      </header>`;
    if (s.doc) docs[s.doc.pdf] = s.doc;

    if (s.id === 'functional') {
      html += `<div class="subnav reveal">${functionalArtworks.categories.map((category) => `<a href="#fa-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${category}</a>`).join('')}</div>`;
    }

    if (s.id === 'about') {
      html += `
        <div class="about-grid reveal">
          <div class="about-portrait"><img src="${url('artist/miranda-kuprava-portrait.png')}" width="1103" height="1471" alt="Portrait of Miranda Kuprava" loading="lazy" decoding="async" /></div>
          <div class="about-copy">
            <h3 class="about-name">Miranda Kuprava</h3>
            <div class="about-role" data-i18n="artistRole">${t().artistRole}</div>
            <div class="about-text">${t().aboutText.map((x) => `<p>${x}</p>`).join('')}</div>
            <div class="about-actions">
              <a class="btn" href="${url('cv/miranda-kuprava-cv.pdf')}" download data-i18n="downloadCv">${t().downloadCv}</a>
              <a class="btn ghost" href="#brand" data-i18n="commissionLink">${t().commissionLink}</a>
              <a class="about-email" href="mailto:Miranda@kupravacreative.com">Miranda@kupravacreative.com</a>
            </div>
          </div>
        </div>`;
    } else if (s.id === 'sculpture') {
      html += `<div class="works">`;
      s.projects.forEach((p, pi) => {
        const gi = galleries.push({ title: p.title, kicker: p.kicker || t().sections[s.id].title, images: p.images }) - 1;
        (sectionWorks[s.id] ||= []).push({ gi, title: p.title, images: p.images });
        html += `
          <figure class="work reveal" data-gallery="${gi}" data-idx="0" style="--d:${(pi % 4) * 70}ms">
            <div class="work-img" style="${imageAspectStyle(p.images[0])}">${imgTag(p.images[0], p.title)}</div>
            <figcaption><span class="w-num">${pad(pi + 1)}</span><a class="w-title work-page-link" href="/work/sculpture/${slugFor(p)}/">${escapeHTML(p.title)}</a>${p.images.length > 1 ? `<span class="w-n">${p.images.length}</span>` : ''}</figcaption>
          </figure>`;
      });
      html += `</div>`;
    } else if (s.id === 'functional') {
      functionalArtworks.categories.forEach((category) => {
        const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const works = functionalProducts.filter((p) => p.group === category);
        html += `<section class="functional-category" id="fa-${categorySlug}"><h3 class="functional-category-title kicker">${category}</h3><div class="functional-grid">`;
        works.forEach((p, pi) => {
          const gi = galleries.push({ sectionId: s.id, title: p.title, images: p.images }) - 1;
          const artwork = { ...p, key: p.slug };
          (sectionWorks[s.id] ||= []).push({ gi, title: p.title, images: p.images, key: p.slug, slug: p.slug });
          const cover = p.images?.[0];
          html += `<article class="functional-art-card reveal" style="--d:${(pi % 4) * 70}ms"><a href="/artwork/${p.slug}/" aria-label="${escapeHTML(t().viewArtwork)}: ${escapeHTML(p.title)}" data-i18n-aria="viewArtwork" data-artwork-label="${escapeHTML(p.title)}"><div class="functional-art-image">${cover ? imgTag(cover, cover.alt || p.title) : '<span class="functional-art-placeholder" aria-hidden="true"></span>'}</div><div class="functional-art-meta"><span class="functional-art-title">${escapeHTML(p.title)}</span><span class="functional-art-arrow" aria-hidden="true">↗</span></div>${p.edition ? `<span class="functional-art-edition">${escapeHTML(p.edition)}</span>` : ''}</a></article>`;
        });
        html += `</div></section>`;
      });
    } else if (s.id === 'spaces') {
      s.projects.forEach((p) => {
        const gi = galleries.push({ sectionId: s.id, title: p.title, images: p.images }) - 1;
        (sectionWorks[s.id] ||= []).push({ gi, title: p.title, images: p.images });
        html += `
          <article class="proj vitis-project">
            <div class="vitis-groups">
              ${p.groups.map((group) => `
                <section class="vitis-group">
                  <h3 class="vitis-group-title kicker">${t().sections[s.id].groups[group.key]}</h3>
                  <div class="gallery">
                    ${group.imageIndexes.map((imageIndex, i) => {
                      const im = p.images[imageIndex];
                      return `<figure class="g-item reveal" data-gallery="${gi}" data-idx="${imageIndex}" style="--d:${(i % 3) * 60}ms">${imgTag(im, im.alt || `${p.title} ${imageIndex + 1}`)}</figure>`;
                    }).join('')}
                  </div>
                </section>`).join('')}
            </div>
            <a class="artwork-card-link" href="/work/spaces/${slugFor(p)}/"><span data-i18n="viewArtwork">${t().viewArtwork}</span> <span aria-hidden="true">↗</span></a>
          </article>`;
      });
    } else {
      s.projects.forEach((p) => {
        const status = projectStatus(p);
        const kicker = projectField(p, 'kicker');
        const credit = projectField(p, 'credit');
        const text = projectField(p, 'text');
        const outdoorOrderInfo = s.id === 'outdoor' ? [
          [t().artworkFields.availability, t().orderInfo.availability],
          [t().artworkFields.productionTime, t().orderInfo.productionTime],
          [t().artworkFields.orderTerms, t().orderInfo.orderTerms],
        ] : [];
        const gi = galleries.push({ sectionId: s.id, title: p.title, kicker, status, statusKey: p.statusKey, statusYear: p.statusYear, location: p.location, images: p.images, doc: p.doc }) - 1;
        (sectionWorks[s.id] ||= []).push({ gi, title: p.title, images: p.images });
        if (p.doc) docs[p.doc.pdf] = p.doc;
        const sub = s.id === 'functional' && p.key && t().functionalSubs[p.key];
        const many = p.images.length > 12 && slugFor(p) !== 'nine-lives';
        html += `
          <article class="proj" data-project-slug="${slugFor(p)}" ${p.key ? `id="fa-${p.key}"` : ''}>
            <div class="proj-meta reveal">
              ${kicker ? `<div class="kicker" data-project-copy="kicker">${escapeHTML(kicker)}</div>` : ''}
              <h3 data-project-copy="title">${escapeHTML(projectField(p, 'title') || p.title)}</h3>
              ${s.id === 'functional' ? `<a class="artwork-card-link" href="/artwork/${slugFor(p)}/"><span data-i18n="viewArtwork">${t().viewArtwork}</span> <span aria-hidden="true">↗</span></a>` : ''}
              ${status ? `<p class="proj-status" ${p.statusKey ? `data-project-status="${p.statusKey}" data-status-year="${p.statusYear || ''}"` : ''}>${status}</p>` : ''}
              ${outdoorOrderInfo.length ? `<dl class="project-order-details"><div><dt data-i18n="artworkFields.availability">${escapeHTML(outdoorOrderInfo[0][0])}</dt><dd data-i18n="orderInfo.availability">${escapeHTML(outdoorOrderInfo[0][1])}</dd></div><div><dt data-i18n="artworkFields.productionTime">${escapeHTML(outdoorOrderInfo[1][0])}</dt><dd data-i18n="orderInfo.productionTime">${escapeHTML(outdoorOrderInfo[1][1])}</dd></div><div><dt data-i18n="artworkFields.orderTerms">${escapeHTML(outdoorOrderInfo[2][0])}</dt><dd data-i18n="orderInfo.orderTerms">${escapeHTML(outdoorOrderInfo[2][1])}</dd></div></dl>` : ''}
              ${p.location ? `<p class="proj-location">${p.location}</p>` : ''}
              ${sub ? `<p class="proj-sub" data-fa="${p.key}">${sub}</p>` : ''}
              ${credit ? `<p class="proj-credit" data-project-copy="credit">${escapeHTML(credit)}</p>` : ''}
              ${text ? `<p class="proj-text" data-project-copy="text">${escapeHTML(text)}</p>` : ''}
              ${s.id !== 'outdoor' ? `<a class="artwork-card-link" href="/work/${s.id}/${slugFor(p)}/"><span data-i18n="viewArtwork">${t().viewArtwork}</span> <span aria-hidden="true">↗</span></a>` : ''}
              ${p.doc ? docCard(p.doc) : ''}
            </div>
            <div class="gallery ${many ? 'is-clamped' : ''}">
              ${p.images.map((im, i) => `<figure class="g-item reveal" data-gallery="${gi}" data-idx="${i}" style="--d:${(i % 3) * 60}ms">${imgTag(im, im.alt || `${p.title} ${i + 1}`)}</figure>`).join('')}
              ${many ? `<button class="more">+ ${p.images.length - 12}</button>` : ''}
            </div>
          </article>`;
      });
    }
    if (t().sections[s.id].closing) html += `<p class="sec-closing reveal" data-sec-closing="${s.id}">${t().sections[s.id].closing}</p>`;
    sec.innerHTML = html;
    root.appendChild(sec);
  });

  const contact = document.createElement('section');
  contact.className = 'sec sec-contact';
  contact.id = 'contact';
  contact.innerHTML = `
    <div class="contact-card reveal">
      <div class="kicker" data-i18n="contact">${t().contact}</div>
      <h2 class="contact-title" data-i18n="contactTitle">${t().contactTitle}</h2>
      <p class="contact-text" data-i18n="contactText">${t().contactText}</p>
      <a class="contact-phone" href="tel:+995599282806">+995599282806</a>
      <div class="china-contact">
        <div class="kicker" data-i18n="chinaContact">${t().chinaContact}</div>
        <div class="china-contact-name">Andria Kvirikashvili</div>
        <div class="china-contact-links">
          <a href="tel:+8618801035330">+8618801035330</a>
          <a href="mailto:akvirikashvili2026@gmail.com">akvirikashvili2026@gmail.com</a>
        </div>
      </div>
      <a class="contact-email" href="mailto:Miranda@kupravacreative.com"><span>Miranda@kupravacreative.com</span><i aria-hidden="true">↗</i></a>
    </div>`;
  root.appendChild(contact);

  $$('.gallery .more').forEach((b) => b.addEventListener('click', () => { b.parentElement.classList.remove('is-clamped'); b.remove(); }));
  $$('[data-gallery]').forEach((f) => f.addEventListener('click', () => openLightbox(+f.dataset.gallery, +f.dataset.idx)));
  $$('.work-page-link').forEach((a) => a.addEventListener('click', (event) => event.stopPropagation()));
  $$('.doc').forEach((b) => b.addEventListener('click', () => openDoc(b.dataset.doc)));
  $$('.subnav a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    $(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  observeReveals();
}

/* ---------------------------------------------------------------- language */
function applyLang() {
  document.documentElement.lang = { en: 'en', ge: 'ka', fr: 'fr', zh: 'zh-CN', jp: 'ja' }[lang];
  document.body.dataset.lang = lang;
  $$('.langs button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  $$('[data-i18n]').forEach((n) => { const v = translated(n.dataset.i18n); if (typeof v === 'string') n.textContent = v; });
  $$('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', `${translated(n.dataset.i18nAria)}: ${n.dataset.artworkLabel}`));
  const commissionLink = $('.commission-discuss');
  if (commissionLink) commissionLink.href = `mailto:Miranda@kupravacreative.com?subject=${encodeURIComponent(t().commissionEmailSubject)}&body=${encodeURIComponent(t().commissionEmailBody)}`;
  $$('.tl1').forEach((n) => (n.textContent = t().tagline[0]));
  $$('.tl2').forEach((n) => (n.textContent = t().tagline[1]));
  $$('[data-sec-title]').forEach((n) => (n.textContent = t().sections[n.dataset.secTitle].title));
  $$('[data-sec-subtitle]').forEach((n) => (n.textContent = t().sections[n.dataset.secSubtitle].subtitle));
  $$('[data-sec-intro]').forEach((n) => (n.textContent = t().sections[n.dataset.secIntro].intro));
  $$('[data-sec-closing]').forEach((n) => (n.textContent = t().sections[n.dataset.secClosing].closing));
  $$('[data-project-copy]').forEach((n) => {
    const slug = n.closest('[data-project-slug]')?.dataset.projectSlug;
    const value = slug ? t().projectCopy?.[slug]?.[n.dataset.projectCopy] : null;
    if (value) n.textContent = value;
  });
  $$('.proj-status[data-project-status]').forEach((n) => { n.textContent = projectStatus({ statusKey: n.dataset.projectStatus, statusYear: n.dataset.statusYear }); });
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
  if (lb.classList.contains('open')) showLB();
  if (location.pathname.match(/^\/(?:artwork\/[a-z0-9-]+|work\/[a-z0-9-]+\/[a-z0-9-]+)\/?$/i) || location.hash.match(/^#artwork\/[a-z0-9-]+$/i)) syncArtworkRoute();
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
    `<li style="--i:${sections.length}"><a href="#contact" data-id="contact"><span class="m-num">↗</span><span class="m-title">${t().contact}</span></a></li>`;
  $$('.menu-list a').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); goTo(a.dataset.id); });
    a.addEventListener('pointerenter', () => {
      const s = sections.find((x) => x.id === a.dataset.id);
      $('.menu-preview').classList.toggle('preserve-proportions', ['christmas', 'kinetic', 'spaces'].includes(s?.id));
      const im = s?.projects?.[0]?.images?.[0] || content.intro;
      const img = $('.menu-preview img');
      img.src = url(im.thumb);
      $('.menu-preview').classList.add('on');
      if (!['christmas', 'kinetic', 'spaces'].includes(s?.id) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  $('.lb-status').textContent = g.statusKey ? projectStatus(g) : (g.status || '');
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
  lb.classList.toggle('preserve-proportions', ['christmas', 'kinetic', 'spaces'].includes(g.sectionId));
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
  if (id === 'christmas' || id === 'kinetic') {
    return projects.slice(0, cap).map((p) => {
      const im = p.images[0];
      return { gi: p.gi, idx: 0, thumb: url(im.thumb), w: im.w, h: im.h, title: p.title, projectSlug: p.slug, sectionId: id, preserveProportions: true };
    });
  }
  for (let r = 0; out.length < cap; r++) {
    let any = false;
    for (const p of projects) {
      const im = p.images[r];
      if (!im || out.length >= cap) continue;
      out.push({ gi: p.gi, idx: r, thumb: url(im.thumb), w: im.w, h: im.h, title: im.label || p.title, projectSlug: p.key ? slugFor(p) : null, sectionId: id, preserveProportions: ['christmas', 'kinetic', 'spaces'].includes(id) });
      any = true;
    }
    if (!any) break;
  }
  return out;
}
const planetView = createPlanetView({
  items: planetItems,
  planet: (id) => hero.planet(id),
  openItem: (it) => it.sectionId === 'functional' && it.projectSlug ? (location.href = `/artwork/${it.projectSlug}/`) : openLightbox(it.gi, it.idx),
  toSection: goTo,
  strings: t,
  order: ORDER,
  total: (id) => {
    const section = sections.find((s) => s.id === id);
  return section?.workCount ?? (['christmas', 'kinetic'].includes(id) ? (sectionWorks[id] || []).length : (sectionWorks[id] || []).reduce((a, p) => a + p.images.length, 0));
  },
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
syncArtworkRoute();
$$('.sec').forEach((s) => secObs.observe(s));
onScroll();

document.addEventListener('visibilitychange', () => (document.hidden ? cosmos?.pause() : cosmos?.resume()));

document.body.classList.add('ready');
hero.relayout();
setTimeout(() => hero.climb(), 2500); // once the staircase has drawn itself
if (location.hash && location.hash !== '#top') setTimeout(() => goTo(location.hash.slice(1)), 600);

