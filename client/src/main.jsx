import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AppProvider } from "./context/AppContext.jsx";
import { Toaster } from 'react-hot-toast'; // ✅ Required for toast popup support

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <AppProvider>
          <App />
          {/* <Toaster position="top-center" reverseOrder={false} /> ✅ Enables toast messages */}
        </AppProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
