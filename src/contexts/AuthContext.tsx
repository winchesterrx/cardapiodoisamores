import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'courier';
  phone: string;
  delivery_fee: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        if (storedToken.startsWith('mock-')) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          const decoded: any = jwtDecode(storedToken);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            logout();
          } else {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (e) {
        logout();
      }
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
