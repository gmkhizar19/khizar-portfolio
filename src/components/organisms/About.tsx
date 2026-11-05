import { about, fragility, identity } from '@/app/content';

/** About Me — required section. Written as an argument, not a biography. */
export function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="mono">01 — About</p>
          <h2 id="about-title">A student who kept pulling the thread.</h2>
        </header>

        <div className="about__grid">
          <div className="about__prose reveal">
            {about.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>

          <aside className="about__card reveal" aria-label="Quick facts">
            <dl>
              <div>
                <dt className="mono">Studying</dt>
                <dd>BS Computer Science</dd>
              </div>
              <div>
                <dt className="mono">At</dt>
                <dd>{identity.university}</dd>
              </div>
              <div>
                <dt className="mono">Based in</dt>
                <dd>{identity.location}</dd>
              </div>
              <div>
                <dt className="mono">Focus</dt>
                <dd>Cloud · DevOps · data platforms</dd>
              </div>
              <div>
                <dt className="mono">Now</dt>
                <dd>{identity.availability}</dd>
              </div>
            </dl>

            <div className="about__finding">
              <p className="mono">Finding I keep returning to</p>
              <p>
                {fragility.articulationPoints} articulation points and {fragility.bridges}{' '}
                bridges hold the research network together — yet a targeted attack on 10% of
                authors only moves connectivity from {fragility.lccBefore}% to{' '}
                {fragility.lccAfterTargeted}%.
              </p>
            </div>
          </aside>
        </div>

        <ul className="principles reveal">
          {about.principles.map((principle) => (
            <li key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
