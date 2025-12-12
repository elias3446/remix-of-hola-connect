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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
