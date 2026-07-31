import { bookingStatusLabel } from '@/features/bookings/booking-list';
import { validateReviewInput } from '@/features/bookings/booking.api';
import { queryKeys } from '@/services/api/query-keys';

describe('booking and scoped trust primitives', () => {
  it('localizes known and unknown booking statuses neutrally', () => {
    expect(bookingStatusLabel('PENDING')).toBe('Đang chờ');
    expect(bookingStatusLabel('SERVER_ADDED_STATUS')).toBe('Không xác định');
  });

  it('keeps booking filters and role scope in query keys', () => {
    const scope = { userId: 'user-1', roleId: 'role-1' };
    expect(queryKeys.bookings(scope, { status: 'PENDING' })).toEqual([
      'private',
      'user-1',
      'role-1',
      'bookings',
      { status: 'PENDING' },
    ]);
  });

  it('enforces one integer rating from 1 to 5 and bounded comment', () => {
    expect(validateReviewInput(1)).toBe(true);
    expect(validateReviewInput(5, 'Tốt')).toBe(true);
    expect(validateReviewInput(0)).toBe(false);
    expect(validateReviewInput(4.5)).toBe(false);
    expect(validateReviewInput(4, 'x'.repeat(2_001))).toBe(false);
  });
});
