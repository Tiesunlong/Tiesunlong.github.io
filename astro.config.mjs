// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Unicode ranges copied from the matching @fontsource CSS so the browser only
// downloads the latin-ext file when a page actually contains those glyphs.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/**
 * Self-hosted variable font from an installed @fontsource-variable package.
 * @param {string} pkg   package folder name, e.g. "geist"
 * @param {string} file  file prefix inside files/, e.g. "geist"
 * @param {string} axes  axes segment of the filename, e.g. "wght" or "full"
 * @param {Array<'normal' | 'italic'>} styles
 * @returns {any} the local provider's non-empty `variants` tuple
 */
function fontsource(pkg, file, axes, styles = ['normal']) {
  return styles.flatMap((style) => [
    {
      src: [`@fontsource-variable/${pkg}/files/${file}-latin-${axes}-${style}.woff2`],
      weight: '100 900',
      style,
      unicodeRange: [LATIN],
    },
    {
      src: [`@fontsource-variable/${pkg}/files/${file}-latin-ext-${axes}-${style}.woff2`],
      weight: '100 900',
      style,
      unicodeRange: [LATIN_EXT],
    },
  ]);
}

export default defineConfig({
  site: 'https://tiesunlong.github.io',
  base: '/',
  // Old URLs were /publications/, /awards/ … — keep the trailing slash canonical.
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
  prefetch: false,
  vite: {
    build: {
      // Explicit CSS baseline (first versions with light-dark() + OKLCH). Without
      // it the minifier folds animation-timeline into the \`animation\` shorthand,
      // which browsers reject, silently disabling every scroll-driven animation.
      cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5', 'ios17.5'],
    },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Fraunces',
      cssVariable: '--font-display',
      fallbacks: ['Georgia', 'Songti SC', 'serif'],
      options: {
        // "full" carries the opsz / SOFT / WONK axes used by the hero typography.
        variants: fontsource('fraunces', 'fraunces', 'full'),
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--font-sans',
      fallbacks: ['ui-sans-serif', 'system-ui', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      options: { variants: fontsource('geist', 'geist', 'wght', ['normal', 'italic']) },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      options: { variants: fontsource('geist-mono', 'geist-mono', 'wght') },
    },
  ],
});
