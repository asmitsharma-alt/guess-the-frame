import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('gtf_access_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.data?.success && res.data?.data) {
            setUser(res.data.data);
          }
        } catch (e) {
          localStorage.removeItem('gtf_access_token');
          localStorage.removeItem('gtf_refresh_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (emailOrUsername, password) => {
    const res = await authApi.login({ emailOrUsername, password });
    if (res.data?.success && res.data?.data) {
      const { user: userData, tokens } = res.data.data;
      localStorage.setItem('gtf_access_token', tokens.accessToken);
      localStorage.setItem('gtf_refresh_token', tokens.refreshToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.data?.error || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.data?.success && res.data?.data) {
      const { user: newUser, tokens } = res.data.data;
      localStorage.setItem('gtf_access_token', tokens.accessToken);
      localStorage.setItem('gtf_refresh_token', tokens.refreshToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error(res.data?.error || 'Registration failed');
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('gtf_refresh_token');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (e) {}
    localStorage.removeItem('gtf_access_token');
    localStorage.removeItem('gtf_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
