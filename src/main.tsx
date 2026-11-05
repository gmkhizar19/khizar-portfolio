import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted variable fonts: no third-party request, no layout shift, no tracking.
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';

import { App } from './App';
import { ErrorBoundary } from './app/ErrorBoundary';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/game.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
