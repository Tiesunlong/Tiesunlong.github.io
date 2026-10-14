const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2025-11" -> "Nov 2025"; "2025-11-03" -> "3 Nov 2025". */
export function formatDate(iso: string, long = false): string {
  const [y, m, d] = iso.split('-');
  const month = (long ? MONTHS_LONG : MONTHS)[Number(m) - 1] ?? '';
  return [d ? String(Number(d)) : '', month, y].filter(Boolean).join(' ');
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Strip a markdown string down to plain text (for meta descriptions, palette, JSON-LD). */
export function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6))}…`;
}

export const isExternal = (url: string) => /^https?:\/\//i.test(url);
