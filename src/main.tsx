import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// A malformed persisted P&ID layout crashes App on first render, so retrying
// alone loops forever: drop the stored layouts and start from the defaults.
const restoreLayout = () => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sbp-layout-')) localStorage.removeItem(key);
  }
  window.location.reload();
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary recoverLabel="Restaurar P&ID" onRecover={restoreLayout}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
