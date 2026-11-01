# Study Room Booking API

A backend API that lets university students find and book study rooms, and stops two groups from booking the same room at the same time. Staff (admins) manage the rooms, and the API enforces opening hours, capacity, and booking limits.

Built with Node.js, Express, TypeScript and MongoDB, as a three-week backend project.

- **Live API:** https://study-room-booking-api-mtoh.onrender.com
- **Interactive docs (Swagger UI):** https://study-room-booking-api-mtoh.onrender.com/docs
- **OpenAPI file:** `docs/openApi.yaml`

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Test accounts](#test-accounts)
- [API overview](#api-overview)
- [Authentication](#authentication)
- [Business rules](#business-rules)
- [Responses and errors](#responses-and-errors)
- [Trying it out](#trying-it-out)
- [Running the tests](#running-the-tests)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Performance notes](#performance-notes)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)

---

## Features

- Register and log in with JWT authentication. Passwords are hashed with bcrypt and never returned.
- Role-based access control with two roles: `student` and `admin`.
- Room management (admins): create, update, deactivate, and delete rooms.
- Room search for students: active rooms only, filtered by capacity, paginated.
- Daily availability in 30-minute slots, in the building's local time zone.
- Booking with rules for opening hours, duration, capacity, and a limit of three future bookings per student.
- Conflict prevention, so two confirmed bookings for the same room cannot overlap.
- Cancellation by the booking's owner or an admin, before the booking starts.
- Rate limiting on register and login.
- Swagger UI generated from `docs/openApi.yaml`.
- A seed script for test accounts and sample rooms.
- An automated test suite of 116 tests with an in-memory database.

## Tech stack

| Area | Choice |
|---|---|
| Runtime | Node.js 20 or later |
| Framework | Express 5 |
| Language | TypeScript (ES modules) |
| Database | MongoDB, with Mongoose 9 |
| Validation | Zod 4 |
| Authentication | JSON Web Tokens (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`) |
| Security middleware | `helmet`, `cors`, `express-rate-limit` |
| API docs | OpenAPI 3.0, served with `swagger-ui-express` |
| Testing | Vitest, Supertest, `mongodb-memory-server` |
| Hosting | Render (API), MongoDB Atlas (database) |

## Project structure

```
Study-Room-Booking-API/
├── docs/
│   ├── openApi.yaml            API specification (read at runtime by Swagger UI)
│   ├── api-spec.md             Earlier design spec (superseded by openApi.yaml)
│   ├── coverage-note.md        What the tests cover, and what they do not
├── src/
│   ├── app.ts                  Express app: middleware, routes, error handler, docs
│   ├── server.ts               Connects to MongoDB and starts listening
│   ├── config/env.ts           Reads and checks environment variables
│   ├── constants/roles.ts      The list of roles
│   ├── controllers/            Turn HTTP requests into service calls and responses
│   ├── docs/openApi.ts         Loads docs/openApi.yaml for Swagger UI
│   ├── middleware/             validate, requireAuth, requireRole
│   ├── models/                 Mongoose models: User, Room, Booking
│   ├── routes/                 Route definitions and their middleware
│   ├── scripts/seed.ts         Creates test accounts and rooms
│   ├── services/               Business rules and database work
│   ├── utils/                  ApiError, asyncHandler, errorHandler, keepAlive
│   ├── validation/             Zod schemas for request bodies, queries and params
│   └── types/express.d.ts      Adds req.user to Express types
├── tests/
│   ├── setup/                  Test environment and in-memory database hooks
│   ├── helpers/factories.ts    Helpers that create test users, rooms and bookings
│   ├── unit/                   Schema, middleware and error tests
│   └── integration/            Full HTTP tests against the app
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## Getting started

### Prerequisites

- Node.js 20 or later, and npm
- A MongoDB database: either a local MongoDB server, or a free MongoDB Atlas cluster
- Git

### 1. Clone and install

```bash
git clone https://github.com/FortuneO-365/Study-Room-Booking-API.git
cd Study-Room-Booking-API
npm install
```

### 2. Create your environment file

Copy the example file, then edit the copy:

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Set at least `MONGODB_URI` and `JWT_SECRET`. See [Environment variables](#environment-variables). Never commit `.env`.

To generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start the database

Use one of these options.

**Local MongoDB with Docker:**

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

Then set `MONGODB_URI=mongodb://localhost:27017/study-room-booking` (no trailing slash).

**MongoDB Atlas:** create a free cluster, add a database user, allow your IP address under Network Access, and copy the connection string. Put the database name before the `?`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/study-room-booking?retryWrites=true&w=majority
```

### 4. Seed test data (optional, recommended for testing)

```bash
npm run seed
```

This creates two test accounts and five rooms. It skips anything that already exists, so it is safe to run again. It refuses to run when `NODE_ENV` is `production`. See [Test accounts](#test-accounts).

### 5. Run the API

```bash
npm run dev
```

You should see `Connected to MongoDB` and `API listening on ...`. Check it:

- Health: http://localhost:3000/health should return `{"status":"OK"}`
- Docs: http://localhost:3000/docs

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | none | MongoDB connection string. No trailing slash after the database name. |
| `JWT_SECRET` | Yes | none | Secret used to sign tokens. Use at least 32 random characters. The app will not start without it. |
| `JWT_EXPIRES_IN` | No | `1h` | How long a token lasts, for example `1h` or `30m` |
| `PORT` | No | `3000` | Port to listen on. Render sets this for you. |
| `NODE_ENV` | No | none | Set to `production` when deployed. The seed script refuses to run in production. |
| `CORS_ORIGIN` | No | none | The frontend origin allowed to call the API. Use a single origin, such as `https://your-app.example.com`. |
| `BUILDING_TIMEZONE` | No | `UTC` | The building's time zone as an IANA name, for example `Africa/Lagos` or `Europe/London`. Opening hours are applied in this zone. |
| `OPENING_HOUR` | No | `8` | First hour bookings can start (0 to 23), in the building's time zone |
| `CLOSING_HOUR` | No | `22` | Hour the building closes, in the building's time zone. Bookings must end by this time. |
| `MAX_FUTURE_BOOKINGS_PER_STUDENT` | No | `3` | How many upcoming confirmed bookings one student may hold |
| `RENDER_EXTERNAL_URL` | No | none | Set automatically by Render. When present, the API pings its own `/health` every 10 minutes to reduce cold starts. |

Watch for these common mistakes:

- A space before a value, such as `CORS_ORIGIN= *`, makes the value wrong.
- A trailing slash on `MONGODB_URI` makes MongoDB read the path as the database name and fail.
- `BUILDING_TIMEZONE=GMT+1` is not valid. Use an IANA name such as `Africa/Lagos`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with automatic restart on file changes |
| `npm run build` | Compiles TypeScript into `dist/` |
| `npm start` | Runs the compiled app from `dist/` (used on Render) |
| `npm run seed` | Creates test accounts and sample rooms |
| `npm test` | Runs the full test suite once |
| `npm run test:watch` | Runs the tests again each time a file changes |
| `npm run test:coverage` | Runs the tests and writes a coverage report to `coverage/` |

## Test accounts

Created by `npm run seed`. These are for local development and testing only. Do not use them on a deployed database.

| Role | Email | Password |
|---|---|---|
| admin | admin@test.local | Admin12345 |
| student | student@test.local | Student123 |

## API overview

All endpoints are under `/api`, except `/health` and `/docs`. The full, detailed specification is in `docs/openApi.yaml`.

| Method | Path | Who can call it | What it does | Success |
|---|---|---|---|---|
| GET | `/health` | Anyone | Checks the service is running | 200 |
| POST | `/api/auth/register` | Anyone | Creates a student account and returns a token | 201 |
| POST | `/api/auth/login` | Anyone | Logs in and returns a token | 200 |
| GET | `/api/rooms` | Any logged-in user | Lists active rooms (paginated, filter by `minCapacity`) | 200 |
| GET | `/api/rooms/:id` | Any logged-in user | Gets one room. Inactive rooms are 404 for students. | 200 |
| GET | `/api/rooms/:id/availability?date=YYYY-MM-DD` | Any logged-in user | Returns the day's 30-minute slots and whether each is free | 200 |
| POST | `/api/rooms` | Admin | Creates a room | 201 |
| PATCH | `/api/rooms/:id` | Admin | Updates the fields sent | 200 |
| DELETE | `/api/rooms/:id` | Admin | Deletes a room with no upcoming confirmed bookings | 204 |
| POST | `/api/booking` | Any logged-in user | Books a room | 201 |
| GET | `/api/booking/me` | Any logged-in user | Lists your bookings (paginated, filter by `status` and `upcoming`) | 200 |
| PATCH | `/api/booking/:id/cancel` | Booking owner or admin | Cancels a booking before it starts | 200 |

Requests and responses use JSON. Any request with a body needs the header `Content-Type: application/json`.

## Authentication

1. Register (`POST /api/auth/register`) or log in (`POST /api/auth/login`).
2. Copy the `result.token` value from the response.
3. Send it with each protected request:

   ```
   Authorization: Bearer <token>
   ```

Tokens expire after `JWT_EXPIRES_IN` (one hour by default). When a token expires, log in again.

Public registration always creates a `student`. The API has no endpoint for choosing a role. Admin accounts are created with the seed script, or by changing a user's role in the database.

## Business rules

These rules are enforced by the service layer, and each one has a specific error code.

| Rule | Error if broken |
|---|---|
| A booking must start in the future | `VALIDATION_ERROR` (400) |
| A booking must be 30 minutes to 4 hours long | `VALIDATION_ERROR` (400) |
| Start and end times must be on :00 or :30 | `VALIDATION_ERROR` (400) |
| The end time must be after the start time | `VALIDATION_ERROR` (400) |
| The booking must fall within opening hours, in the building's time zone | `OUTSIDE_OPENING_HOURS` (400) |
| The number of attendees must not exceed the room's capacity | `VALIDATION_ERROR` (400) |
| The room must exist and be active | `NOT_FOUND` (404) |
| A student may hold at most 3 upcoming confirmed bookings | `BOOKING_LIMIT_REACHED` (400) |
| No confirmed booking for the same room may overlap the requested time | `BOOKING_CONFLICT` (409) |
| Back-to-back bookings are allowed (one ending when another starts) | none |
| A booking can be cancelled once, by its owner or an admin, before it starts | `BOOKING_ALREADY_CANCELLED` (409), `FORBIDDEN` (403), `BOOKING_ALREADY_STARTED` (400) |
| A room with upcoming confirmed bookings cannot be deleted | `ROOM_HAS_BOOKINGS` (409) |
| Room names are unique | `ROOM_NAME_TAKEN` (409) |
| Email addresses are unique | `EMAIL_TAKEN` (409) |
| Room capacity must be between 10 and 200 | `VALIDATION_ERROR` (400) |

Cancelled bookings do not count towards the booking limit, do not block a slot, and do not block deleting a room.

## Responses and errors

**Successful responses** wrap the data in `result`:

```json
{ "success": true, "result": { "...": "..." } }
```

Lists add paging information:

```json
{
  "success": true,
  "result": {
    "data": [ { "...": "..." } ],
    "meta": { "page": 1, "limit": 20, "total": 3 }
  }
}
```

A successful delete returns `204 No Content` with no body.

**Errors** use one shape:

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The requested time overlaps an existing booking.",
    "details": []
  }
}
```

For validation errors, `details` lists each problem with its field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request.",
    "details": [ { "field": "capacity", "message": "Too small: expected number to be >=10" } ]
  }
}
```

**Error codes:**

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | The input is invalid, or a booking rule is broken |
| `INVALID_JSON` | 400 | The request body is not valid JSON (often a missing or extra comma) |
| `OUTSIDE_OPENING_HOURS` | 400 | The booking is outside opening hours |
| `BOOKING_LIMIT_REACHED` | 400 | The student already has 3 upcoming bookings |
| `BOOKING_ALREADY_STARTED` | 400 | The booking has started, so it cannot be cancelled |
| `UNAUTHORIZED` | 401 | No token, an invalid token, an expired token, or wrong login details |
| `FORBIDDEN` | 403 | Logged in, but the role or ownership does not allow this |
| `NOT_FOUND` | 404 | The resource does not exist, or is hidden from this user |
| `EMAIL_TAKEN` | 409 | The email is already registered |
| `ROOM_NAME_TAKEN` | 409 | The room name is already used |
| `ROOM_HAS_BOOKINGS` | 409 | The room has upcoming bookings and cannot be deleted |
| `BOOKING_CONFLICT` | 409 | The time overlaps an existing booking |
| `BOOKING_ALREADY_CANCELLED` | 409 | The booking is already cancelled |
| `BAD_REQUEST` | 413 | The request body is too large (over 100 KB) |
| `RATE_LIMITED` | 429 | Too many login or register attempts (20 per 15 minutes per IP) |
| `INTERNAL_ERROR` | 500 | An unexpected server error. The details are logged, not returned. |

## Trying it out

Examples use `curl.exe`, which works in Windows PowerShell and in most other shells. The seed accounts are used throughout.

**1. Log in as a student**

```bash
curl.exe -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"student@test.local\",\"password\":\"Student123\"}"
```

Copy `result.token` from the response. The examples below use `TOKEN` as a placeholder.

**2. List rooms**

```bash
curl.exe http://localhost:3000/api/rooms -H "Authorization: Bearer TOKEN"
```

**3. Check availability for a day**

```bash
curl.exe "http://localhost:3000/api/rooms/ROOM_ID/availability?date=2030-06-03" -H "Authorization: Bearer TOKEN"
```

**4. Book a room** (times are UTC; the example is 10:00 to 11:00 in Africa/Lagos)

```bash
curl.exe -X POST http://localhost:3000/api/booking ^
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" ^
  -d "{\"roomId\":\"ROOM_ID\",\"startTime\":\"2030-06-03T09:00:00Z\",\"endTime\":\"2030-06-03T10:00:00Z\",\"attendeeCount\":4,\"purpose\":\"Group project\"}"
```

**5. Cancel it**

```bash
curl.exe -X PATCH http://localhost:3000/api/booking/BOOKING_ID/cancel -H "Authorization: Bearer TOKEN"
```

Replace `ROOM_ID` and `BOOKING_ID` with the ids from earlier responses. Use `_id` from the response, since room and booking responses use `_id`.

The Swagger UI at `/docs` is the easiest way to try every endpoint. Log in through `POST /api/auth/login`, copy the token, click **Authorize**, and paste it in.

## Running the tests

```bash
npm test
```

The tests use an in-memory MongoDB, so they never touch your real database. They don't need your `.env` file.

The first run downloads a MongoDB server binary of about 200 MB. If the download is blocked on your network, install MongoDB Community Server and point the tests at its `mongod` program:

```powershell
$env:MONGOMS_SYSTEM_BINARY = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm test
```

For a coverage report, run `npm run test:coverage` and open `coverage/index.html`.

The suite has 116 tests in five files. What they cover, and what they do not, is explained in `docs/coverage-note.md`.

## Deployment

The API is deployed on Render, with the database on MongoDB Atlas.

**Render web service settings:**

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |

**Environment variables on Render:** set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (a new value, not your local one), `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `BUILDING_TIMEZONE`, `OPENING_HOUR`, `CLOSING_HOUR`, and `MAX_FUTURE_BOOKINGS_PER_STUDENT`. Do not set `PORT`, because Render provides it.

**Atlas network access:** Render's IP addresses change, so allow `0.0.0.0/0` in Atlas Network Access. Protect the database with a strong password.

**Seeding:** do not run `npm run seed` against the deployed database. It always creates the public test accounts, which have known passwords. To create a real admin, register an account through `POST /api/auth/register`, then change that user's `role` to `admin` in Atlas (Browse Collections, `users` collection, edit the document). Check the change by logging in again, since roles are read from the token.

**Free tier behaviour:** Render's free tier stops idle services after about 15 minutes. The first request after that can take 30 to 60 seconds. The API pings its own `/health` every 10 minutes while running on Render, which reduces, but does not eliminate, this delay.

## Security notes

- Passwords are hashed with bcrypt (cost 10) in the model's pre-save hook, and the hash is excluded from queries by default (`select: false`).
- Secrets come only from environment variables. `.env` is git-ignored, and `.env.example` contains no real values.
- The app will not start without `JWT_SECRET`.
- Every request body, query and URL parameter is validated with Zod before it reaches the business logic. Unknown fields are removed, so a client cannot set fields such as `role`.
- Public registration always creates a student, so no one can make themselves an admin.
- Login and registration are rate limited (20 requests per 15 minutes per IP). The limit is turned off only when `NODE_ENV` is `test`.
- Login gives the same error for an unknown email and a wrong password.
- Error responses never include stack traces or internal messages. Unexpected errors return a generic `INTERNAL_ERROR`.
- Request bodies are limited to 100 KB.
- `helmet` sets standard security headers. CORS is limited to the origin in `CORS_ORIGIN`.
- Routes check ownership: students can only cancel their own bookings.
- Limits: a JWT stays valid until it expires, so a role change takes effect at the next login. Tokens are not revocable before expiry.

## Performance notes

- All list endpoints are paginated. `limit` is capped at 100 and defaults to 20.
- Unique indexes exist on `users.email` and `rooms.roomName`, which also make duplicate checks reliable under concurrent requests.
- Queries on bookings filter by room, status, and time. The booking collection does not yet have a compound index for these, so it will scan more documents as it grows. A suitable index is `{ roomId: 1, status: 1, startTime: 1 }`, and `{ userId: 1, status: 1, startTime: 1 }` for a student's bookings.
- Availability is computed for one room and one day at a time, with one bookings query per request.
- Lists use `lean()`, which returns plain objects and skips Mongoose document overhead.

## Known limitations

- **Overlap check is not fully atomic.** The conflict check runs in the application, so two requests for the same slot that arrive at the same moment can both succeed. The fix is slot documents with a unique index, as described in the design notes. This is the most important known risk.
- **Field names differ between requests and responses.** Requests use `name` for a room, but the stored and returned field is `roomName`. Room and booking responses use `_id`, while user responses use `id`. The OpenAPI file documents the current behaviour.
- **No staff role.** Only `student` and `admin` exist, so room management is admin-only.
- **Role changes need a new login.** Tokens keep their role until they expire.
- **Single building.** The opening hours and time zone apply to the whole service. Multiple buildings would need a building model.
- **Daylight saving and midnight bookings are not tested.** The test zone has no daylight saving, and bookings that cross midnight are rejected.
- **Free-tier cold starts** on Render, as described above.
- **No frontend.** The API is designed to be used with any client.

## Documentation

| File | What it contains |
|---|---|
| `docs/openApi.yaml` | The full API specification. Used by Swagger UI at `/docs`. The raw file is also served at `/openapi.json`. |
| `docs/coverage-note.md` | What the tests cover, what they do not, and why |
| `docs/api-spec.md` | The earlier design specification, if present. Where it differs from `openApi.yaml`, the OpenAPI file is correct. |

## Author

[Your name], Study Room Booking API, Backend Development project.

The declaration of own work and AI use is in the final submission package.