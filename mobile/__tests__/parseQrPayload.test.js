import { parseQrPayload } from '../src/utils/parseQrPayload';

describe('parseQrPayload', () => {
  it('returns null for empty input', () => {
    expect(parseQrPayload('')).toBeNull();
    expect(parseQrPayload(null)).toBeNull();
    expect(parseQrPayload('   ')).toBeNull();
  });

  it('parses URL with table and branch params', () => {
    expect(
      parseQrPayload('https://app.example.com/qr?table=12&branch=abc&branchName=Cafe')
    ).toEqual({
      tableNumber: '12',
      branchId: 'abc',
      branchName: 'Cafe',
    });
  });

  it('accepts plain numeric table number', () => {
    expect(parseQrPayload('7')).toEqual({
      tableNumber: '7',
      branchId: null,
      branchName: null,
    });
  });

  it('rejects non-numeric plain text', () => {
    expect(parseQrPayload('masa-5')).toBeNull();
  });
});
