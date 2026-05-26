import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TABLE_SESSION_KEY,
  buildTableSession,
  isSessionValid,
} from './tableSessionCore';

export {
  TABLE_SESSION_KEY,
  SESSION_DURATION_MS,
  buildTableSession,
  isSessionValid,
  formatConnectedTime,
} from './tableSessionCore';

const LEGACY_KEYS = ['tableNumber', 'branchId', 'branchName'];

export async function loadTableSession() {
  try {
    const raw = await AsyncStorage.getItem(TABLE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!isSessionValid(session)) {
      await clearTableSessionStorage();
      return null;
    }
    return session;
  } catch {
    await clearTableSessionStorage().catch(() => {});
    return null;
  }
}

export async function saveTableSession(session) {
  await AsyncStorage.setItem(TABLE_SESSION_KEY, JSON.stringify(session));
  if (session.tableNumber != null) {
    await AsyncStorage.setItem('tableNumber', JSON.stringify(session.tableNumber));
  }
  if (session.branchId != null) {
    await AsyncStorage.setItem('branchId', JSON.stringify(session.branchId));
  }
  if (session.branchName != null) {
    await AsyncStorage.setItem('branchName', JSON.stringify(session.branchName));
  }
}

export async function clearTableSessionStorage() {
  await AsyncStorage.multiRemove([TABLE_SESSION_KEY, ...LEGACY_KEYS]);
}

export async function migrateLegacyTableKeys() {
  try {
    const existing = await AsyncStorage.getItem(TABLE_SESSION_KEY);
    if (existing) return loadTableSession();

    const t = await AsyncStorage.getItem('tableNumber');
    if (!t) return null;
    const tableNumber = JSON.parse(t);
    const b = await AsyncStorage.getItem('branchId');
    const bn = await AsyncStorage.getItem('branchName');
    const session = buildTableSession({
      tableNumber,
      branchId: b ? JSON.parse(b) : null,
      branchName: bn ? JSON.parse(bn) : null,
    });
    await saveTableSession(session);
    return session;
  } catch {
    return null;
  }
}
