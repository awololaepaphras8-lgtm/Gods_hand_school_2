
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for offline support and updates
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA: New content available, reload to update.');
  },
  onOfflineReady() {
    console.log("God's Hand School PWA ready for offline use.");
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
