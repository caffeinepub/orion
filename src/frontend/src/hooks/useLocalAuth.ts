import { useCallback, useEffect, useState } from "react";

interface StoredAuth {
  username: string | null;
  isGuest: boolean;
}

const STORAGE_KEY = "naksha_auth";

function readStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function useLocalAuth() {
  const [auth, setAuth] = useState<StoredAuth>(() => {
    const stored = readStorage();
    return stored ?? { username: null, isGuest: false };
  });

  useEffect(() => {
    const stored = readStorage();
    if (stored) setAuth(stored);
  }, []);

  const persist = useCallback((next: StoredAuth) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuth(next);
  }, []);

  const login = useCallback(
    (username: string) => {
      persist({ username: username.trim(), isGuest: false });
    },
    [persist],
  );

  const loginAsGuest = useCallback(() => {
    persist({ username: null, isGuest: true });
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth({ username: null, isGuest: false });
  }, []);

  return {
    user: auth.username,
    isGuest: auth.isGuest,
    isLoggedIn: auth.username !== null || auth.isGuest,
    login,
    loginAsGuest,
    logout,
  };
}
