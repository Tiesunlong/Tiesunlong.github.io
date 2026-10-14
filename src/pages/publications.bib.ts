import type { APIRoute } from 'astro';
import { profile, publications } from '../lib/data';
import { toBibtex } from '../lib/bibtex';

/** /publications.bib — every entry, generated from src/data/publications.json. */
export const GET: APIRoute = () => {
  const header = `% Publications of ${profile.name}\n% Generated from ${import.meta.env.SITE}/publications/\n\n`;
  return new Response(header + publications.map(toBibtex).join('\n\n') + '\n', {
    headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
  });
};
