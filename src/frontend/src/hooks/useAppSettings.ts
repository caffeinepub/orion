import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark" | "bw" | "grey";

const THEME_KEY = "study-timer-theme";
const BG_KEY = "study-timer-bg";
const BG_OPACITY_KEY = "study-timer-bg-opacity";
const STARS_ENABLED_KEY = "naksha-stars-enabled";
const SHOOTING_ENABLED_KEY = "naksha-shooting-enabled";
const BELT_ENABLED_KEY = "naksha-belt-enabled";
const STARS_OPACITY_KEY = "naksha-stars-opacity";
const SHOOTING_OPACITY_KEY = "naksha-shooting-opacity";
const BELT_OPACITY_KEY = "naksha-belt-opacity";
const SOUND_ENABLED_KEY = "naksha-sound-enabled";
const TICK_ENABLED_KEY = "naksha-tick-enabled";

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
  const [starsEnabled, setStarsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STARS_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const [shootingStarEnabled, setShootingStarEnabledState] = useState<boolean>(
    () => {
      const stored = localStorage.getItem(SHOOTING_ENABLED_KEY);
      return stored === null ? true : stored === "true";
    },
  );
  const [beltEnabled, setBeltEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(BELT_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const [starsOpacity, setStarsOpacityState] = useState<number>(() => {
    const stored = localStorage.getItem(STARS_OPACITY_KEY);
    return stored ? Number(stored) : 70;
  });
  const [shootingStarOpacity, setShootingStarOpacityState] = useState<number>(
    () => {
      const stored = localStorage.getItem(SHOOTING_OPACITY_KEY);
      return stored ? Number(stored) : 80;
    },
  );
  const [beltOpacity, setBeltOpacityState] = useState<number>(() => {
    const stored = localStorage.getItem(BELT_OPACITY_KEY);
    return stored ? Number(stored) : 80;
  });
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const [tickEnabled, setTickEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(TICK_ENABLED_KEY);
    return stored === null ? false : stored === "true";
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

  function setStarsEnabled(val: boolean) {
    localStorage.setItem(STARS_ENABLED_KEY, String(val));
    setStarsEnabledState(val);
  }

  function setShootingStarEnabled(val: boolean) {
    localStorage.setItem(SHOOTING_ENABLED_KEY, String(val));
    setShootingStarEnabledState(val);
  }

  function setBeltEnabled(val: boolean) {
    localStorage.setItem(BELT_ENABLED_KEY, String(val));
    setBeltEnabledState(val);
  }

  function setStarsOpacity(val: number) {
    localStorage.setItem(STARS_OPACITY_KEY, String(val));
    setStarsOpacityState(val);
  }

  function setShootingStarOpacity(val: number) {
    localStorage.setItem(SHOOTING_OPACITY_KEY, String(val));
    setShootingStarOpacityState(val);
  }

  function setBeltOpacity(val: number) {
    localStorage.setItem(BELT_OPACITY_KEY, String(val));
    setBeltOpacityState(val);
  }

  function setSoundEnabled(val: boolean) {
    localStorage.setItem(SOUND_ENABLED_KEY, String(val));
    setSoundEnabledState(val);
  }

  function setTickEnabled(val: boolean) {
    localStorage.setItem(TICK_ENABLED_KEY, String(val));
    setTickEnabledState(val);
  }

  return {
    theme,
    setTheme,
    bgImage,
    setBgImage,
    bgOpacity,
    setBgOpacity,
    starsEnabled,
    setStarsEnabled,
    shootingStarEnabled,
    setShootingStarEnabled,
    beltEnabled,
    setBeltEnabled,
    starsOpacity,
    setStarsOpacity,
    shootingStarOpacity,
    setShootingStarOpacity,
    beltOpacity,
    setBeltOpacity,
    soundEnabled,
    setSoundEnabled,
    tickEnabled,
    setTickEnabled,
  };
}
