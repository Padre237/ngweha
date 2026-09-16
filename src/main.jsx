import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Les tokens doivent etre charges avant tout style de composant (CDC §3.3)
import './styles/tokens.css';
import './styles/global.css';

import { ToastProvider } from './components/ui/index.js';
import { registerServiceWorker } from './lib/registerServiceWorker.js';
import App from './App.jsx';

// AuthProvider n'est pas monte ici : il est charge en lazy par AuthBoundary,
// afin que la Guest Page ne telecharge jamais le SDK Firebase Auth (CDC §9.1).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);

// Mise en cache de la coquille statique, production uniquement
registerServiceWorker();
