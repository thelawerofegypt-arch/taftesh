import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker
registerSW({
  onNeedRefresh() {
    if (confirm('يتوفر تحديث جديد للتطبيق، هل تود التحديث الآن؟')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('التطبيق جاهز للعمل بدون اتصال');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
