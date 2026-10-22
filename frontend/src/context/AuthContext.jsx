"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  Suspense,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ERROR_MESSAGES } from "@/lib/messages";

const AuthContext = createContext(null);

function AuthRouteWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.must_change_password) {
        if (pathname !== "/change-password") {
          router.push("/change-password");
        }
      } else if (pathname === "/login") {
        router.push("/items");
      }
    }
  }, [user, loading, pathname, router]);

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const router = useRouter();

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      try {
        const data = await api("/api/auth/me");
        if (!ignore) {
          setUser(data.user);
          setAuthError(null);
        }
      } catch (err) {
        if (!ignore) {
          setUser(null);
          const currentPath =
            typeof window !== "undefined" ? window.location.pathname : "";
          if (err instanceof ApiError) {
            if (err.code === "ACCOUNT_DISABLED" || err.status === 403) {
              setAuthError(ERROR_MESSAGES.ACCOUNT_DISABLED);
              if (currentPath !== "/login") {
                router.push("/login");
              }
            } else if (err.code === "PASSWORD_CHANGE_REQUIRED") {
              if (currentPath !== "/change-password") {
                router.push("/change-password");
              }
            } else if (err.code === "UNAUTHENTICATED" || err.status === 401) {
              if (currentPath !== "/login") {
                router.push("/login");
              }
            }
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      ignore = true;
    };
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = async ({ email, password }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setUser(data.user);
      if (data.user.must_change_password) {
        router.push("/change-password");
      } else {
        router.push("/items");
      }
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore network or logout error and proceed to clear local state
    } finally {
      setUser(null);
      setLoading(false);
      router.push("/login");
    }
  };

  const changePassword = async ({ current_password, new_password }) => {
    const data = await api("/api/auth/change-password", {
      method: "POST",
      body: { current_password, new_password },
    });
    setUser(data.user);
    router.push("/items");
    return data.user;
  };

  const clearAuthError = () => setAuthError(null);

  const value = {
    user,
    loading,
    authError,
    setAuthError,
    clearAuthError,
    login,
    logout,
    changePassword,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      <Suspense fallback={null}>
        <AuthRouteWatcher />
      </Suspense>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
