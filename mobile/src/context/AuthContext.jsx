import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { coerceUserPoints, mergeUserFromMe } from '../utils/loyaltyPoints';

const TOKEN_KEY = 'selfkasa_token';
const USER_KEY = 'selfkasa_user';

const AuthContext = createContext(null);

async function storeToken(token) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function readToken() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function removeToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

function applyAxiosToken(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
    client.defaults.headers.common['x-auth-token'] = token;
  } else {
    delete client.defaults.headers.common.Authorization;
    delete client.defaults.headers.common['x-auth-token'];
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await readToken();
        const userJson = await AsyncStorage.getItem(USER_KEY);
        if (t && userJson) {
          applyAxiosToken(t);
          let u = coerceUserPoints(JSON.parse(userJson));
          if (!cancelled) {
            setToken(t);
            setUser(u);
          }
          try {
            const res = await client.get('/api/auth/me');
            if (cancelled) return;
            const merged = mergeUserFromMe(u, res.data);
            setUser(merged);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
          } catch (meErr) {
            console.warn('auth /me ilk senkron', meErr?.message || meErr);
          }
        }
      } catch (e) {
        console.warn('Auth restore', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (t, u) => {
    const normalized = coerceUserPoints(u);
    await storeToken(t);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
    applyAxiosToken(t);
    setToken(t);
    setUser(normalized);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await client.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { token: t, user: u } = res.data;
      await persistSession(t, u);
      return u;
    },
    [persistSession]
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      const res = await client.post('/api/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        name: name?.trim() || undefined,
        role: 'musteri',
      });
      const { token: t, user: u } = res.data;
      await persistSession(t, u);
      return u;
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await removeToken();
    await AsyncStorage.removeItem(USER_KEY);
    applyAxiosToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const t = await readToken();
      if (!t) return;
      const res = await client.get('/api/auth/me');
      setUser((prev) => {
        const merged = mergeUserFromMe(prev || {}, res.data);
        AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    } catch (e) {
      console.warn('refreshUser', e?.message || e);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, ready, login, register, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde olmalı');
  return ctx;
}

export function showComingSoon(title = 'Yakında') {
  Alert.alert(title, 'Bu özellik yakında eklenecek.');
}
