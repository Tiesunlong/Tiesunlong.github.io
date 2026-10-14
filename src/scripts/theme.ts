export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'theme';
const ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const LABEL: Record<ThemeMode, string> = { system: 'follow system', light: 'light', dark: 'dark' };
const THEME_COLOR = { light: '#fcf9f5', dark: '#14110e' } as const;

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * The data-theme attribute (set before first paint by the inline script in
 * Base.astro) is the source of truth — localStorage may be blocked.
 */
const currentMode = (): ThemeMode => (root.dataset.theme as ThemeMode | undefined) ?? 'system';
const nextMode = (mode: ThemeMode) => ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length] ?? 'system';

function sync(mode: ThemeMode) {
  const next = nextMode(mode);
  for (const btn of document.querySelectorAll<HTMLElement>('[data-theme-toggle]')) {
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', `Theme: ${LABEL[mode]}. Switch to ${LABEL[next]}`);
  }
  // Keep the browser UI colour in step with a forced theme.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = mode === 'system' ? (meta.media.includes('dark') ? 'dark' : 'light') : mode;
    meta.content = THEME_COLOR[scheme];
  }
}

export function setTheme(mode: ThemeMode) {
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
  try {
    if (mode === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    /* storage blocked: the choice lasts for this page view */
  }
  sync(mode);
}

export function initTheme() {
  sync(currentMode());
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest('[data-theme-toggle]')) setTheme(nextMode(currentMode()));
  });
  systemDark.addEventListener('change', () => sync(currentMode()));
}
