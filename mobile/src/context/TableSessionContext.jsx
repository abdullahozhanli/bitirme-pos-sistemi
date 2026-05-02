import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const TABLE_KEY = 'tableNumber';
const BRANCH_KEY = 'branchId';

const TableSessionContext = createContext(null);

export function TableSessionProvider({ children }) {
  const { token, ready } = useAuth();
  const [tableNumber, setTableNumberState] = useState(null);
  const [branchId, setBranchIdState] = useState(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setTableNumberState(null);
      setBranchIdState(null);
      AsyncStorage.removeItem(TABLE_KEY).catch(() => {});
      AsyncStorage.removeItem(BRANCH_KEY).catch(() => {});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const t = await AsyncStorage.getItem(TABLE_KEY);
        const b = await AsyncStorage.getItem(BRANCH_KEY);
        if (cancelled) return;
        setTableNumberState(t ? JSON.parse(t) : null);
        setBranchIdState(b ? JSON.parse(b) : null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  const setTableNumber = useCallback(async (value) => {
    setTableNumberState(value);
    try {
      if (value != null && value !== '') {
        await AsyncStorage.setItem(TABLE_KEY, JSON.stringify(value));
      } else {
        await AsyncStorage.removeItem(TABLE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setBranchId = useCallback(async (value) => {
    setBranchIdState(value);
    try {
      if (value != null && value !== '') {
        await AsyncStorage.setItem(BRANCH_KEY, JSON.stringify(value));
      } else {
        await AsyncStorage.removeItem(BRANCH_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const clearTableSession = useCallback(async () => {
    setTableNumberState(null);
    setBranchIdState(null);
    try {
      await AsyncStorage.multiRemove([TABLE_KEY, BRANCH_KEY]);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      tableNumber,
      branchId,
      setTableNumber,
      setBranchId,
      clearTableSession,
    }),
    [tableNumber, branchId, setTableNumber, setBranchId, clearTableSession]
  );

  return (
    <TableSessionContext.Provider value={value}>
      {children}
    </TableSessionContext.Provider>
  );
}

export function useTableSession() {
  const ctx = useContext(TableSessionContext);
  if (!ctx) {
    throw new Error('useTableSession TableSessionProvider içinde olmalı');
  }
  return ctx;
}
