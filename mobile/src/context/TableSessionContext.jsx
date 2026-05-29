import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  buildTableSession,
  clearTableSessionStorage,
  isSessionValid,
  loadTableSession,
  migrateLegacyTableKeys,
  saveTableSession,
} from '../utils/tableSessionStorage';

const TableSessionContext = createContext(null);

function applySessionToState(session, setters) {
  if (!session) {
    setters.setTableSession(null);
    setters.setTableNumber(null);
    setters.setBranchId(null);
    setters.setBranchName(null);
    return;
  }
  setters.setTableSession(session);
  setters.setTableNumber(session.tableNumber ?? null);
  setters.setBranchId(session.branchId ?? session.restaurantId ?? null);
  setters.setBranchName(session.branchName ?? session.restaurantName ?? null);
}

export function TableSessionProvider({ children }) {
  const { token, ready } = useAuth();
  const [tableSession, setTableSession] = useState(null);
  const [tableNumber, setTableNumberState] = useState(null);
  const [branchId, setBranchIdState] = useState(null);
  const [branchName, setBranchNameState] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const setters = useMemo(
    () => ({
      setTableSession,
      setTableNumber: setTableNumberState,
      setBranchId: setBranchIdState,
      setBranchName: setBranchNameState,
    }),
    []
  );

  const hydrate = useCallback(
    (session) => {
      applySessionToState(session, setters);
    },
    [setters]
  );

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      hydrate(null);
      setSessionReady(true);
      clearTableSessionStorage().catch(() => {});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        let session = await loadTableSession();
        if (!session) session = await migrateLegacyTableKeys();
        if (!cancelled) {
          hydrate(isSessionValid(session) ? session : null);
        }
      } catch {
        if (!cancelled) hydrate(null);
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, hydrate]);

  const connectFromQr = useCallback(
    async ({ tableNumber: num, branchId: bid, branchName: bname, tableId, restaurantId, restaurantName }) => {
      const session = buildTableSession({
        tableNumber: num,
        branchId: bid,
        branchName: bname,
        tableId,
        restaurantId,
        restaurantName,
      });
      await saveTableSession(session);
      hydrate(session);
      return session;
    },
    [hydrate]
  );

  const setTableNumber = useCallback(
    async (value) => {
      if (tableSession && isSessionValid(tableSession)) {
        const next = {
          ...tableSession,
          tableNumber: value,
          tableName: value ? `Masa ${value}` : tableSession.tableName,
        };
        await saveTableSession(next);
        hydrate(next);
        return;
      }
      setTableNumberState(value);
      if (value != null && value !== '') {
        const session = buildTableSession({ tableNumber: value });
        await saveTableSession(session);
        hydrate(session);
      }
    },
    [tableSession, hydrate]
  );

  const setBranchId = useCallback(
    async (value) => {
      if (tableSession) {
        const next = { ...tableSession, branchId: value, restaurantId: value || tableSession.restaurantId };
        await saveTableSession(next);
        hydrate(next);
        return;
      }
      setBranchIdState(value);
    },
    [tableSession, hydrate]
  );

  const setBranchName = useCallback(
    async (value) => {
      const name = value != null ? String(value).trim() : '';
      if (tableSession) {
        const currentName = String(tableSession.branchName || '').trim();
        if (name === currentName) return;
        const next = {
          ...tableSession,
          branchName: name || null,
          restaurantName: name || tableSession.restaurantName,
        };
        await saveTableSession(next);
        hydrate(next);
        return;
      }
      setBranchNameState((prev) => {
        const prevName = prev != null ? String(prev).trim() : '';
        return name === prevName ? prev : name || null;
      });
    },
    [tableSession, hydrate]
  );

  const clearTableSession = useCallback(async () => {
    await clearTableSessionStorage();
    hydrate(null);
  }, [hydrate]);

  /** Ana sayfa odaklanınca süre dolumu kontrolü */
  const refreshTableSession = useCallback(async () => {
    const session = await loadTableSession();
    hydrate(session);
    return session;
  }, [hydrate]);

  const isTableConnected = Boolean(tableSession && isSessionValid(tableSession));

  const value = useMemo(
    () => ({
      tableSession,
      tableNumber,
      branchId,
      branchName,
      sessionReady,
      isTableConnected,
      connectFromQr,
      setTableNumber,
      setBranchId,
      setBranchName,
      clearTableSession,
      refreshTableSession,
    }),
    [
      tableSession,
      tableNumber,
      branchId,
      branchName,
      sessionReady,
      isTableConnected,
      connectFromQr,
      setTableNumber,
      setBranchId,
      setBranchName,
      clearTableSession,
      refreshTableSession,
    ]
  );

  return (
    <TableSessionContext.Provider value={value}>{children}</TableSessionContext.Provider>
  );
}

export function useTableSession() {
  const ctx = useContext(TableSessionContext);
  if (!ctx) {
    throw new Error('useTableSession TableSessionProvider içinde olmalı');
  }
  return ctx;
}
