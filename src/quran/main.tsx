import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/styles/global.css';
import { QuranApp } from './QuranApp.tsx';
import { registerQuranOffline } from './register-offline.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Missing Quran app root.');
registerQuranOffline();
createRoot(root).render(
  <StrictMode>
    <QuranApp />
  </StrictMode>,
);
