/** Entry point bundled on every page. Each module is idempotent and DOM-guarded. */
import { initTheme } from './theme';
import { initPalette } from './palette';
import { initSpotlight } from './spotlight';
import { initPapers } from './papers';

const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
for (const el of document.querySelectorAll<HTMLElement>('[data-mod-key]')) {
  el.textContent = isMac ? '⌘K' : 'Ctrl K';
}

initTheme();
initPalette();
initSpotlight();
initPapers();
