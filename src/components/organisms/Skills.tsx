import { skillClusters } from '@/app/content';
import { Tag } from '@/components/atoms/Tag';

/** Tech Superpowers — required section. Every cluster carries its own evidence line. */
export function Skills() {
  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="mono">02 — Skills</p>
          <h2 id="skills-title">Tech superpowers, with receipts.</h2>
          <p>
            A list of tools is not a skill. Each group below names the system that proves it.
          </p>
        </header>

        <ul className="skills__grid">
          {skillClusters.map((cluster) => (
            <li key={cluster.title} className="skill reveal">
              <h3>{cluster.title}</h3>
              <p className="skill__blurb">{cluster.blurb}</p>
              <ul className="skill__tags" aria-label={`${cluster.title} tools`}>
                {cluster.skills.map((skill) => (
                  <li key={skill}>
                    <Tag>{skill}</Tag>
                  </li>
                ))}
              </ul>
              <p className="skill__evidence">
                <span className="mono">Evidence</span>
                {cluster.evidence}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
