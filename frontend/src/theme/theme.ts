import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// Also read by the inline script in index.html, which applies the theme before the first paint.
const STORAGE_KEY = "devdutt-theme";

const listeners = new Set<() => void>();
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => listener());
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// An explicit choice is remembered in this browser; until then the site follows the system setting.
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (e.g. private mode): the choice still applies until the page is closed.
  }
  apply(theme);
}

systemDark.addEventListener("change", (event) => {
  if (!savedTheme()) apply(event.matches ? "dark" : "light");
});

// Keeps other open tabs in step with a choice made here.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) apply(savedTheme() ?? (systemDark.matches ? "dark" : "light"));
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
}
