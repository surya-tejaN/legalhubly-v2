const PREFER_SESSION_KEY = "legalhubly-prefer-session";

/** Call before sign-in: rememberMe=false → sessionStorage only. */
export function setRememberPreference(rememberMe: boolean) {
  try {
    if (rememberMe) {
      sessionStorage.removeItem(PREFER_SESSION_KEY);
    } else {
      sessionStorage.setItem(PREFER_SESSION_KEY, "1");
    }
  } catch {
    // private mode / blocked storage
  }
}

function activeStorage(): Storage {
  try {
    if (sessionStorage.getItem(PREFER_SESSION_KEY) === "1") {
      return sessionStorage;
    }
  } catch {
    // fall through
  }
  return localStorage;
}

/** Supabase-compatible storage that honors Remember me. */
export const authStorage = {
  getItem: (key: string) => {
    try {
      return activeStorage().getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const store = activeStorage();
      store.setItem(key, value);
      // Keep the other store clean so sessions don't leak across modes
      const other = store === localStorage ? sessionStorage : localStorage;
      other.removeItem(key);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
