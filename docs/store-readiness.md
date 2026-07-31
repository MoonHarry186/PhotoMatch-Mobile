# Store and data-safety readiness

The app requests only photo/library, location-when-in-use and notification
permissions with Vietnamese explanatory copy in `app.config.ts`. Exact
coordinates, push tokens, signed URLs and user-generated text are excluded from
analytics and Sentry context by the runtime sanitizers.

Before submission, attach the final privacy label/data-safety declarations,
support URL, legal URLs, screenshots for Customer and Photographer, release
notes, and the approved TestFlight/Play internal acceptance record to the
release ticket. This checklist intentionally contains no user data or secrets.
