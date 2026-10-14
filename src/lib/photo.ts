import type { ImageMetadata } from 'astro';

/**
 * `profile.photo` is a file name such as "bio.jpg". Files in src/assets/photos/
 * are optimised by astro:assets (AVIF/WebP, responsive sizes); anything else is
 * served as-is from public/.
 */
const assets = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});

export type Photo = { kind: 'asset'; src: ImageMetadata } | { kind: 'public'; src: string };

export function resolvePhoto(path: string): Photo {
  if (/^https?:\/\//i.test(path)) return { kind: 'public', src: path };
  const file = path.split('/').pop() ?? path;
  const hit = Object.entries(assets).find(([key]) => key.endsWith(`/${file}`));
  if (hit) return { kind: 'asset', src: hit[1].default };
  return { kind: 'public', src: path.startsWith('/') ? path : `/${path}` };
}
