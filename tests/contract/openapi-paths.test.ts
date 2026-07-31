import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('generated backend contract', () => {
  const document = JSON.parse(
    readFileSync(
      resolve(process.cwd(), '../photomatch-api/openapi.json'),
      'utf8',
    ),
  ) as { paths: Record<string, unknown> };

  it.each([
    '/api/v1/auth/refresh',
    '/api/v1/me/onboarding/progress',
    '/api/v1/discovery/candidates',
    '/api/v1/swipes',
    '/api/v1/interests/incoming',
    '/api/v1/interests/{interestId}/decision',
    '/api/v1/matches',
    '/api/v1/matches/{matchId}',
    '/api/v1/matches/{matchId}/unmatch',
    '/api/v1/conversations/{conversationId}/messages',
    '/api/v1/bookings',
    '/api/v1/bookings/{bookingId}/review',
    '/api/v1/uploads/presign',
    '/api/v1/me/restrictions',
    '/api/v1/me/settings',
  ])('contains %s', (path) => {
    expect(document.paths[path]).toBeDefined();
  });
});
