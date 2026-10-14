# tiesunlong.github.io

Academic homepage of Tiesunlong Shen. Static site built with [Astro](https://astro.build), driven entirely by JSON in `src/data/`.

```bash
npm ci
npm run dev      # http://localhost:4321
npm run check    # astro check: types + data contract
npm run build    # static output in dist/
npm run preview  # serve dist/
```

Requires Node ≥ 22.12. Pushing to `main` deploys through `.github/workflows/deploy.yml` (Pages source: GitHub Actions).

## Adding a paper

Append an object to `src/data/publications.json` with at least `id` (letters/digits/`_:.-`, becomes the `#anchor` and BibTeX key), `title`, `authors` (array of full names, in order; use `"others"` for a truncated list), `venue` (short name such as `"ACL"`), `year`, `type` (`conference | journal | workshop | preprint | book-chapter`) and `status` (`published | accepted | preprint`). Optional: `venueFull`, `track` (e.g. `"Findings"`; non-main tracks get no CCF chip), `equalContrib` / `corresponding` (names exactly as in `authors`, or append `*` / `†` to the name), `links` (`pdf`, `arxiv`, `doi`, `project`, `openreview`; there is deliberately no `code` link — see below; a PDF can live in `public/papers/` and be linked as `/papers/x.pdf`), `abstract`, `tags`, `note`, `selected: true` (shows on the home page), `isNew: true` (NEW badge), plus BibTeX extras `volume`, `pages`, `publisher`, or a verbatim `bibtex` string. The CCF tier chip is looked up from `src/lib/venues.ts`; set `"rank": "CCF-A"` (or any label, or `""` to hide it) to override. Order inside a year is the file order. Run `npm run build`: a typo such as a wrong `type` or an `equalContrib` name that is not among the authors fails the build with the file and field path. Stats on the home page, the year chart, the venue list, the hero's scrolling "Recent publications" window (newest 8 accepted/published papers, newest year first, then file order; each links to its DOI, else arXiv, PDF or project page, else to its entry on /publications/), the palette, JSON-LD and `/publications.bib` all update automatically.

## No code links

By the owner's request the site never links to source code. `links.code` is not part of the schema (it is dropped if present), any link pointing at a code host (GitHub, GitLab, Gitee, Bitbucket, anonymous.4open.science, Code Ocean) is removed in `src/lib/data.ts`, a profile link of kind `github` is not rendered, and sentences such as "Our code is available at https://github.com/…" are stripped from abstracts at build time. The data files can stay as they are.

## Data files

| File | Shape |
| --- | --- |
| `profile.json` | `name`, `nameNative?`, `headline`, `positions[{title, org, url?, current?}]`, `location?`, `email?`, `photo`, `photoAlt?`, `bio[]` (markdown), `interests[]`, `links[{label, url, kind}]` |
| `news.json` | `[{date: "YYYY-MM[-DD]", text (markdown), kind}]`, sorted by date at build time |
| `publications.json` | see above |
| `awards.json` | `[{year, title, issuer?, note?}]` |
| `services.json` | `[{role, venues[], period?, note?}]` |
| `experience.json` | `[{kind: education \| position, period, title, org, location?, note?, url?}]` |
| `site.json` | `ownerNames[]` (name variants bolded in author lists), `lastUpdated` |

The schema lives in `src/lib/schema.ts` (zod). `null` and `""` count as "absent"; unknown keys are ignored.

`photo` is a file name: files in `src/assets/photos/` are resized and served as AVIF/WebP; anything else is served from `public/`. Keep images local — the site makes no third-party requests (fonts are self-hosted), so it loads fully from mainland China.

## Layout

```
src/
  data/          content (JSON)
  lib/           schema, data loading + derived stats, BibTeX, CCF tiers, JSON-LD
  components/    Hero, Glance (bento), PaperCard, CommandPalette, Header, Footer …
  layouts/Base   <head>, theme bootstrap, header/footer, palette
  pages/         / · /publications/ · /awards/ · /services/ · /cv/ · 404 · /publications.bib
  scripts/       small vanilla TS: theme, ⌘K palette, filters, BibTeX copy, spotlight
  styles/        design tokens (OKLCH, light-dark()), cascade layers
```

Design tokens are in `src/styles/global.css`. Text/background pairs were checked for WCAG AA in both themes; re-check if you change `--ink-*`, `--accent*` or `--bg*`.
