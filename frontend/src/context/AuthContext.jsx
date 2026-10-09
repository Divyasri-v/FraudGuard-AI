import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { role: 'Fraud Analyst', email: 'analyst@fraudguard.demo', password: 'Analyst@123', label: 'Fraud Analyst (Marcus Vance)' },
  { role: 'Investigator', email: 'investigator@fraudguard.demo', password: 'Investigator@123', label: 'Investigator (Elena Rostova)' }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fraudguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('fraudguard_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      const { access_token, user: userData } = res.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('fraudguard_token', access_token);
      localStorage.setItem('fraudguard_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify demo credentials.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fraudguard_token');
    localStorage.removeItem('fraudguard_user');
  };

  const switchAccount = async (email, password) => {
    return await login(email, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        switchAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
