import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { bindPreferencesToDocument } from './app/preferences';
import { startLiveFeed } from './features/live/live-connection';
import { ApiRequestError } from './lib/api';

bindPreferencesToDocument();
// Module-level, started once: StrictMode's double effects must not open and abort a second socket.
startLiveFeed();

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container, {
  // API failures already render as a section's error state with a retry; they are not crashes.
  onCaughtError(error, info) {
    if (!(error instanceof ApiRequestError)) console.error(error, info.componentStack);
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
