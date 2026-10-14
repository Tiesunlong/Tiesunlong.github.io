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
  type RawPublication,
} from './schema';
import { venueRank, type Rank } from './venues';

function load<S extends z.ZodType>(file: string, schema: S, raw: unknown): z.output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    // Name the entry, not just its index: "[4].year" -> "[4] (id "shen2025x").year"
    for (const issue of result.error.issues) {
      const [i] = issue.path;
      const id = Array.isArray(raw) && typeof i === 'number' ? (raw[i] as { id?: unknown } | undefined)?.id : undefined;
      if (typeof id === 'string') issue.message += ` (entry id "${id}")`;
    }
    throw new Error(`Invalid data in src/data/${file}\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const site = load('site.json', siteSchema, siteJson);
export const profile = load('profile.json', profileSchema, profileJson);

/* ---------- names ---------- */

const normName = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z一-鿿]/g, '')
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
  authorList: Author[];
  /** Derived venue chip (CCF tier or the `rank` override). */
  venueRank: Rank | undefined;
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

export const publications: Publication[] = rawPublications
  .map((p, index) => {
    const authorList = parseAuthors(p);
    const ownerIdx = authorList.findIndex((a) => a.isOwner);
    const ownerFirst =
      ownerIdx === 0 || (ownerIdx > 0 && authorList.slice(0, ownerIdx + 1).every((a) => a.equal));
    const search = [p.title, p.venue, p.venueFull, p.year, p.track, p.note, ...p.authors, ...p.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return { pub: { ...p, authorList, venueRank: venueRank(p), ownerFirst, search }, index };
  })
  // Newest year first; within a year accepted > published > preprint, then file order.
  .sort((a, b) => b.pub.year - a.pub.year || STATUS_ORDER[a.pub.status] - STATUS_ORDER[b.pub.status] || a.index - b.index)
  .map(({ pub }) => pub);

export const selectedPublications = (() => {
  const picked = publications.filter((p) => p.selected);
  return picked.length ? picked : publications.slice(0, 4);
})();

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

const counted = publications.filter((p) => p.status !== 'preprint');
const years = publications.map((p) => p.year);

export const stats = {
  papers: publications.length,
  peerReviewed: counted.length,
  firstAuthor: publications.filter((p) => p.ownerFirst).length,
  ccfA: counted.filter((p) => p.venueRank?.tier === 'a').length,
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
        const items = publications.filter((p) => p.year === year);
        return { year, total: items.length, journal: items.filter((p) => p.type === 'journal').length };
      });

/** Distinct venues with paper counts, most frequent first. */
export const venueCounts = [...counted.reduce((m, p) => m.set(p.venue, (m.get(p.venue) ?? 0) + 1), new Map<string, number>())]
  .map(([venue, count]) => ({ venue, count, rank: counted.find((p) => p.venue === venue && p.venueRank)?.venueRank }))
  .sort((a, b) => b.count - a.count || a.venue.localeCompare(b.venue));

export const currentPositions = (() => {
  const current = profile.positions.filter((p) => p.current);
  return current.length ? current : profile.positions;
})();
