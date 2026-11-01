# Test coverage note

## Run the tests

```bash
npm install
npm test                 # one command, runs the whole suite
npm run test:coverage    # same tests, with a coverage report in coverage/
```

The first run downloads a MongoDB server binary (about 200 MB) for the in-memory test database. Later runs use the cached copy.

## Result

116 tests across 5 files, all passing.

| Measure | Coverage |
|---|---|
| Statements | 97.8% |
| Branches | 90.6% |
| Functions | 94.7% |

Percentages are from the v8 coverage tool. They show which code ran, not whether the assertions are right. The assertions were checked by deliberately reintroducing a known bug (the Express 5 query assignment). Eleven tests failed, which confirms they catch regressions.

## What is tested

**Unit tests** (`tests/unit/`)
- Zod schemas for rooms, users, bookings, availability dates and list queries: defaults, limits, normalisation, and rejection of invalid input. Includes the booking rules that can be checked without the database (duration, half-hour alignment, end after start).
- Middleware: `validate` (400 with field details), `requireAuth` (missing, wrong-scheme, tampered, expired and valid tokens), `requireRole` (allowed, forbidden, and no user attached).
- `ApiError` serialisation and factory methods.

**Integration tests** (`tests/integration/`), run against the real Express app and a throwaway MongoDB
- Auth: registration (including the role field being ignored, email normalisation, and duplicate emails, both sequential and simultaneous), login (correct, wrong password, unknown email with an identical response, missing password), malformed JSON, oversized bodies and unexpected server errors (the message must not leak).
- Rooms: public and authenticated listing, active-only visibility, filtering, pagination, admin-only create, update and delete, partial updates that leave other fields alone, renames, duplicate names, deleting rooms with upcoming bookings (refused) and with only cancelled bookings (allowed), and the availability grid.
- Bookings: creation, conflicts (exact, partial, and back-to-back, which is allowed), opening hours, duration, half-hour alignment, past starts, capacity, the 3-booking limit (cancelled bookings do not count), listing and filters, owner/admin/other-student cancellation, cancelling twice, cancelling a booking that has started, and a freed slot becoming bookable again.
- Status codes covered: 200, 201, 204, 400, 401, 403, 404, 409, 413 and 500.

## What is not tested, and why

- **Concurrent double booking.** The overlap check runs in the application, so two simultaneous requests for the same slot can both succeed. A test for this would be timing-dependent and would fail on purpose. It is recorded as a known risk in the one-pager and the issue log, and it should get a test once slot documents with a unique index are in place.
- **Rate limiting.** The limiter is switched off when `NODE_ENV` is `test`, so the suite can make many requests in a row. This means the 20-attempts-per-15-minutes limit itself is not verified. A separate test with its own app instance would close this gap.
- **Startup failure when `JWT_SECRET` is missing** (`src/config/env.ts`). The check runs when the module is first imported, so testing it needs module reloading. It was checked manually instead.
- **Daylight saving changes.** The test timezone is Africa/Lagos, which has no daylight saving. The conversion code handles offsets generically, but the transition days are not tested. Opening hours that cross midnight in local time are also not tested.
- **The seed script** (`src/scripts/seed.ts`). It is a development tool and is not part of the API behaviour under test.
- **Swagger UI, CORS and security headers.** These are configuration, and they were checked by hand in the browser and with curl.
- **Deployed behaviour.** Tests run against an in-memory MongoDB, not Atlas. Index build timing, connection failover and the free-tier sleep behaviour on Render are not covered.
- **Performance.** Pagination is tested with a few records only. There are no load tests and no tests with large collections.
- **Error handler branch for other 4xx body errors.** The 413 path is tested. Other body-parser errors follow the same branch but have no separate test.