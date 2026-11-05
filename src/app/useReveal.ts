import { useEffect } from 'react';

/**
 * Adds `.is-visible` to every `.reveal` element as it enters the viewport.
 *
 * One shared observer for the whole page instead of a listener per component, and the
 * CSS keeps content fully visible when the observer never runs (no JS, reduced motion),
 * so the effect is purely additive.
 */
export function useReveal(): void {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (elements.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      for (const element of elements) element.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          record.target.classList.add('is-visible');
          observer.unobserve(record.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, []);
}
