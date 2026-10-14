import { copyText, toast } from './toast';

/**
 * Paper card behaviour: abstract disclosure and one-click BibTeX copy.
 * Without JS abstracts stay expanded; with JS they collapse but remain
 * discoverable through find-in-page (hidden="until-found").
 */
/** Clipboard unavailable: reveal the entry in a selected textarea so it can be copied by hand. */
function showManualCopy(button: HTMLElement, text: string) {
  const card = button.closest('[data-paper]');
  let area = card?.querySelector<HTMLTextAreaElement>('textarea.bib-manual');
  if (!area) {
    area = document.createElement('textarea');
    area.className = 'bib-manual';
    area.readOnly = true;
    area.rows = Math.min(12, text.split('\n').length);
    area.setAttribute('aria-label', 'BibTeX entry');
    area.value = text;
    button.closest('.actions')?.after(area);
  }
  area.focus();
  area.select();
  toast('Press Ctrl+C (⌘C) to copy');
}

export function initPapers() {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('button[data-disclose]')) {
    const panel = document.getElementById(btn.getAttribute('aria-controls') ?? '');
    if (!panel) continue;
    btn.hidden = false;
    btn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('hidden', 'until-found');
    panel.addEventListener('beforematch', () => btn.setAttribute('aria-expanded', 'true'));
  }

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;

    const disclose = target?.closest<HTMLButtonElement>('button[data-disclose]');
    if (disclose) {
      const panel = document.getElementById(disclose.getAttribute('aria-controls') ?? '');
      const open = disclose.getAttribute('aria-expanded') !== 'true';
      disclose.setAttribute('aria-expanded', String(open));
      if (panel) {
        if (open) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', 'until-found');
      }
      return;
    }

    const bib = target?.closest<HTMLButtonElement>('button[data-bibtex]');
    if (bib) {
      const tpl = document.getElementById(bib.dataset.bibtex ?? '');
      const text = tpl instanceof HTMLTemplateElement ? tpl.content.textContent?.trim() : undefined;
      if (!text) return;
      void copyText(text).then((ok) => {
        if (ok) {
          toast('BibTeX copied');
          bib.dataset.copied = '';
          window.setTimeout(() => delete bib.dataset.copied, 1600);
        } else {
          showManualCopy(bib, text);
        }
      });
    }
  });
}
