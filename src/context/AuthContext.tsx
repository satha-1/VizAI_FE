import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check for existing session
    const storedUser = sessionStorage.getItem('vizai_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo, always succeed with a generic user structure
    const authenticatedUser: User = {
      id: 'user-001',
      name: 'Demo User',
      email: _email,
      avatar_url: undefined,
      role: 'Researcher' as const,
    };
    setUser(authenticatedUser);
    sessionStorage.setItem('vizai_user', JSON.stringify(authenticatedUser));
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('vizai_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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

