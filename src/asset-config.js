export const SUPABASE_PHOTO_BASE = 'https://zrclnzxvthwxirowbcfg.supabase.co/storage/v1/object/public/site-photos';

const photoRoots = new Set(['art', 'artist', 'docs']);
const photoExtensions = /\.(?:avif|gif|jpe?g|png|webp)$/i;

export function isHostedPhotoPath(path) {
  const value = String(path ?? '').split(/[?#]/, 1)[0].replace(/^\/+/, '');
  return photoRoots.has(value.split('/')[0]) && photoExtensions.test(value);
}

export function imageUrl(path, base = '/') {
  const value = String(path ?? '');
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;

  const queryIndex = value.search(/[?#]/);
  const pathname = queryIndex === -1 ? value : value.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? '' : value.slice(queryIndex);
  const normalized = pathname.replace(/^\/+/, '');
  if (!isHostedPhotoPath(normalized)) return `${base}${normalized}${suffix}`;

  const flattenedName = normalized.replaceAll('/', '__');
  return `${SUPABASE_PHOTO_BASE}/${encodeURIComponent(flattenedName)}${suffix}`;
}
