import { navItems } from '@/app/content';

/**
 * Sticky navigation.
 *
 * The mobile menu is a native `<details>` element: it is keyboard operable, needs no
 * state, works before hydration, and gives the same content as the desktop links.
 */
export function Nav() {
  return (
    <header className="nav">
      <div className="nav__inner container">
        <a className="nav__brand" href="#top">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <g stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M5 8.5 12 4l7 4.5M5 8.5v7L12 20l7-4.5v-7" />
              <path d="M5 8.5 12 12.5l7-4M12 12.5V20" />
            </g>
            <circle cx="12" cy="12.5" r="1.9" fill="currentColor" />
          </svg>
          <span>Khizar</span>
        </a>

        <nav className="nav__links" aria-label="Sections">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="button button--solid nav__cta" href="#lab">
          Break the network
        </a>

        <details className="nav__mobile">
          <summary>
            <span>Menu</span>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.6" fill="none" />
            </svg>
          </summary>
          <nav aria-label="Sections">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <a className="nav__mobile-cta" href="#lab">
              Break the network
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
