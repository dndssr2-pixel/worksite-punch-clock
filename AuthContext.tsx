import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Employee } from '../types/attendance.ts';
import { storageService } from '../services/storage.ts';
import { authService, AuthResponse } from '../services/authService.ts';

export interface AuthState {
  currentUser: Employee | null;
  role: 'BOSS' | 'EMPLOYEE' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  companyCode: string;
}

interface AuthContextType extends AuthState {
  loginAsBoss: (password: string) => Promise<boolean>;
  loginAsEmployee: (pin: string, id?: string) => Promise<boolean>;
  registerEmployee: (data: {
    name: string;
    email: string;
    department: string;
    pin: string;
    companyCode?: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchUser: (user: Employee) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  companyCode: 'CORP100',
  loginAsBoss: async () => false,
  loginAsEmployee: async () => false,
  registerEmployee: async () => ({ success: false }),
  logout: async () => {},
  switchUser: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const savedSession = await storageService.getActiveSession();
        if (savedSession) {
          // Verify user still exists
          const all = await storageService.getEmployees();
          const found = all.find(e => e.id === savedSession.id && e.active);
          if (found) {
            setCurrentUser(found);
          } else if (savedSession.role === 'BOSS') {
            setCurrentUser(savedSession);
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loginAsBoss = async (password: string): Promise<boolean> => {
    const res = await authService.authenticateBoss('boss@company.com', password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      await storageService.setActiveSession(res.user);
      return true;
    }
    return false;
  };

  const loginAsEmployee = async (pin: string, id?: string): Promise<boolean> => {
    const res = await authService.authenticateEmployee(pin, id);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      await storageService.setActiveSession(res.user);
      return true;
    }
    return false;
  };

  const registerEmployee = async (data: {
    name: string;
    email: string;
    department: string;
    pin: string;
    companyCode?: string;
  }): Promise<AuthResponse> => {
    const res = await authService.registerEmployee(data);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      await storageService.setActiveSession(res.user);
    }
    return res;
  };

  const logout = async (): Promise<void> => {
    await storageService.setActiveSession(null);
    setCurrentUser(null);
  };

  const switchUser = (user: Employee) => {
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        isLoading,
        companyCode: currentUser?.companyCode || 'CORP100',
        loginAsBoss,
        loginAsEmployee,
        registerEmployee,
        logout,
        switchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
