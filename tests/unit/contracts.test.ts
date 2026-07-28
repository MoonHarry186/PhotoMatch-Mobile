import {
  signInSchema,
  signUpSchema,
  verificationOtpSchema,
} from '@/features/auth/auth.schemas';
import {
  pushPayloadSchema,
  realtimeEventSchema,
} from '@/schemas/runtime-contracts';
import { resolveDeepLink } from '@/services/navigation/deep-link';
import { localizedApiError, localizedBookingStatus } from '@/i18n/status';

describe('runtime contracts', () => {
  it('validates auth forms', () => {
    expect(
      signInSchema.safeParse({ email: 'USER@example.com', password: 'x' })
        .success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        email: 'user@example.com',
        password: 'StrongPassword1',
        confirmPassword: 'StrongPassword1',
      }).success,
    ).toBe(true);
    expect(verificationOtpSchema.safeParse('123456').success).toBe(true);
    expect(verificationOtpSchema.safeParse('12345a').success).toBe(false);
  });

  it('fails closed for malformed realtime and push payloads', () => {
    expect(
      realtimeEventSchema.safeParse({ version: 2, type: 'match.created' })
        .success,
    ).toBe(false);
    expect(
      pushPayloadSchema.safeParse({
        version: 1,
        type: 'booking',
        bookingId: 'bad',
      }).success,
    ).toBe(false);
  });

  it('resolves only versioned allow-listed deep links', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(resolveDeepLink(`photomatch://profile/${id}`)).toMatchObject({
      name: 'profile',
      id,
    });
    expect(resolveDeepLink('photomatch://admin/users')).toBeNull();
  });

  it('localizes known statuses and fails neutral for future values', () => {
    expect(localizedBookingStatus('COMPLETED', 'vi')).toBe('Hoàn tất');
    expect(localizedBookingStatus('FUTURE_STATUS', 'en')).toBe('Unknown');
    expect(localizedApiError('INVALID_CREDENTIALS', 'en')).toContain(
      'incorrect',
    );
    expect(localizedApiError('FUTURE_ERROR', 'vi')).toBe(
      'Không thể hoàn tất yêu cầu.',
    );
  });
});
