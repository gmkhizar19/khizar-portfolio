import { heroStats, identity } from '@/app/content';
import { HeroGraph } from '@/components/molecules/HeroGraph';

/**
 * Hero: identity, one sentence of positioning, two actions, and the evidence strip.
 *
 * The primary action points at the creative feature, because the brief requires a
 * visible hint — and because the feature is the strongest thing on the page.
 */
export function Hero() {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero__graph" aria-hidden="true">
        <HeroGraph />
      </div>

      {/* The 12-column tick grid: a quiet structural signal that this is an engineered
          page, not a template. Purely decorative, so it is hidden from assistive tech. */}
      <div className="grid12" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </div>

      <div className="container hero__inner">
        <p className="mono hero__eyebrow">
          {identity.location} · UET Lahore · CS ’28
        </p>

        <h1 id="hero-title" className="display hero__title">
          Ghulam Muhammad <em>Khizar</em>
        </h1>

        <p className="lede hero__lede">
          {identity.positioning} Linux, containers and automated delivery, backed by a real
          data platform that has to stay up.
        </p>

        <div className="hero__actions">
          <a className="button button--solid" href="#lab">
            <span aria-hidden="true">⚡</span> Break the network
          </a>
          <a className="button button--ghost" href="#work">
            See the work
          </a>
        </div>

        <dl className="hero__stats">
          {heroStats.map((stat) => (
            <div key={stat.label} className="hero__stat">
              <dt className="mono">{stat.label}</dt>
              <dd className="num">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
