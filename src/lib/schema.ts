/**
 * Data contract for src/data/*.json, enforced at build time.
 *
 * Every optional field also accepts `null` or "" (treated as absent) because the
 * JSON files are produced by scripts and humans alike. Unknown keys are stripped,
 * so provenance fields such as `evidence`, `confidence` or `source` are harmless.
 */
import { z } from 'zod';

/** Optional string: null, "" and whitespace collapse to undefined. */
const optText = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const text = z.string().trim().min(1, 'must be a non-empty string');

/** Optional list: null becomes []; blank entries are dropped. */
const textList = z
  .array(z.string().nullish())
  .nullish()
  .transform((v) => (v ?? []).map((s) => s?.trim() ?? '').filter(Boolean));

const optBool = z
  .boolean()
  .nullish()
  .transform((v) => v ?? false);

/** "YYYY-MM" or "YYYY-MM-DD". */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/, 'expected "YYYY-MM" or "YYYY-MM-DD"');

/** A year given as 2025 or "2025". */
const year = z
  .union([z.number().int(), z.string().trim().regex(/^\d{4}$/).transform(Number)], {
    error: 'expected a four-digit year such as 2025',
  })
  .refine((y) => y >= 1950 && y <= 2100, 'year out of range');

export const LINK_KINDS = [
  'scholar',
  'github',
  'orcid',
  'dblp',
  'linkedin',
  'x',
  'email',
  'cv',
  'researchgate',
  'other',
] as const;

export const profileSchema = z.object({
  name: text,
  nameNative: optText,
  headline: text,
  positions: z
    .array(
      z.object({
        title: text,
        org: text,
        url: optText,
        current: optBool,
      }),
    )
    .min(1, 'add at least one position'),
  location: optText,
  email: optText,
  photo: text,
  /** Alt text for the photo (optional extra; defaults to "Portrait of <name>"). */
  photoAlt: optText,
  bio: z.array(text).min(1, 'add at least one bio paragraph'),
  interests: textList,
  links: z
    .array(
      z.object({
        label: text,
        url: text,
        kind: z.enum(LINK_KINDS),
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
});

export const NEWS_KINDS = ['paper', 'award', 'talk', 'service', 'position', 'other'] as const;

export const newsSchema = z.array(
  z.object({
    date: isoDate,
    text,
    kind: z.enum(NEWS_KINDS).nullish().transform((v) => v ?? 'other'),
  }),
);

export const PUB_TYPES = ['conference', 'journal', 'workshop', 'preprint', 'book-chapter'] as const;
export const PUB_STATUSES = ['published', 'accepted', 'preprint'] as const;

const linksSchema = z.preprocess(
  (v) => v ?? {},
  z.object({
    pdf: optText,
    arxiv: optText,
    doi: optText,
    code: optText,
    project: optText,
    openreview: optText,
  }),
);

export const publicationsSchema = z
  .array(
    z.object({
      // Used as the HTML anchor (#id) and the BibTeX key.
      id: z
        .string()
        .trim()
        .regex(/^[A-Za-z][\w:.-]*$/, 'id must start with a letter and contain only letters, digits, _ : . -'),
      title: text,
      authors: z.array(text).min(1, 'add at least one author'),
      equalContrib: textList,
      corresponding: textList,
      venue: text,
      venueFull: optText,
      year,
      type: z.enum(PUB_TYPES),
      status: z.enum(PUB_STATUSES),
      track: optText,
      selected: optBool,
      links: linksSchema,
      note: optText,
      tags: textList,
      abstract: optText,
      isNew: optBool,
      // Optional extras (not required by the contract):
      // `rank` overrides the automatic venue tier chip ("" or "none" hides it);
      // `volume` / `pages` / `publisher` enrich BibTeX; `bibtex` replaces it verbatim.
      rank: z.string().nullish().transform((v) => (v == null ? undefined : v.trim())),
      volume: z.union([z.string(), z.number()]).nullish().transform((v) => (v == null || v === '' ? undefined : String(v))),
      pages: optText,
      publisher: optText,
      bibtex: optText,
    }),
  )
  .superRefine((pubs, ctx) => {
    const seen = new Map<string, number>();
    pubs.forEach((p, i) => {
      const prev = seen.get(p.id);
      if (prev !== undefined) {
        ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `duplicate id "${p.id}" (also used at index ${prev})` });
      }
      seen.set(p.id, i);
    });
  });

export const awardsSchema = z.array(
  z.object({
    year: z.union([z.number().int(), text]).transform(String),
    title: text,
    issuer: optText,
    note: optText,
  }),
);

export const servicesSchema = z.array(
  z.object({
    role: text,
    venues: textList,
    period: optText,
    note: optText,
  }),
);

export const EXPERIENCE_KINDS = ['education', 'position'] as const;

export const experienceSchema = z.array(
  z.object({
    kind: z.enum(EXPERIENCE_KINDS),
    period: text,
    title: text,
    org: text,
    location: optText,
    note: optText,
    url: optText,
  }),
);

export const siteSchema = z.object({
  ownerNames: z.array(text).min(1, 'list at least the canonical name'),
  lastUpdated: isoDate,
});

export type Profile = z.output<typeof profileSchema>;
export type ProfileLink = Profile['links'][number];
export type NewsItem = z.output<typeof newsSchema>[number];
export type RawPublication = z.output<typeof publicationsSchema>[number];
export type Award = z.output<typeof awardsSchema>[number];
export type Service = z.output<typeof servicesSchema>[number];
export type Experience = z.output<typeof experienceSchema>[number];
export type Site = z.output<typeof siteSchema>;
export type PubType = (typeof PUB_TYPES)[number];
export type PubStatus = (typeof PUB_STATUSES)[number];
