import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // parent user
  const [child, setChild] = useState(null); // logged-in child
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser, storedChild] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('child'),
      ]);
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedChild) setChild(JSON.parse(storedChild));
      }
    } catch (err) {
      console.error('Load auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    await AsyncStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    setChild(null);
    return u;
  }

  async function register(email, password, name, familyName) {
    const res = await api.post('/auth/register', { email, password, name, familyName });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    await AsyncStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    setChild(null);
    return u;
  }

  async function childLogin(childId, pin) {
    const res = await api.post('/auth/child-login', { childId, pin });
    const { token: t, child: c } = res.data;
    await AsyncStorage.setItem('token', t);
    await AsyncStorage.setItem('child', JSON.stringify(c));
    setToken(t);
    setChild(c);
    setUser(null);
    return c;
  }

  async function logout() {
    await AsyncStorage.multiRemove(['token', 'user', 'child']);
    setToken(null);
    setUser(null);
    setChild(null);
  }

  const isParent = !!user;
  const isChild = !!child;
  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      user, child, token, loading, isParent, isChild, isAuthenticated,
      login, register, childLogin, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
