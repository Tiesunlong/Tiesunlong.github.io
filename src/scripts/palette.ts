import { setTheme, type ThemeMode } from './theme';
import { copyText, toast } from './toast';

/** Every whitespace-separated term must appear somewhere in the option text. */
const matches = (text: string, terms: string[]) => terms.every((t) => text.includes(t));

export function initPalette() {
  const dialog = document.querySelector<HTMLDialogElement>('#palette');
  const input = dialog?.querySelector<HTMLInputElement>('#palette-input');
  if (!dialog || !input) return;
  const options = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')];
  const groups = [...dialog.querySelectorAll<HTMLElement>('.group')];
  const empty = dialog.querySelector<HTMLElement>('.empty');
  let visible = options;
  let current: HTMLElement | undefined;

  function select(el: HTMLElement | undefined, scroll = true) {
    current?.setAttribute('aria-selected', 'false');
    current = el;
    if (el) {
      el.setAttribute('aria-selected', 'true');
      if (scroll) el.scrollIntoView({ block: 'nearest' });
      input!.setAttribute('aria-activedescendant', el.id);
    } else {
      input!.removeAttribute('aria-activedescendant');
    }
  }

  function move(delta: number) {
    const n = visible.length;
    if (!n) return;
    const i = current ? visible.indexOf(current) : -1;
    select(visible[(i + delta + n) % n]);
  }

  function filter() {
    const terms = input!.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    for (const o of options) o.hidden = !matches(o.dataset.text ?? '', terms);
    for (const g of groups) g.hidden = !g.querySelector('[role="option"]:not([hidden])');
    visible = options.filter((o) => !o.hidden);
    if (empty) empty.hidden = visible.length > 0;
    select(visible[0]);
  }

  function open() {
    if (dialog!.open) return;
    input!.value = '';
    filter();
    dialog!.showModal();
    input!.focus();
  }

  function run(el: HTMLElement | undefined) {
    if (!el) return;
    const { href, action } = el.dataset;
    dialog!.close();
    if (href) {
      window.location.assign(href);
    } else if (action?.startsWith('theme:')) {
      setTheme(action.slice('theme:'.length) as ThemeMode);
    } else if (action?.startsWith('copy:')) {
      void copyText(action.slice('copy:'.length)).then((ok) =>
        toast(ok ? 'Copied to clipboard' : 'Copy failed. Select the text manually.'),
      );
    }
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
  });
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest('[data-palette-open]')) open();
  });

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if ((e.key === 'Home' || e.key === 'End') && !input.value) {
      e.preventDefault();
      select(e.key === 'Home' ? visible[0] : visible.at(-1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(current);
    }
  });

  dialog.addEventListener('click', (e) => {
    const option = (e.target as Element | null)?.closest<HTMLElement>('[role="option"]');
    if (option) run(option);
    else if (e.target === dialog) dialog.close(); // click landed on the backdrop
  });
  dialog.addEventListener('pointermove', (e) => {
    const option = (e.target as Element | null)?.closest<HTMLElement>('[role="option"]');
    if (option && option !== current) select(option, false);
  });
}
