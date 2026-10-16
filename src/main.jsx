import React from 'react';
import ReactDOM from 'react-dom/client';
import { parseInviteTokenFromHash } from './domain/parentInvite';
import './index.css';

// Public parent/student link (#/share-input/<token>) renders a standalone page:
// no login gate, and the main App bundle is never downloaded.
const inviteToken = parseInviteTokenFromHash(window.location.hash);

async function boot() {
  const Page = inviteToken
    ? (await import('./components/public/ParentStudentInputView')).default
    : (await import('./App')).default;
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Page token={inviteToken} />
    </React.StrictMode>
  );
}

boot();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
