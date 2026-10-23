import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, getStoredUser, clearUser } from '@/utils/auth';
import { apiFetch, onSessionExpired } from '@/utils/apiFetch';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初始化时从本地存储加载用户信息
    const unsubscribe = onSessionExpired(() => {
      void clearUser().then(() => setUser(null));
    });
    getStoredUser().then(async storedUser => {
      if (storedUser) {
        try {
          const response = await apiFetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/auth/me`);
          if (!response.ok) {
            await clearUser();
            storedUser = null;
          }
        } catch {
          // Keep the session during a temporary network outage.
        }
      }
      setUser(storedUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = useCallback(async () => {
    await clearUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
