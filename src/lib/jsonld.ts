/** schema.org structured data: one Person, referenced by every ScholarlyArticle. */
import { profile, currentPositions, type Publication } from './data';
import { doiUrl } from './bibtex';
import { plainText } from './format';

const SITE = import.meta.env.SITE ?? 'https://tiesunlong.github.io';
const PERSON_ID = new URL('/#person', SITE).href;

export function personLd() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    ...(profile.nameNative && { alternateName: profile.nameNative }),
    url: new URL('/', SITE).href,
    jobTitle: currentPositions[0]?.title,
    description: profile.headline,
    ...(profile.email && { email: `mailto:${profile.email}` }),
    affiliation: currentPositions.map((p) => ({
      '@type': 'Organization',
      name: p.org,
      ...(p.url && { url: p.url }),
    })),
    ...(profile.location && { address: { '@type': 'PostalAddress', addressLocality: profile.location } }),
    knowsAbout: profile.interests,
    sameAs: profile.links.filter((l) => /^https?:/.test(l.url)).map((l) => l.url),
  };
}

export function articleLd(p: Publication) {
  const url = p.primaryLink;
  return {
    '@type': 'ScholarlyArticle',
    '@id': new URL(`/publications/#${p.id}`, SITE).href,
    headline: p.title,
    name: p.title,
    datePublished: String(p.year),
    author: p.authorList
      .filter((a) => !a.etAl)
      .map((a) => (a.isOwner ? { '@id': PERSON_ID } : { '@type': 'Person', name: a.name })),
    isPartOf: { '@type': p.type === 'journal' ? 'Periodical' : 'PublicationVolume', name: p.venueFull ?? p.venue },
    ...(p.abstract && { abstract: plainText(p.abstract) }),
    ...(p.tags.length && { keywords: p.tags.join(', ') }),
    ...(url && { url: new URL(url, SITE).href }),
    ...(p.links.doi && { sameAs: doiUrl(p.links.doi) }),
  };
}

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
