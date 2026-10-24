export const SUPABASE_PHOTO_BASE = 'https://zrclnzxvthwxirowbcfg.supabase.co/storage/v1/object/public/site-photos';

const photoRoots = new Set(['art', 'artist', 'docs']);
const photoExtensions = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const rootStoredPhoto = (path) =>
  /^art\/melita\/melita-(?:3[8-9]|4[0-9]|5[0-4])(?:-t)?\.(?:jpg|png)$/i.test(path) ||
  /^art\/automotive-concepts\/(?:automotive-tree-concept-board(?:-t)?|merani-(?:front-detail|front-full|showroom|rear)(?:-t)?)\.(?:jpg|png)$/i.test(path);

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

  const flattenedName = rootStoredPhoto(normalized)
    ? normalized.split('/').at(-1)
    : normalized.replaceAll('/', '__');
  return `${SUPABASE_PHOTO_BASE}/${encodeURIComponent(flattenedName)}${suffix}`;
}

