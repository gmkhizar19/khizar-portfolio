import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly hasError: boolean;
}

/**
 * Top-level error boundary.
 *
 * A judged URL must never show a white screen. If a render throws, the visitor gets a
 * readable message and a reload action; the rest of the document (header, footer, copy)
 * is still served by the static HTML shell.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No third-party telemetry by design; the console is the only sink, which is enough
    // for a static portfolio and keeps the "no tracking" promise in the copy honest.
    console.error('Render error:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fallback" id="main">
        <h1>Something broke on this page.</h1>
        <p>
          The content is still available: email{' '}
          <a href="mailto:ghulammuhammadkhizar@gmail.com">ghulammuhammadkhizar@gmail.com</a> or
          browse the code on{' '}
          <a href="https://github.com/gmkhizar19" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
        <button type="button" className="button button--solid" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </main>
    );
  }
}
