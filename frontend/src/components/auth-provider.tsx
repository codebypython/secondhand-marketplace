"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): { token: string | null; user: User | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  const storedToken = window.localStorage.getItem("auth_token");
  const storedUser = window.localStorage.getItem("auth_user");
  return {
    token: storedToken,
    user: storedUser ? (JSON.parse(storedUser) as User) : null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Read localStorage only after client mount to avoid hydration mismatch
  useEffect(() => {
    const stored = readStoredAuth();
    setToken(stored.token);
    setUser(stored.user);
    setMounted(true);
  }, []);

  const setSession = (nextToken: string, nextUser: User) => {
    window.localStorage.setItem("auth_token", nextToken);
    window.localStorage.setItem("auth_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }
    const nextUser = await api.me(token);
    window.localStorage.setItem("auth_user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = () => {
    window.localStorage.removeItem("auth_token");
    window.localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading: !mounted, setSession, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
