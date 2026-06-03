"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth as useAuthContext } from "@/components/auth-provider";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  full_name: string;
}

export function useAuth() {
  const { token, user, loading, setSession, refreshUser, logout } = useAuthContext();

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    const session = await api.login(payload);
    setSession(session.access_token, session.user);
    return session.user;
  }, [setSession]);

  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    const session = await api.register(payload);
    setSession(session.access_token, session.user);
    return session.user;
  }, [setSession]);

  return {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    refreshUser,
    logout,
  };
}
