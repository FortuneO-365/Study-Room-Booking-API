# API Specification: Study Room Booking API

Version: 0.1 (Week 1 draft)
Base URL: `http://localhost:3000` (local) | `https://<deployed-host>` (after deployment)
Format: JSON for all requests and responses. Dates and times use ISO 8601 in UTC (for example `2026-10-20T10:00:00Z`).

## 1. Authentication

Protected endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned by `POST /auth/login` and expire after the time set in `JWT_EXPIRES_IN`.

## 2. Roles

| Role | Can do |
|------|--------|
| student | Browse rooms, check availability, create bookings, view and cancel their own bookings |
| staff | Everything a student can do, plus create, update, and delete rooms |
| admin | Everything staff can do, plus cancel any booking |

## 3. Business rules

These rules are enforced in the service layer and return 400 or 409 when broken.

- `endTime` must be after `startTime`.
- `startTime` must be in the future.
- Bookings are made in 30-minute slots. Start and end times must fall on a half-hour boundary (`:00` or `:30`).
- Booking length must be between 30 minutes and 4 hours.
- A booking must fall within opening hours (default 08:00 to 22:00, local time at the building, set by `OPENING_HOUR` and `CLOSING_HOUR`).
- `attendeeCount` must be at least 1 and no more than the room's `capacity`.
- A student can have at most 3 future confirmed bookings at any time (set by `MAX_FUTURE_BOOKINGS_PER_STUDENT`).
- No two confirmed bookings for the same room may overlap in time.
- A booking can be cancelled only by its owner or an admin, and only before its `startTime`.
- A room with future confirmed bookings cannot be deleted.

## 4. Error format

All errors use the same shape:

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The requested time overlaps an existing booking.",
    "details": []
  }
}
```

`code` is a stable machine-readable string. `message` is for humans. `details` is an array of field-level problems for validation errors, and is empty otherwise.

| Status | When | Example code |
|--------|------|--------------|
| 400 | Invalid input or a broken business rule | `VALIDATION_ERROR`, `OUTSIDE_OPENING_HOURS` |
| 401 | Missing, invalid, or expired token | `UNAUTHORIZED` |
| 403 | Logged in but not allowed to do this | `FORBIDDEN` |
| 404 | Resource does not exist | `NOT_FOUND` |
| 409 | Conflict with existing data | `BOOKING_CONFLICT`, `ROOM_HAS_BOOKINGS`, `EMAIL_TAKEN` |
| 429 | Too many requests (rate limit) | `RATE_LIMITED` |
| 500 | Unexpected server error | `INTERNAL_ERROR` |

## 5. Pagination

List endpoints accept:

- `page` (default `1`, minimum `1`)
- `limit` (default `20`, maximum `100`)

List responses use this shape:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

## 6. Endpoints

### Auth

#### POST /auth/register

Create a student account. Public.

Request body:

```json
{
  "name": "Ada Okafor",
  "email": "ada@student.example.edu",
  "password": "at-least-8-characters"
}
```

Validation: `name` is 1 to 100 characters. `email` is a valid email and unique. `password` is at least 8 characters. `role` is always set to `student` by this endpoint, and cannot be provided by the client.

Responses:
- 201 Created: `{ "id", "name", "email", "role", "createdAt" }`. The password hash is never returned.
- 400 `VALIDATION_ERROR`: invalid fields.
- 409 `EMAIL_TAKEN`: email already registered.

#### POST /auth/login

Public. Rate limited.

Request body:

```json
{ "email": "ada@student.example.edu", "password": "at-least-8-characters" }
```

Responses:
- 200 OK: `{ "token": "<jwt>", "expiresIn": "1h" }`
- 400 `VALIDATION_ERROR`: missing fields.
- 401 `UNAUTHORIZED`: wrong email or password. The message does not reveal which one was wrong.
- 429 `RATE_LIMITED`: too many attempts.

### Rooms nh

#### GET /rooms

Public. Lists active rooms.

Query parameters:
- `building` (optional, exact match)
- `minCapacity` (optional, integer, at least 1)
- `page`, `limit` (see Pagination)

Response 200 OK:

```json
{
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Library L2-07",
      "capacity": 6,
      "amenities": ["whiteboard", "screen"],
      "isActive": true
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

#### GET /rooms/:id

Public. Returns one room.

Responses:
- 200 OK: the room object above.
- 404 `NOT_FOUND`: no room with this id, or the room is inactive and the caller is not staff or admin.

#### GET /rooms/:id/availability

Public. Returns the free and booked 30-minute slots for one room on one day.

Query parameters:
- `date` (required, `YYYY-MM-DD`, the building's local date)

Response 200 OK:

```json
{
  "roomId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "date": "2026-10-20",
  "slots": [
    { "start": "2026-10-20T08:00:00Z", "end": "2026-10-20T08:30:00Z", "available": true },
    { "start": "2026-10-20T08:30:00Z", "end": "2026-10-20T09:00:00Z", "available": false }
  ]
}
```

Responses:
- 400 `VALIDATION_ERROR`: missing or badly formatted `date`.
- 404 `NOT_FOUND`: room does not exist.

#### POST /rooms

Staff or admin only.

Request body:

```json
{
  "name": "Library L2-07",
  "capacity": 6,
  "amenities": ["whiteboard", "screen"],
  "isActive": true
}
```

Validation: `name`, `building` are required and 1 to 100 characters. `floor` is an integer. `capacity` is an integer from 1 to 50. `amenities` is an optional array of strings. `isActive` defaults to `true`.

Responses:
- 201 Created: the room object.
- 400 `VALIDATION_ERROR`: invalid fields.
- 401 `UNAUTHORIZED`: no token.
- 403 `FORBIDDEN`: role is student.

#### PATCH /rooms/:id

Staff or admin only. Partial update: send only the fields to change.

Request body (example):

```json
{ "capacity": 8, "isActive": false }
```

Responses:
- 200 OK: the updated room.
- 400 `VALIDATION_ERROR`: invalid fields.
- 401, 403: as for POST /rooms.
- 404 `NOT_FOUND`: room does not exist.

#### DELETE /rooms/:id

Staff or admin only.

Responses:
- 204 No Content: room deleted.
- 401, 403: as for POST /rooms.
- 404 `NOT_FOUND`: room does not exist.
- 409 `ROOM_HAS_BOOKINGS`: room has future confirmed bookings. Set `isActive` to `false` instead.

### Bookings

#### POST /bookings

Authenticated. Creates a confirmed booking for the current user.

Request body:

```json
{
  "roomId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "startTime": "2026-10-20T10:00:00Z",
  "endTime": "2026-10-20T11:00:00Z",
  "attendeeCount": 4,
  "purpose": "Group project"
}
```

Validation: `roomId` is a valid id. `startTime` and `endTime` are ISO 8601 UTC. `attendeeCount` is an integer of at least 1. `purpose` is optional and up to 200 characters.

Responses:
- 201 Created:

```json
{
  "id": "64f2c3d4e5f6a7b8c9d0e1f2",
  "userId": "64f0a1...",
  "roomId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "startTime": "2026-10-20T10:00:00Z",
  "endTime": "2026-10-20T11:00:00Z",
  "attendeeCount": 4,
  "purpose": "Group project",
  "status": "confirmed",
  "createdAt": "2026-10-13T09:15:00Z"
}
```

- 400 `VALIDATION_ERROR`: invalid fields, end before start, start in the past, length not between 30 minutes and 4 hours, times not on a half-hour boundary, or attendee count above the room's capacity.
- 400 `OUTSIDE_OPENING_HOURS`: booking falls outside opening hours.
- 400 `BOOKING_LIMIT_REACHED`: the student already has 3 future confirmed bookings.
- 401 `UNAUTHORIZED`: no token.
- 404 `NOT_FOUND`: room does not exist or is inactive.
- 409 `BOOKING_CONFLICT`: one or more requested slots are already booked. The response lists the conflicting slots in `details`.

#### GET /bookings/me

Authenticated. Lists the current user's bookings, newest first.

Query parameters:
- `status` (optional, `confirmed` or `cancelled`)
- `upcoming` (optional, `true` to return only bookings that have not started yet)
- `page`, `limit`

Response 200 OK: the standard list shape, where each item is a booking object.

#### PATCH /bookings/:id/cancel

Authenticated. Owner or admin only. Cancels a booking. No request body.

Responses:
- 200 OK: the booking with `status` set to `cancelled` and `cancelledAt` set.
- 400 `BOOKING_ALREADY_STARTED`: the booking's start time has passed.
- 401 `UNAUTHORIZED`: no token.
- 403 `FORBIDDEN`: caller is neither the owner nor an admin.
- 404 `NOT_FOUND`: booking does not exist.
- 409 `BOOKING_ALREADY_CANCELLED`: booking is already cancelled.

## 7. Open questions for mentors

- Should cancelled bookings still be shown in `GET /bookings/me` by default?
- Should staff be able to book rooms on behalf of students, or only cancel bookings?
- Is 4 hours the right maximum length for a booking?