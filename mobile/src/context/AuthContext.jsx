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
import {
  deleteProfileAvatarRequest,
  uploadProfileAvatarFile,
} from '../api/profileAvatarApi';
import {
  isUnauthorizedError,
  notifyUnauthorized,
  registerUnauthorizedHandler,
} from '../api/authSession';
import { API_BASE_URL_CANDIDATES } from '../constants/config';
import { isStrongPassword } from '../utils/authValidation';
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
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    return t ? String(t).trim() : null;
  }
  const t = await SecureStore.getItemAsync(TOKEN_KEY);
  return t ? String(t).trim() : null;
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
            if (isUnauthorizedError(meErr)) {
              await notifyUnauthorized({ silent: true });
            } else {
              console.warn('auth /me ilk senkron', meErr?.message || meErr);
            }
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
    const raw = typeof t === 'string' ? t.trim() : t;
    const normalized = coerceUserPoints(u);
    await storeToken(raw);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
    applyAxiosToken(raw);
    setToken(raw);
    setUser(normalized);
  }, []);

  const login = useCallback(
    async (identifier, password) => {
      const res = await client.post('/api/auth/login', {
        email: String(identifier || '').trim().toLowerCase(),
        password,
      });
      const { token: t, user: u } = res.data;
      const normalized = {
        ...u,
        passwordMeetsPolicy:
          u?.passwordMeetsPolicy === true || isStrongPassword(password),
      };
      await persistSession(t, normalized);
      return normalized;
    },
    [persistSession]
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      const res = await client.post('/api/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        name: name?.trim() || undefined,
      });
      const { token: t, user: u } = res.data;
      const normalized = {
        ...u,
        passwordMeetsPolicy: u?.passwordMeetsPolicy === true || isStrongPassword(password),
      };
      await persistSession(t, normalized);
      return normalized;
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

  useEffect(() => {
    registerUnauthorizedHandler(async ({ silent } = {}) => {
      await removeToken();
      await AsyncStorage.removeItem(USER_KEY);
      applyAxiosToken(null);
      setToken(null);
      setUser(null);
      if (!silent) {
        Alert.alert(
          'Oturum sona erdi',
          'Güvenlik için tekrar giriş yapmanız gerekiyor. (Backend yeniden başlatıldıysa veya uzun süre açık kaldıysa normaldir.)'
        );
      }
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const t = await readToken();
      if (!t) return;
      applyAxiosToken(t);
      const res = await client.get('/api/auth/me');
      setUser((prev) => {
        const merged = mergeUserFromMe(prev || {}, res.data);
        AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    } catch (e) {
      if (isUnauthorizedError(e)) {
        await notifyUnauthorized({ silent: true });
      } else {
        console.warn('refreshUser', e?.message || e);
      }
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const t = await readToken();
    if (!t) throw new Error('Oturum bulunamadı');
    applyAxiosToken(t);

    const bearer = `Bearer ${t}`;
    const body = JSON.stringify(payload);
    let lastErr;
    for (const base of API_BASE_URL_CANDIDATES) {
      const url = `${String(base).replace(/\/+$/, '')}/api/auth/me`;
      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: bearer,
            'x-auth-token': t,
          },
          body,
        });
        const text = await res.text();
        let data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text.slice(0, 200) };
          }
        }
        if (!res.ok) {
          const err = new Error(data.message || `HTTP ${res.status}`);
          err.response = { status: res.status, data };
          lastErr = err;
          if (res.status === 401 || res.status === 403) {
            await notifyUnauthorized();
            throw err;
          }
          continue;
        }
        setUser((prev) => {
          const merged = mergeUserFromMe(prev || {}, data);
          AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
          return merged;
        });
        return data;
      } catch (e) {
        lastErr = e;
        if (isUnauthorizedError(e)) {
          await notifyUnauthorized();
          throw e;
        }
        if (e?.message && !String(e.message).includes('Network')) throw e;
      }
    }
    throw lastErr || new Error('Profil güncellenemedi');
  }, []);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const res = await client.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data;
  }, []);

  const applyMeToUser = useCallback((data) => {
    setUser((prev) => {
      const merged = mergeUserFromMe(prev || {}, data);
      AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
    return data;
  }, []);

  const uploadProfileAvatar = useCallback(
    async (localUri) => {
      const data = await uploadProfileAvatarFile(localUri);
      return applyMeToUser(data);
    },
    [applyMeToUser]
  );

  const removeProfileAvatar = useCallback(async () => {
    const data = await deleteProfileAvatarRequest();
    return applyMeToUser(data);
  }, [applyMeToUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      register,
      logout,
      refreshUser,
      applyMeToUser,
      updateProfile,
      uploadProfileAvatar,
      removeProfileAvatar,
      changePassword,
    }),
    [
      user,
      token,
      ready,
      login,
      register,
      logout,
      refreshUser,
      applyMeToUser,
      updateProfile,
      uploadProfileAvatar,
      removeProfileAvatar,
      changePassword,
    ]
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
