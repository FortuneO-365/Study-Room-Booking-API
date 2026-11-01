import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { Booking } from '../../src/models/booking.model.js';
import { createUser, createRoom, createBooking, authHeader, FUTURE_DAY, PAST_DAY } from '../helpers/factories.js';

const api = () => request(app);

describe('POST /api/bookings', () => {
  let student: Awaited<ReturnType<typeof createUser>>;
  let room: Awaited<ReturnType<typeof createRoom>>;

  beforeEach(async () => {
    student = await createUser();
    room = await createRoom({ capacity: 12 });
  });

  const body = (overrides: Record<string, unknown> = {}) => ({
    roomId: String(room.id),
    startTime: `${FUTURE_DAY}T09:00:00Z`,
    endTime: `${FUTURE_DAY}T10:00:00Z`,
    attendeeCount: 4,
    ...overrides,
  });
  const book = (payload: Record<string, unknown>, user = student) =>
    api().post('/api/bookings').set('Authorization', authHeader(user)).send(payload);

  it('returns 401 without a token', async () => {
    const res = await api().post('/api/bookings').send(body());
    expect(res.status).toBe(401);
  });

  it('creates a confirmed booking for the logged-in student', async () => {
    const res = await book(body({ purpose: 'Group project' }));

    expect(res.status).toBe(201);
    expect(res.body.result).toMatchObject({ status: 'confirmed', userId: student.id, purpose: 'Group project' });
  });

  it('rejects a second booking for the same slot with 409 BOOKING_CONFLICT', async () => {
    await book(body());
    const other = await createUser();
    const res = await book(body(), other);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('rejects a partial overlap with 409', async () => {
    await book(body());
    const res = await book(body({ startTime: `${FUTURE_DAY}T09:30:00Z`, endTime: `${FUTURE_DAY}T10:30:00Z` }), await createUser());
    expect(res.status).toBe(409);
  });

  it('allows a booking that starts exactly when another ends', async () => {
    await book(body());
    const res = await book(body({ startTime: `${FUTURE_DAY}T10:00:00Z`, endTime: `${FUTURE_DAY}T11:00:00Z` }), await createUser());
    expect(res.status).toBe(201);
  });

  it('rejects a start before opening hours with 400 OUTSIDE_OPENING_HOURS', async () => {
    // 06:00 to 07:00 local time
    const res = await book(body({ startTime: `${FUTURE_DAY}T05:00:00Z`, endTime: `${FUTURE_DAY}T06:00:00Z` }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('rejects a booking that runs past closing time with 400 OUTSIDE_OPENING_HOURS', async () => {
    // 21:30 to 22:30 local time
    const res = await book(body({ startTime: `${FUTURE_DAY}T20:30:00Z`, endTime: `${FUTURE_DAY}T21:30:00Z` }));
    expect(res.body.error.code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('rejects a 20-minute booking with 400 VALIDATION_ERROR', async () => {
    const res = await book(body({ endTime: `${FUTURE_DAY}T09:20:00Z` }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a start time that is not on the half hour', async () => {
    const res = await book(body({ startTime: `${FUTURE_DAY}T09:15:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` }));
    expect(res.status).toBe(400);
  });

  it('rejects a booking that starts in the past', async () => {
    const res = await book(body({ startTime: `${PAST_DAY}T09:00:00Z`, endTime: `${PAST_DAY}T10:00:00Z` }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects more attendees than the room holds', async () => {
    const res = await book(body({ attendeeCount: 13 }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for an inactive room', async () => {
    const inactive = await createRoom({ isActive: false });
    const res = await book(body({ roomId: String(inactive.id) }));
    expect(res.status).toBe(404);
  });

  it('returns 404 for a room that does not exist', async () => {
    const res = await book(body({ roomId: '64f1a2b3c4d5e6f7a8b9c0d1' }));
    expect(res.status).toBe(404);
  });

  it('blocks a fourth future booking with 400 BOOKING_LIMIT_REACHED', async () => {
    for (let hour = 8; hour < 11; hour++) {
      await createBooking({
        userId: student.id,
        roomId: (await createRoom()).id,
        startTime: `${FUTURE_DAY}T${String(hour - 1).padStart(2, '0')}:00:00Z`,
        endTime: `${FUTURE_DAY}T${String(hour - 1).padStart(2, '0')}:30:00Z`,
      });
    }
    const res = await book(body());
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BOOKING_LIMIT_REACHED');
  });

  it('does not count cancelled bookings towards the limit', async () => {
    for (let i = 0; i < 3; i++) {
      await createBooking({
        userId: student.id,
        roomId: (await createRoom()).id,
        startTime: `${FUTURE_DAY}T0${7 + i}:00:00Z`,
        endTime: `${FUTURE_DAY}T0${7 + i}:30:00Z`,
        status: 'cancelled',
      });
    }
    const res = await book(body());
    expect(res.status).toBe(201);
  });
});

describe('GET /api/bookings/me', () => {
  it('returns only the current user\'s bookings, newest first', async () => {
    const student = await createUser();
    const other = await createUser();
    const room = await createRoom();

    await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });
    await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T12:00:00Z`, endTime: `${FUTURE_DAY}T13:00:00Z` });
    await createBooking({ userId: other.id, roomId: room.id, startTime: `${FUTURE_DAY}T14:00:00Z`, endTime: `${FUTURE_DAY}T15:00:00Z` });

    const res = await api().get('/api/bookings/me').set('Authorization', authHeader(student));
    const starts = res.body.result.data.map((b: { startTime: string }) => b.startTime);

    expect(res.status).toBe(200);
    expect(starts).toEqual([`${FUTURE_DAY}T12:00:00.000Z`, `${FUTURE_DAY}T09:00:00.000Z`]);
  });

  it('upcoming=true excludes bookings that have already started', async () => {
    const student = await createUser();
    const room = await createRoom();
    await createBooking({ userId: student.id, roomId: room.id, startTime: `${PAST_DAY}T09:00:00Z`, endTime: `${PAST_DAY}T10:00:00Z` });
    await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });

    const res = await api().get('/api/bookings/me?upcoming=true').set('Authorization', authHeader(student));
    expect(res.body.result.data).toHaveLength(1);
    expect(res.body.result.meta.total).toBe(1);
  });

  it('filters by status', async () => {
    const student = await createUser();
    const room = await createRoom();
    await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z`, status: 'cancelled' });
    await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T11:00:00Z`, endTime: `${FUTURE_DAY}T12:00:00Z` });

    const res = await api().get('/api/bookings/me?status=cancelled').set('Authorization', authHeader(student));
    expect(res.body.result.data.map((b: { status: string }) => b.status)).toEqual(['cancelled']);
  });

  it('returns 400 for a limit above 100 instead of crashing', async () => {
    const student = await createUser();
    const res = await api().get('/api/bookings/me?limit=500').set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await api().get('/api/bookings/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/bookings/:id/cancel', () => {
  it('lets the owner cancel, and records cancelledAt', async () => {
    const student = await createUser();
    const room = await createRoom();
    const booking = await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });

    const res = await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(student));
    const saved = await Booking.findById(booking.id);

    expect(res.status).toBe(200);
    expect(res.body.result.status).toBe('cancelled');
    expect(saved!.cancelledAt).toBeInstanceOf(Date);
  });

  it('returns 409 BOOKING_ALREADY_CANCELLED when cancelling twice', async () => {
    const student = await createUser();
    const room = await createRoom();
    const booking = await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });

    await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(student));
    const res = await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(student));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
  });

  it('returns 403 when another student tries to cancel, and leaves the booking confirmed', async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const room = await createRoom();
    const booking = await createBooking({ userId: owner.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });

    const res = await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(intruder));

    expect(res.status).toBe(403);
    expect((await Booking.findById(booking.id))!.status).toBe('confirmed');
  });

  it('lets an admin cancel any booking', async () => {
    const owner = await createUser();
    const admin = await createUser('admin');
    const room = await createRoom();
    const booking = await createBooking({ userId: owner.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });

    const res = await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(admin));
    expect(res.status).toBe(200);
  });

  it('refuses to cancel a booking that has already started', async () => {
    const student = await createUser();
    const room = await createRoom();
    const booking = await createBooking({ userId: student.id, roomId: room.id, startTime: `${PAST_DAY}T09:00:00Z`, endTime: `${PAST_DAY}T10:00:00Z` });

    const res = await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BOOKING_ALREADY_STARTED');
  });

  it('frees the slot, so another student can book it', async () => {
    const student = await createUser();
    const room = await createRoom();
    const booking = await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });
    await api().patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', authHeader(student));

    const other = await createUser();
    const res = await api()
      .post('/api/bookings')
      .set('Authorization', authHeader(other))
      .send({ roomId: String(room.id), startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z`, attendeeCount: 2 });

    expect(res.status).toBe(201);
  });

  it('returns 404 for a booking that does not exist', async () => {
    const student = await createUser();
    const res = await api().patch('/api/bookings/64f1a2b3c4d5e6f7a8b9c0d1/cancel').set('Authorization', authHeader(student));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const student = await createUser();
    const res = await api().patch('/api/bookings/not-an-id/cancel').set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
  });

  it('no longer accepts POST for cancellation', async () => {
    const student = await createUser();
    const room = await createRoom();
    const booking = await createBooking({ userId: student.id, roomId: room.id, startTime: `${FUTURE_DAY}T09:00:00Z`, endTime: `${FUTURE_DAY}T10:00:00Z` });

    const res = await api().post(`/api/booking/${booking.id}/cancel`).set('Authorization', authHeader(student));
    expect(res.status).toBe(404);
  });
});