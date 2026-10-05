import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initializeGlobalHaptics } from './utils/haptics.ts';
import { initStatusBarHelper } from './utils/statusBarHelper.ts';
import { initNotificationScheduler } from './utils/notificationScheduler.ts';
import './index.css';

// Initialize global haptics, status bar and notification scheduler
initializeGlobalHaptics();
initStatusBarHelper();
initNotificationScheduler();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
