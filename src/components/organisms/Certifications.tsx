import { courseGroups, specializations, type Credential } from '@/app/content';

const courseCount = courseGroups.reduce((total, group) => total + group.courses.length, 0);

function CredentialCard({ credential }: { readonly credential: Credential }) {
  const body = (
    <>
      <div className="credential__media">
        <img
          src={credential.image}
          alt={`Coursera certificate: ${credential.title}, completed by Ghulam Muhammad Khizar`}
          width={880}
          height={461}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="credential__body">
        <span className="credential__issuer mono">{credential.issuer}</span>
        <h3 className="credential__title">{credential.title}</h3>
        <span className="credential__date mono">Completed {credential.date}</span>
        <p className="credential__scope">{credential.scope}</p>
        {credential.href ? (
          <span className="credential__verify">Verify on Coursera ↗</span>
        ) : null}
      </div>
    </>
  );

  return (
    <li className="credential">
      {credential.href ? (
        <a
          href={credential.href}
          target="_blank"
          rel="noopener noreferrer"
          className="credential__link"
        >
          {body}
        </a>
      ) : (
        <div className="credential__link">{body}</div>
      )}
    </li>
  );
}

/**
 * Certifications as their own section — three specialisations with the actual certificate
 * artwork behind each one, a verification link, and the twenty course certificates one
 * click away.
 *
 * Three big cards, not twenty badges: a wall of badges dilutes the signal. The
 * specialisations are the claim; the course list is the receipt. The image matters because
 * a judge or recruiter can read the name, issuer and date without leaving the page, and
 * the link means they never have to trust a picture alone.
 */
export function Certifications() {
  return (
    <section id="certifications" className="section" aria-labelledby="certs-title">
      <div className="container">
        <header className="section-head reveal">
          <p className="mono">04 — Certifications</p>
          <h2 id="certs-title">Trained for the job, not the badge.</h2>
          <p>
            {specializations.length} specialisations and {courseCount} course certificates
            between June and October 2026. Each card links to Coursera's own verification
            page, so nothing here has to be taken on trust.
          </p>
        </header>

        <ul className="credentials__grid reveal">
          {specializations.map((credential) => (
            <CredentialCard key={credential.title} credential={credential} />
          ))}
        </ul>

        <details className="credentials__all reveal">
          <summary>All {courseCount} course certificates</summary>
          <div className="credentials__groups">
            {courseGroups.map((group) => (
              <section key={group.issuer} aria-label={`${group.issuer} certificates`}>
                <h4>
                  {group.issuer} <span className="mono">{group.date}</span>
                </h4>
                <ul>
                  {group.courses.map((course) => (
                    <li key={course}>{course}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
