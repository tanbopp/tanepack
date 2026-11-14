// Vite client entry point mounting React root and base M3 stylesheets
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import '@app/styles/fonts.css';
import '@app/styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root mount element #root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
