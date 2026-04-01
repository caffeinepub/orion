import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark" | "bw" | "grey";

const THEME_KEY = "study-timer-theme";
const BG_KEY = "study-timer-bg";
const BG_OPACITY_KEY = "study-timer-bg-opacity";

function applyTheme(theme: AppTheme) {
  const el = document.documentElement;
  el.classList.remove("theme-light", "theme-dark", "theme-bw", "theme-grey");
  el.classList.add(`theme-${theme}`);
}

export function useAppSettings() {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem(THEME_KEY) as AppTheme) ?? "light";
  });
  const [bgImage, setBgImageState] = useState<string | null>(() => {
    return localStorage.getItem(BG_KEY);
  });
  const [bgOpacity, setBgOpacityState] = useState<number>(() => {
    const stored = localStorage.getItem(BG_OPACITY_KEY);
    return stored ? Number(stored) : 80;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(t: AppTheme) {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
    applyTheme(t);
  }

  function setBgImage(url: string | null) {
    if (url) {
      localStorage.setItem(BG_KEY, url);
    } else {
      localStorage.removeItem(BG_KEY);
    }
    setBgImageState(url);
  }

  function setBgOpacity(val: number) {
    localStorage.setItem(BG_OPACITY_KEY, String(val));
    setBgOpacityState(val);
  }

  return { theme, setTheme, bgImage, setBgImage, bgOpacity, setBgOpacity };
}
