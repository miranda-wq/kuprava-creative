import fs from 'node:fs';
import path from 'node:path';
import { imageUrl } from '../src/asset-config.js';

const outputDirectory = path.resolve('dist');
const siteOrigin = 'https://kupravacreative.com';
const artworks = JSON.parse(fs.readFileSync('src/functional-artworks.json', 'utf8'));
const content = JSON.parse(fs.readFileSync('src/content.json', 'utf8'));
const template = fs.readFileSync(path.join(outputDirectory, 'index.html'), 'utf8');
const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const projectSlug = (project) => project.key || project.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const generatedUrls = [`${siteOrigin}/`];

function replaceMeta(html, selector, value) {
  const escaped = escapeAttribute(value);
  return html.replace(/<meta\b[^>]*>/g, (tag) => tag.includes(selector)
    ? tag.replace(/content="[^"]*"/, `content="${escaped}"`)
    : tag);
}

function emitPage({ relativePath, title, description, image }) {
  const canonical = `${siteOrigin}${relativePath}`;
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttribute(title)}</title>`);
  html = replaceMeta(html, 'name="description"', description);
  html = replaceMeta(html, 'property="og:title"', title);
  html = replaceMeta(html, 'property="og:description"', description);
  html = replaceMeta(html, 'property="og:url"', canonical);
  html = replaceMeta(html, 'property="og:image"', image);
  html = replaceMeta(html, 'property="og:image:alt"', title);
  html = replaceMeta(html, 'name="twitter:title"', title);
  html = replaceMeta(html, 'name="twitter:description"', description);
  html = replaceMeta(html, 'name="twitter:image"', image);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);

  const outputPage = path.join(outputDirectory, relativePath.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(outputPage), { recursive: true });
  fs.writeFileSync(outputPage, html);
  generatedUrls.push(canonical);
}

for (const artwork of artworks.products) {
  if (!/^[a-z0-9-]+$/.test(artwork.slug)) throw new Error(`Invalid artwork slug: ${artwork.slug}`);
  const relativePath = `/artwork/${artwork.slug}/`;
  const title = `${artwork.title} · KUPRAVA CREATIVE`;
  const description = artwork.description?.en || `${artwork.title} — functional artwork by Miranda Kuprava, KUPRAVA CREATIVE.`;
  const image = imageUrl(artwork.images[0]?.src || 'art/sculpture/incitatus-02.jpg', '/');
  emitPage({ relativePath, title, description, image });
}

for (const section of content.sections.filter((entry) => entry.id !== 'outdoor')) {
  for (const project of section.projects || []) {
    const slug = projectSlug(project);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Invalid project slug: ${section.id}/${slug}`);
    const relativePath = `/work/${section.id}/${slug}/`;
    const title = `${project.title} · KUPRAVA CREATIVE`;
    const description = project.text || `${project.title} — selected project by Georgian artist Miranda Kuprava, KUPRAVA CREATIVE.`;
    const media = project.images?.[0]?.src || project.doc?.pages?.[0]?.src || 'art/sculpture/incitatus-02.jpg';
    emitPage({ relativePath, title, description, image: imageUrl(media, '/') });
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${generatedUrls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(outputDirectory, 'sitemap.xml'), sitemap);
console.log(`Generated ${generatedUrls.length - 1} individual work pages and sitemap.xml.`);
