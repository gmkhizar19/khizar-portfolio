import { Tag } from '@/components/atoms/Tag';
import type { Project } from '@/app/content';

interface ProjectCardProps {
  readonly project: Project;
}

/**
 * One project, with the numbers that make it verifiable rather than adjectives.
 * The featured variant is the only card that gets large type — hierarchy follows
 * actual importance, not decoration.
 */
export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className={`project${project.featured ? ' project--featured' : ''}`}>
      <div className="project__head">
        <span className="mono project__index">{project.index}</span>
        <p className="mono project__kicker">{project.kicker}</p>
      </div>

      <h3 className="project__title">{project.title}</h3>
      <p className="project__summary">{project.summary}</p>
      <p className="project__detail">{project.detail}</p>

      <dl className="project__metrics">
        {project.metrics.map((metric) => (
          <div key={metric.label} className="project__metric">
            <dt className="mono">{metric.label}</dt>
            <dd className="num">{metric.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="project__stack" aria-label={`${project.title} stack`}>
        {project.stack.map((item) => (
          <li key={item}>
            <Tag>{item}</Tag>
          </li>
        ))}
      </ul>

      <div className="project__links">
        {project.links.map((link) => (
          <a
            key={link.href}
            className="link-arrow"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label}
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </article>
  );
}
