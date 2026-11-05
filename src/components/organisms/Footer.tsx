import { identity } from '@/app/content';

/** Contact + provenance footer. One tap to email, one to the repository. */
export function Footer() {
  return (
    <footer id="contact" className="footer" aria-labelledby="contact-title">
      <div className="container">
        <div className="footer__top">
          <div>
            <p className="mono">06 — Contact</p>
            <h2 id="contact-title">Let’s build something measurable.</h2>
            <p className="footer__note">{identity.availability}</p>
          </div>

          <div className="footer__actions">
            <a className="button button--solid" href={`mailto:${identity.email}`}>
              Email
            </a>
            <a
              className="button button--ghost"
              href={identity.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {identity.linkedin ? (
              <a
                className="button button--ghost"
                href={identity.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            {identity.name} · {identity.location}
          </p>
          <p>
            Built for the AWS Student Builder Challenge 2026. Network data from OpenAlex
            (CC0 1.0).
          </p>
          <a className="footer__top-link" href="#top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
