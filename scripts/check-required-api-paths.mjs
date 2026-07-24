import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const required = [
  '/api/v1/auth/sign-in',
  '/api/v1/auth/refresh',
  '/api/v1/me',
  '/api/v1/me/onboarding/progress',
  '/api/v1/me/profile',
  '/api/v1/discovery/candidates',
  '/api/v1/conversations/{conversationId}/messages',
  '/api/v1/bookings',
  '/api/v1/bookings/{bookingId}/review',
  '/api/v1/uploads/presign',
  '/api/v1/me/restrictions',
  '/api/v1/me/settings',
];

const document = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../photomatch-api/openapi.json'),
    'utf8',
  ),
);

const missing = required.filter((path) => !document.paths?.[path]);
if (missing.length) {
  throw new Error(
    `OpenAPI is missing required mobile paths:\n${missing.join('\n')}`,
  );
}

process.stdout.write(
  `Verified ${required.length} required mobile API paths.\n`,
);
