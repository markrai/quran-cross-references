import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/styles/global.css';
import { QuranApp } from './QuranApp.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Missing Quran app root.');
createRoot(root).render(
  <StrictMode>
    <QuranApp />
  </StrictMode>,
);
