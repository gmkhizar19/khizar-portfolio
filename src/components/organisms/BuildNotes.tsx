import { buildNotes } from '@/app/content';

/**
 * "How this is built" — the on-site half of the AWS write-up.
 *
 * The judging rubric gives 25% to a working, documented AWS implementation, so the
 * architecture is explained where a judge is already looking instead of only in a
 * repository README they may never open.
 */
export function BuildNotes() {
  return (
    <section id="build" className="section" aria-labelledby="build-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="mono">06 — Build</p>
          <h2 id="build-title">{buildNotes.headline}</h2>
          <p>{buildNotes.summary}</p>
        </header>

        <ol className="pipeline reveal" aria-label="Request path">
          {['Visitor', 'Amplify CDN', 'React bundle', 'HTTP API', 'Lambda', 'DynamoDB'].map(
            (step, index, all) => (
              <li key={step} className={index >= 3 ? 'pipeline__step pipeline__step--optional' : 'pipeline__step'}>
                <span className="pipeline__index mono">{String(index + 1).padStart(2, '0')}</span>
                <span className="pipeline__label">{step}</span>
                {index === 2 ? <span className="pipeline__note mono">critical path ends here</span> : null}
                {index === all.length - 1 ? null : <span className="pipeline__arrow" aria-hidden="true" />}
              </li>
            ),
          )}
        </ol>

        <p className="build__status reveal">
          <strong>Deployment status.</strong> {buildNotes.status}
        </p>

        <div className="build__grid">
          <ul className="build__services reveal">
            {buildNotes.services.map((service) => (
              <li key={service.name}>
                <div className="build__service-head">
                  <h3>{service.name}</h3>
                  <span
                    className={`build__badge mono build__badge--${service.status}`}
                  >
                    {service.status === 'live' ? '● live' : '○ ready to deploy'}
                  </span>
                </div>
                <p className="mono build__role">{service.role}</p>
                <p>{service.detail}</p>
              </li>
            ))}
          </ul>

          <ul className="build__decisions reveal">
            {buildNotes.decisions.map((decision) => (
              <li key={decision.title}>
                <h3>{decision.title}</h3>
                <p>{decision.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
