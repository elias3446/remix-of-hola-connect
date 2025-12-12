import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aplicar tema inmediatamente antes del render para evitar flash
const THEME_STORAGE_KEY = 'user_cache:theme';

function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    // System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Fallback to light
  }
  return 'light';
}

// Aplicar tema antes de renderizar
const initialTheme = getInitialTheme();
document.documentElement.classList.add(initialTheme);

// Registrar Service Worker para notificaciones push
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[App] Service Worker registrado:', registration.scope);
      
      // Escuchar actualizaciones del SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] Nueva versión disponible');
            }
          });
        }
      });
    } catch (error) {
      console.error('[App] Error registrando Service Worker:', error);
    }
  }
}

// Registrar SW después de que la página cargue
if (typeof window !== 'undefined') {
  window.addEventListener('load', registerServiceWorker);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
