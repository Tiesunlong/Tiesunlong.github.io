/**
 * Venue tier chips. Only venues whose CCF (China Computer Federation, 2022 list)
 * tier is unambiguous are listed; anything else gets no chip rather than a guess.
 * A publication can override the chip with its own `rank` field.
 */
import type { RawPublication } from './schema';

export type RankTier = 'a' | 'b' | 'c' | 'custom';
export interface Rank {
  label: string;
  tier: RankTier;
}

const CCF: Record<string, 'A' | 'B' | 'C'> = {
  // Conferences
  AAAI: 'A', IJCAI: 'A', NEURIPS: 'A', NIPS: 'A', ICML: 'A', ACL: 'A', CVPR: 'A', ICCV: 'A',
  SIGIR: 'A', KDD: 'A', SIGKDD: 'A', WWW: 'A', THEWEBCONF: 'A', ACMMM: 'A', MM: 'A',
  EMNLP: 'B', COLING: 'B', NAACL: 'B', ICASSP: 'B', CIKM: 'B', WSDM: 'B', ECAI: 'B', ECCV: 'B', ICDM: 'B',
  // Journals
  TPAMI: 'A', TKDE: 'A', TOIS: 'A', IJCV: 'A', JMLR: 'A', TIP: 'A', AIJ: 'A',
  TNNLS: 'B', TAFFC: 'B', IEEETRANSACTIONSONAFFECTIVECOMPUTING: 'B', TASLP: 'B', TACL: 'B',
  INFORMATIONSCIENCES: 'B', NEURALNETWORKS: 'B', PATTERNRECOGNITION: 'B',
  IPM: 'B', INFORMATIONPROCESSINGMANAGEMENT: 'B', INFORMATIONPROCESSINGANDMANAGEMENT: 'B',
  KBS: 'C', KNOWLEDGEBASEDSYSTEMS: 'C', APPLIEDINTELLIGENCE: 'C', NEUROCOMPUTING: 'C',
  ESWA: 'C', EXPERTSYSTEMSWITHAPPLICATIONS: 'C',
};

const NON_MAIN_TRACK = /findings|workshop|demo|student|srw|tutorial|abstract/i;

/** "IEEE TKDE 2025" -> "TKDE", "ACM MM" -> "ACMMM", "Information Sciences" -> "INFORMATIONSCIENCES". */
export function venueKey(venue: string): string {
  const key = venue
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  return key in CCF ? key : key.replace(/^(IEEE|ACM)/, '');
}

export function venueRank(pub: Pick<RawPublication, 'venue' | 'type' | 'status' | 'track' | 'rank'>): Rank | undefined {
  if (pub.rank !== undefined) {
    const label = pub.rank.trim();
    if (!label || label.toLowerCase() === 'none') return undefined;
    const m = /^CCF[-\s]?([ABC])$/i.exec(label);
    return m?.[1] ? { label: `CCF-${m[1].toUpperCase()}`, tier: m[1].toLowerCase() as RankTier } : { label, tier: 'custom' };
  }
  if (pub.status === 'preprint' || (pub.type !== 'conference' && pub.type !== 'journal')) return undefined;
  if (pub.track && NON_MAIN_TRACK.test(pub.track)) return undefined;
  return ccfRank(pub.venue);
}

/** Tier of a venue name alone (used for reviewing venues on /services/). */
export function ccfRank(venue: string): Rank | undefined {
  const tier = CCF[venueKey(venue)];
  return tier ? { label: `CCF-${tier}`, tier: tier.toLowerCase() as RankTier } : undefined;
}
