import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/vazirmatn';
import './styles/app.css';
import './styles/motion.css';
import './styles/account.css';
import './styles/tunnel.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './lib/i18n';
import { initMotion } from './lib/motion';
import { initTheme } from './lib/theme';

initTheme();
initMotion();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
