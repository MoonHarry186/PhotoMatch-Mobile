import { queryKeys } from '@/services/api/query-keys';
import {
  formatApproximateDistance,
  formatPrice,
  formatRating,
} from '@/utils/format';

describe('formatting and cache isolation', () => {
  it('formats localized values without exact GPS', () => {
    expect(formatPrice(1_000_000, 'VND', 'vi')).toContain('1.000.000');
    expect(formatRating(4.75, 'en')).toBe('4.8');
    expect(formatApproximateDistance(1234, 'vi')).toBe('Cách khoảng 1 km');
  });

  it('namespaces private keys by account and role', () => {
    expect(queryKeys.me({ userId: 'u1', roleId: 'r1' })).not.toEqual(
      queryKeys.me({ userId: 'u1', roleId: 'r2' }),
    );
  });
});
