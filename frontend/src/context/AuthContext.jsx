import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const resp = await api.get('/auth/me');
        setUser(resp.data);
        localStorage.setItem('user', JSON.stringify(resp.data));
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const resp = await api.post('/auth/login', { email, password });
    const { token, user: userData } = resp.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const resp = await api.post('/auth/register', { name, email, password });
    const { token, user: userData } = resp.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const loginDemo = async () => {
    // Generate an instant ephemeral demo account
    const randomId = Math.random().toString(36).substring(2, 7);
    const demoEmail = `demo.${randomId}@example.com`;
    const demoPassword = 'DemoPassword123!';

    const userData = await register('Alex Morgan (Demo)', demoEmail, demoPassword);
    // Auto-seed demo emails
    try {
      await api.post('/gmail/demo-connect');
    } catch (e) {
      console.warn('Demo emails seeding error:', e);
    }
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const resp = await api.get('/auth/me');
      setUser(resp.data);
      localStorage.setItem('user', JSON.stringify(resp.data));
      return resp.data;
    } catch (err) {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        loginDemo,
        logout,
        refreshUser,
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
