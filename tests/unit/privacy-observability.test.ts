import { analytics } from '@/services/observability';
import { sanitizeErrorContext } from '@/core/errors/report-error';

describe('privacy observability guardrails', () => {
  it('filters credentials, location, media and user-generated text', () => {
    expect(
      sanitizeErrorContext({
        accessToken: 'secret',
        latitude: 10,
        message: 'private text',
        requestId: 'safe-request-id',
      }),
    ).toEqual({
      accessToken: '[Filtered]',
      latitude: '[Filtered]',
      message: '[Filtered]',
      requestId: 'safe-request-id',
    });
  });

  it('exposes only the typed analytics allow-list', () => {
    expect(() =>
      analytics.track({
        name: 'app_open',
        properties: { source: 'push' },
      }),
    ).not.toThrow();
  });
});
