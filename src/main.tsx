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
import { startEngine, useEngine, wavBase64 } from './audio/engine/engine';
import { resolvePieces, parsePieces } from './audio/engine/pieces';
import { introSequence } from './audio/lines';
import { carrierParts } from './audio/sayLetter';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startUpdates();

// Hook for the automated voice check (e2e/engine-check.mjs): start the in-app voice and fetch audio as WAV.
Object.assign(window, { __fcEngine: { start: startEngine, state: () => useEngine.getState(), wavBase64, resolvePieces, parsePieces, introSequence, carrierParts } });
