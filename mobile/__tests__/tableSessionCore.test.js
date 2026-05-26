import {
  buildTableSession,
  isSessionValid,
  SESSION_DURATION_MS,
} from '../src/utils/tableSessionCore';

describe('tableSessionCore', () => {
  test('buildTableSession sets 1 hour expiry', () => {
    const session = buildTableSession({
      tableNumber: '3',
      branchName: 'Self Kasa Cafe',
    });
    expect(session.tableName).toBe('Masa 3');
    expect(session.restaurantName).toBe('Self Kasa Cafe');
    const diff = new Date(session.expiresAt) - new Date(session.connectedAt);
    expect(diff).toBe(SESSION_DURATION_MS);
  });

  test('isSessionValid rejects expired', () => {
    expect(
      isSessionValid({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
    ).toBe(false);
  });

  test('isSessionValid accepts future expiry', () => {
    expect(
      isSessionValid({
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      })
    ).toBe(true);
  });
});
