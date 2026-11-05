import { earlyWork, projects } from '@/app/content';
import { ProjectCard } from '@/components/molecules/ProjectCard';

/** Projects & Achievements — required section. */
export function Projects() {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="mono">03 — Work</p>
          <h2 id="work-title">The work, and the proof behind it.</h2>
          <p>
            Two projects carry the argument: a research platform I built and then had to
            operate, and a full-stack storefront running in production. The rest is the trail
            behind them, kept visible because the progression is the point.
          </p>
        </header>

        <div className="projects">
          {featured.map((project) => (
            <div key={project.id} className="reveal">
              <ProjectCard project={project} />
            </div>
          ))}

          <div className="projects__rest">
            {rest.map((project) => (
              <div key={project.id} className="reveal">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </div>

        <div className="early reveal">
          <p className="mono">Earlier groundwork</p>
          <ul>
            {earlyWork.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.label}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
