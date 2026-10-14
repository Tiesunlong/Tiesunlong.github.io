/**
 * Loads src/data/*.json, validates it against the contract in ./schema and
 * derives everything the pages need (sorted lists, author markers, stats).
 * Invalid data throws during `astro build` with the file name and field path.
 */
import { z } from 'zod';
import profileJson from '../data/profile.json';
import newsJson from '../data/news.json';
import publicationsJson from '../data/publications.json';
import awardsJson from '../data/awards.json';
import servicesJson from '../data/services.json';
import experienceJson from '../data/experience.json';
import siteJson from '../data/site.json';
import {
  awardsSchema,
  experienceSchema,
  newsSchema,
  profileSchema,
  publicationsSchema,
  servicesSchema,
  siteSchema,
  type ProfileLink,
  type RawPublication,
} from './schema';
import { arxivUrl, doiUrl } from './bibtex';

function load<S extends z.ZodType>(file: string, schema: S, raw: unknown): z.output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const path = issue.path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`)).join('').replace(/^\./, '');
      // Name the entry, not just its index.
      const [i] = issue.path;
      const id = Array.isArray(raw) && typeof i === 'number' ? (raw[i] as { id?: unknown } | undefined)?.id : undefined;
      return `✖ ${issue.message}\n  → at ${path || '(root)'}${typeof id === 'string' ? ` (id "${id}")` : ''}`;
    });
    throw new Error(`Invalid data in src/data/${file}\n${lines.join('\n')}`);
  }
  return result.data;
}

/* ---------- no-code-links policy ---------- */

// The owner wants no links to source code anywhere on the site. Rather than
// trusting every data file, anything that points at a code host is dropped here,
// once, so no component can render it.
const CODE_HOST = /\b(github\.com|gitlab\.com|gitee\.com|bitbucket\.org|anonymous\.4open\.science|codeocean\.com)\b/i;
const isCodeUrl = (url: string | undefined) => url !== undefined && CODE_HOST.test(url);

/** Removes "Our code is available at https://github.com/…" style sentences. */
function stripCodeMentions(text: string): string {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter((sentence) => !(/https?:\/\//i.test(sentence) && CODE_HOST.test(sentence)))
    .join(' ')
    .trim();
}

/** Abstracts copied from papers sometimes keep inline TeX such as R$^2$; render the simple cases. */
const SUPERSCRIPT: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ' };
const tidyTex = (text: string) =>
  text.replace(/\$\^\{?([0-9+\-n]+)\}?\$/g, (whole, sup: string) =>
    [...sup].every((c) => SUPERSCRIPT[c]) ? [...sup].map((c) => SUPERSCRIPT[c]).join('') : whole,
  );

export const site = load('site.json', siteSchema, siteJson);

const rawProfile = load('profile.json', profileSchema, profileJson);
export type PublicLink = ProfileLink & { kind: Exclude<ProfileLink['kind'], 'github'> };
export const profile = {
  ...rawProfile,
  links: rawProfile.links.filter((l): l is PublicLink => l.kind !== 'github' && !isCodeUrl(l.url)),
};
export const photoAlt = profile.photoAlt ?? `Profile picture of ${profile.name}`;

/* ---------- names ---------- */

const normName = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\u4e00-\u9fff]/g, '')
    .toLowerCase();

const ownerKeys = new Set([profile.name, ...site.ownerNames].map(normName));
export const isOwner = (name: string) => ownerKeys.has(normName(name));

const ET_AL = /^(others|et\.?\s*al\.?|\.\.\.|…)$/i;

/* ---------- publications ---------- */

export interface Author {
  name: string;
  isOwner: boolean;
  equal: boolean;
  corresponding: boolean;
  /** Placeholder such as "others" — rendered as "et al." */
  etAl: boolean;
}

export interface Publication extends RawPublication {
  /** Position in publications.json (ties within a year keep this order). */
  order: number;
  /** Best external link: DOI > arXiv > PDF > project > OpenReview. */
  primaryLink: string | undefined;
  authorList: Author[];
  /** First author, or co-first via equal contribution. */
  ownerFirst: boolean;
  /** Lower-cased haystack for client-side search. */
  search: string;
}

function parseAuthors(p: RawPublication): Author[] {
  const equal = new Set(p.equalContrib.map(normName));
  const corr = new Set(p.corresponding.map(normName));
  return p.authors.map((raw) => {
    // Accept inline markers too: "Jane Roe*", "Jane Roe†".
    const marks = /[*†‡#]+$/.exec(raw)?.[0] ?? '';
    const name = raw.slice(0, raw.length - marks.length).trim();
    const key = normName(name);
    return {
      name,
      isOwner: isOwner(name),
      equal: equal.has(key) || marks.includes('*') || marks.includes('#'),
      corresponding: corr.has(key) || marks.includes('†'),
      etAl: ET_AL.test(name),
    };
  });
}

const STATUS_ORDER = { accepted: 0, published: 1, preprint: 2 } as const;

const rawPublications = load('publications.json', publicationsSchema, publicationsJson);

// Every name in equalContrib / corresponding must match an author, otherwise a
// marker would silently disappear.
for (const p of rawPublications) {
  const names = new Set(p.authors.map((a) => normName(a.replace(/[*†‡#]+$/, ''))));
  for (const [field, list] of [['equalContrib', p.equalContrib], ['corresponding', p.corresponding]] as const) {
    const missing = list.filter((n) => !names.has(normName(n)));
    if (missing.length) {
      throw new Error(
        `Invalid data in src/data/publications.json\n✖ "${p.id}".${field}: ${missing.map((n) => `"${n}"`).join(', ')} not found in authors`,
      );
    }
  }
}

const primaryLink = (l: RawPublication['links']) =>
  (l.doi && doiUrl(l.doi)) ?? (l.arxiv && arxivUrl(l.arxiv)) ?? l.pdf ?? l.project ?? l.openreview;

export const publications: Publication[] = rawPublications
  .map((raw, index) => {
    const links = Object.fromEntries(
      Object.entries(raw.links).filter(([, url]) => url !== undefined && !isCodeUrl(url)),
    ) as RawPublication['links'];
    const p = { ...raw, links, abstract: raw.abstract && (tidyTex(stripCodeMentions(raw.abstract)) || undefined) };
    const authorList = parseAuthors(p);
    const ownerIdx = authorList.findIndex((a) => a.isOwner);
    const ownerFirst =
      ownerIdx === 0 || (ownerIdx > 0 && authorList.slice(0, ownerIdx + 1).every((a) => a.equal));
    const search = [p.title, p.venue, p.venueFull, p.year, p.track, p.note, ...p.authors, ...p.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return {
      pub: { ...p, order: index, primaryLink: primaryLink(links), authorList, ownerFirst, search },
      index,
    };
  })
  // Newest year first; within a year accepted > published > preprint, then file order.
  .sort((a, b) => b.pub.year - a.pub.year || STATUS_ORDER[a.pub.status] - STATUS_ORDER[b.pub.status] || a.index - b.index)
  .map(({ pub }) => pub);

export const selectedPublications = (() => {
  const picked = publications.filter((p) => p.selected);
  return picked.length ? picked : publications.slice(0, 4);
})();

export const isPreprint = (p: Pick<Publication, 'status' | 'type'>) => p.status === 'preprint' || p.type === 'preprint';
/** Accepted or published work; everything the stats, chart and venue list count. */
export const peerReviewed = publications.filter((p) => !isPreprint(p));
export const preprints = publications.filter(isPreprint);

/**
 * Hero ticker: the newest peer-reviewed papers (accepted or published, no
 * preprints), newest year first, then file order.
 */
export const recentPublications = peerReviewed
  .toSorted((a, b) => b.year - a.year || a.order - b.order)
  .slice(0, 8);

export function groupByYear<T extends { year: number }>(items: T[]): Array<[number, T[]]> {
  const groups = new Map<number, T[]>();
  for (const item of items) groups.set(item.year, [...(groups.get(item.year) ?? []), item]);
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

/* ---------- the rest ---------- */

export const news = load('news.json', newsSchema, newsJson).toSorted((a, b) => b.date.localeCompare(a.date));

const leadingYear = (s: string) => Number(/\d{4}/.exec(s)?.[0] ?? 0);

export const awards = load('awards.json', awardsSchema, awardsJson).toSorted(
  (a, b) => leadingYear(b.year) - leadingYear(a.year),
);
export const services = load('services.json', servicesSchema, servicesJson);
export const experience = load('experience.json', experienceSchema, experienceJson);

/* ---------- derived numbers (never hard-coded) ---------- */

// Preprints are listed but never counted.
const counted = peerReviewed;
const years = counted.map((p) => p.year);

export const stats = {
  /** Accepted + published. */
  papers: counted.length,
  preprints: preprints.length,
  firstAuthor: counted.filter((p) => p.ownerFirst).length,
  venues: [...new Set(counted.map((p) => p.venue))],
  yearFrom: years.length ? Math.min(...years) : undefined,
  yearTo: years.length ? Math.max(...years) : undefined,
};

/** Papers per year, every year in the range (gaps included), oldest first. */
export const papersPerYear =
  stats.yearFrom === undefined || stats.yearTo === undefined
    ? []
    : Array.from({ length: stats.yearTo - stats.yearFrom + 1 }, (_, i) => {
        const year = stats.yearFrom! + i;
        const items = counted.filter((p) => p.year === year);
        return { year, total: items.length, journal: items.filter((p) => p.type === 'journal').length };
      });

/** Distinct venues with paper counts, most frequent first. */
export const venueCounts = [...counted.reduce((m, p) => m.set(p.venue, (m.get(p.venue) ?? 0) + 1), new Map<string, number>())]
  .map(([venue, count]) => ({ venue, count }))
  .sort((a, b) => b.count - a.count || a.venue.localeCompare(b.venue));

export const currentPositions = (() => {
  const current = profile.positions.filter((p) => p.current);
  return current.length ? current : profile.positions;
})();
