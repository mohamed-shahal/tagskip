import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './app/App';

const container = document.getElementById('root');
if (!container) throw new Error('Application root element is missing.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
