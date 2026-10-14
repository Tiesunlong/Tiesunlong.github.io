/**
 * Instant client-side filtering for /publications/. Every paper is already in
 * the HTML; this only toggles `hidden`. State is mirrored to ?q=&view=&year=
 * so a filtered list can be shared.
 */
const plural = (n: number) => `${n} paper${n === 1 ? '' : 's'}`;

export function initPubFilter() {
  const form = document.querySelector<HTMLFormElement>('[data-pub-filter]');
  if (!form) return;
  const search = form.elements.namedItem('q') as HTMLInputElement | null;
  const year = form.elements.namedItem('year') as HTMLSelectElement | null;
  const papers = [...document.querySelectorAll<HTMLElement>('[data-paper]')];
  const groups = [...document.querySelectorAll<HTMLElement>('[data-year-group]')];
  const status = document.querySelector<HTMLElement>('[data-pub-status]');
  const empty = document.querySelector<HTMLElement>('[data-pub-empty]');
  const total = papers.length;

  const view = () => (form.querySelector<HTMLInputElement>('input[name="view"]:checked')?.value ?? 'all');

  function apply() {
    const terms = (search?.value ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const v = view();
    const y = year?.value ?? '';
    let shown = 0;
    for (const p of papers) {
      const ok =
        (v === 'all' || (v === 'selected' ? p.dataset.selected !== undefined : p.dataset.type === v)) &&
        (!y || p.dataset.year === y) &&
        terms.every((t) => (p.dataset.search ?? '').includes(t));
      p.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of groups) {
      const n = g.querySelectorAll('[data-paper]:not([hidden])').length;
      g.hidden = n === 0;
      const count = g.querySelector('[data-year-count]');
      if (count) count.textContent = String(n);
    }
    if (status) status.textContent = shown === total ? plural(total) : `${shown} of ${plural(total)}`;
    if (empty) empty.hidden = shown > 0;

    const params = new URLSearchParams();
    if (terms.length) params.set('q', search!.value.trim());
    if (v !== 'all') params.set('view', v);
    if (y) params.set('year', y);
    const qs = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }

  // Restore state from the URL (ignored if it would hide a #deep-linked paper).
  const params = new URLSearchParams(location.search);
  if (search) search.value = params.get('q') ?? '';
  const restoredView = form.querySelector<HTMLInputElement>(`input[name="view"][value="${CSS.escape(params.get('view') ?? 'all')}"]`);
  if (restoredView) restoredView.checked = true;
  if (year && [...year.options].some((o) => o.value === params.get('year'))) year.value = params.get('year') ?? '';
  apply();
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (target?.hidden) {
    form.reset();
    apply();
    target.scrollIntoView();
  }

  form.addEventListener('input', apply);
  form.addEventListener('submit', (e) => e.preventDefault());
  document.querySelector('[data-pub-reset]')?.addEventListener('click', () => {
    form.reset();
    apply();
    search?.focus();
  });

  // "/" jumps to the search box unless the user is already typing somewhere.
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return;
    if ((el as HTMLElement | null)?.isContentEditable || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    search?.focus();
  });
}
