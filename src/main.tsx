import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './theme/app.css';
import { startUpdates } from './update';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startUpdates();
