import type { Publication } from './data';

const ENTRY_TYPE = {
  conference: 'inproceedings',
  workshop: 'inproceedings',
  journal: 'article',
  'book-chapter': 'incollection',
  preprint: 'misc',
} as const;

/** "https://arxiv.org/abs/2401.01234v2" or "2401.01234" -> "2401.01234v2" */
export function arxivId(link: string | undefined): string | undefined {
  if (!link) return undefined;
  return /(\d{4}\.\d{4,5}(v\d+)?)/.exec(link)?.[1] ?? /arxiv\.org\/(?:abs|pdf)\/([\w.\-/]+?)(?:\.pdf)?$/i.exec(link)?.[1];
}

/** "https://doi.org/10.1145/x" -> "10.1145/x" */
export const doiId = (link: string | undefined) => link?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '');

export const doiUrl = (link: string) => (/^https?:\/\//i.test(link) ? link : `https://doi.org/${doiId(link)}`);
export const arxivUrl = (link: string) => (/^https?:\/\//i.test(link) ? link : `https://arxiv.org/abs/${link}`);

// Braces must stay balanced inside a BibTeX value; escape the few characters
// that break LaTeX when pasted verbatim.
const esc = (s: string) => s.replace(/([&%$#_])/g, '\\$1').replace(/[{}]/g, '');

/** Site-relative links ("/papers/x.pdf") become absolute so the entry works anywhere. */
const absolute = (url: string | undefined) =>
  url?.startsWith('/') ? new URL(url, import.meta.env.SITE).href : url;

export function toBibtex(p: Publication): string {
  if (p.bibtex) return p.bibtex.trim();
  const type = p.status === 'preprint' && p.type !== 'journal' ? 'misc' : ENTRY_TYPE[p.type];
  const venue = p.venueFull ?? p.venue;
  const arxiv = arxivId(p.links.arxiv);
  const doi = doiId(p.links.doi);
  const fields: Array<[string, string | number | undefined]> = [
    ['title', `{${esc(p.title)}}`],
    ['author', p.authorList.map((a) => (a.etAl ? 'others' : esc(a.name))).join(' and ')],
    type === 'article' ? ['journal', esc(venue)] : type === 'misc' ? ['howpublished', esc(venue)] : ['booktitle', esc(venue)],
    ['year', p.year],
    ['volume', p.volume],
    ['pages', p.pages?.replace(/\s*[-–]+\s*/, '--')],
    ['publisher', p.publisher && esc(p.publisher)],
    ['doi', doi],
    ['eprint', arxiv],
    ['archivePrefix', arxiv && 'arXiv'],
    ['url', absolute(p.links.pdf ?? p.links.project) ?? (doi ? `https://doi.org/${doi}` : undefined)],
    ['note', p.status === 'accepted' ? 'Accepted' : undefined],
  ];
  const body = fields
    .filter((f): f is [string, string | number] => f[1] !== undefined && f[1] !== '')
    .map(([k, v]) => `  ${k.padEnd(13)} = {${v}}`)
    .join(',\n');
  return `@${type}{${p.id},\n${body}\n}`;
}
