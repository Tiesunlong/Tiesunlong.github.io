import type { IconName } from '../components/Icon.astro';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  description: string;
}

/** Top-level routes. These URLs are linked externally — do not rename them. */
export const NAV: NavItem[] = [
  { href: '/', label: 'About', icon: 'identification', description: 'Profile, research at a glance, news' },
  { href: '/publications/', label: 'Publications', icon: 'books', description: 'Papers with search, filters and BibTeX' },
  { href: '/awards/', label: 'Awards', icon: 'trophy', description: 'Honours and scholarships' },
  { href: '/services/', label: 'Services', icon: 'hand-heart', description: 'Reviewing and community service' },
  { href: '/cv/', label: 'CV', icon: 'read-cv', description: 'Positions, education and a printable CV' },
];

export const isCurrent = (href: string, pathname: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);
