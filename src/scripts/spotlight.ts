/** Feeds the pointer position to `.spotlight` elements as --mx / --my (one rAF per frame). */
export function initSpotlight() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let frame = 0;
  let last: PointerEvent | undefined;
  document.addEventListener(
    'pointermove',
    (e) => {
      last = e;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = (last?.target as Element | null)?.closest<HTMLElement>('.spotlight');
        if (!target || !last) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${last.clientX - r.left}px`);
        target.style.setProperty('--my', `${last.clientY - r.top}px`);
      });
    },
    { passive: true },
  );
}
