import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { Room } from '../../src/models/room.model.js';
import { createUser, createRoom, createBooking, authHeader, FUTURE_DAY, PAST_DAY } from '../helpers/factories.js';

const api = () => request(app);
const validRoom = { name: 'Library L2-07', capacity: 12, amenities: ['whiteboard'] };

describe('GET /api/rooms', () => {
  it('returns 401 without a token', async () => {
    const res = await api().get('/api/rooms');
    expect(res.status).toBe(401);
  });

  it('lists only active rooms to a student', async () => {
    const student = await createUser();
    await createRoom({ roomName: 'Visible A' });
    await createRoom({ roomName: 'Hidden B', isActive: false });

    const res = await api().get('/api/rooms').set('Authorization', authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.result.data.map((r: { roomName: string }) => r.roomName)).toEqual(['Visible A']);
  });

  it('filters by minCapacity', async () => {
    const student = await createUser();
    await createRoom({ roomName: 'Small', capacity: 12 });
    await createRoom({ roomName: 'Large', capacity: 30 });

    const res = await api().get('/api/rooms?minCapacity=20').set('Authorization', authHeader(student));

    expect(res.body.result.data.map((r: { roomName: string }) => r.roomName)).toEqual(['Large']);
  });

  it('paginates and reports the total', async () => {
    const student = await createUser();
    await createRoom({ roomName: 'Page A' });
    await createRoom({ roomName: 'Page B' });
    await createRoom({ roomName: 'Page C' });

    const res = await api().get('/api/rooms?page=2&limit=2').set('Authorization', authHeader(student));

    expect(res.body.result.data).toHaveLength(1);
    expect(res.body.result.meta).toEqual({ page: 2, limit: 2, total: 3 });
  });

  it('returns 400 for a limit above 100 (this used to crash with a 500)', async () => {
    const student = await createUser();
    const res = await api().get('/api/rooms?limit=500').set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/rooms/:id', () => {
  it('hides an inactive room from a student with a 404', async () => {
    const student = await createUser();
    const room = await createRoom({ isActive: false });

    const res = await api().get(`/api/rooms/${room.id}`).set('Authorization', authHeader(student));
    expect(res.status).toBe(404);
  });

  it('shows an inactive room to an admin', async () => {
    const admin = await createUser('admin');
    const room = await createRoom({ isActive: false });

    const res = await api().get(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.result.isActive).toBe(false);
  });

  it('returns 404 for a well-formed id that does not exist', async () => {
    const student = await createUser();
    const res = await api().get('/api/rooms/64f1a2b3c4d5e6f7a8b9c0d1').set('Authorization', authHeader(student));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    const student = await createUser();
    const res = await api().get('/api/rooms/not-an-id').set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/rooms', () => {
  it('returns 401 without a token', async () => {
    const res = await api().post('/api/rooms').send(validRoom);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a student, and creates nothing', async () => {
    const student = await createUser();
    const res = await api().post('/api/rooms').set('Authorization', authHeader(student)).send(validRoom);

    expect(res.status).toBe(403);
    expect(await Room.countDocuments()).toBe(0);
  });

  it('creates a room for an admin', async () => {
    const admin = await createUser('admin');
    const res = await api().post('/api/rooms').set('Authorization', authHeader(admin)).send(validRoom);

    expect(res.status).toBe(201);
    expect(res.body.result.roomName).toBe('Library L2-07');
    expect(res.body.result.amenities).toEqual(['whiteboard']);
  });

  it('defaults isActive to true and amenities to an empty array', async () => {
    const admin = await createUser('admin');
    const res = await api()
      .post('/api/rooms')
      .set('Authorization', authHeader(admin))
      .send({ name: 'Bare Room', capacity: 10 });

    expect(res.body.result.isActive).toBe(true);
    expect(res.body.result.amenities).toEqual([]);
  });

  it('returns 400 for a capacity below the model minimum', async () => {
    const admin = await createUser('admin');
    const res = await api().post('/api/rooms').set('Authorization', authHeader(admin)).send({ ...validRoom, capacity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'capacity' })]);
  });

  it('returns 409 ROOM_NAME_TAKEN for a duplicate name', async () => {
    const admin = await createUser('admin');
    await createRoom({ roomName: 'Library L2-07' });

    const res = await api().post('/api/rooms').set('Authorization', authHeader(admin)).send(validRoom);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_NAME_TAKEN');
  });
});

describe('PATCH /api/rooms/:id', () => {
  it('returns 403 for a student and leaves the room unchanged', async () => {
    const student = await createUser();
    const room = await createRoom({ capacity: 12 });

    const res = await api().patch(`/api/rooms/${room.id}`).set('Authorization', authHeader(student)).send({ capacity: 30 });

    expect(res.status).toBe(403);
    expect((await Room.findById(room.id))!.capacity).toBe(12);
  });

  it('changes only the fields sent, leaving isActive and amenities alone', async () => {
    const admin = await createUser('admin');
    const room = await createRoom({ capacity: 12, isActive: false, amenities: ['screen'] });

    const res = await api().patch(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin)).send({ capacity: 15 });
    const saved = await Room.findById(room.id);

    expect(res.status).toBe(200);
    expect(saved!.capacity).toBe(15);
    expect(saved!.isActive).toBe(false);
    expect(saved!.amenities).toEqual(['screen']);
  });

  it('renames a room by writing roomName, which is the field the model stores', async () => {
    const admin = await createUser('admin');
    const room = await createRoom({ roomName: 'Old Name' });

    const res = await api().patch(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin)).send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect((await Room.findById(room.id))!.roomName).toBe('New Name');
  });

  it('returns 409 when renaming to a name another room already uses', async () => {
    const admin = await createUser('admin');
    await createRoom({ roomName: 'Taken' });
    const room = await createRoom({ roomName: 'Mine' });

    const res = await api().patch(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin)).send({ name: 'Taken' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_NAME_TAKEN');
  });

  it('returns 400 for an empty body', async () => {
    const admin = await createUser('admin');
    const room = await createRoom();

    const res = await api().patch(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin)).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for a room that does not exist', async () => {
    const admin = await createUser('admin');
    const res = await api()
      .patch('/api/rooms/64f1a2b3c4d5e6f7a8b9c0d1')
      .set('Authorization', authHeader(admin))
      .send({ capacity: 15 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/rooms/:id', () => {
  it('returns 403 for a student and keeps the room', async () => {
    const student = await createUser();
    const room = await createRoom();

    const res = await api().delete(`/api/rooms/${room.id}`).set('Authorization', authHeader(student));

    expect(res.status).toBe(403);
    expect(await Room.findById(room.id)).not.toBeNull();
  });

  it('refuses to delete a room with an upcoming confirmed booking', async () => {
    const admin = await createUser('admin');
    const student = await createUser();
    const room = await createRoom();
    await createBooking({
      userId: student.id,
      roomId: room.id,
      startTime: `${FUTURE_DAY}T09:00:00Z`,
      endTime: `${FUTURE_DAY}T10:00:00Z`,
    });

    const res = await api().delete(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_HAS_BOOKINGS');
    expect(await Room.findById(room.id)).not.toBeNull();
  });

  it('allows deleting a room whose only bookings were cancelled', async () => {
    const admin = await createUser('admin');
    const student = await createUser();
    const room = await createRoom();
    await createBooking({
      userId: student.id,
      roomId: room.id,
      startTime: `${FUTURE_DAY}T09:00:00Z`,
      endTime: `${FUTURE_DAY}T10:00:00Z`,
      status: 'cancelled',
    });

    const res = await api().delete(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin));
    expect(res.status).toBe(204);
  });

  it('deletes an empty room with 204 and no body', async () => {
    const admin = await createUser('admin');
    const room = await createRoom();

    const res = await api().delete(`/api/rooms/${room.id}`).set('Authorization', authHeader(admin));

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await Room.findById(room.id)).toBeNull();
  });

  it('returns 404 for a room that does not exist', async () => {
    const admin = await createUser('admin');
    const res = await api().delete('/api/rooms/64f1a2b3c4d5e6f7a8b9c0d1').set('Authorization', authHeader(admin));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/rooms/:id/availability', () => {
  const slotAt = (slots: { start: string; available: boolean }[], start: string) =>
    slots.find((s) => s.start === start)!;

  it('returns 28 half-hour slots from 08:00 to 22:00 local time (07:00Z to 21:00Z)', async () => {
    const student = await createUser();
    const room = await createRoom();

    const res = await api()
      .get(`/api/rooms/${room.id}/availability?date=${FUTURE_DAY}`)
      .set('Authorization', authHeader(student));

    const { slots } = res.body.result;
    expect(res.status).toBe(200);
    expect(slots).toHaveLength(28);
    expect(slots[0].start).toBe(`${FUTURE_DAY}T07:00:00.000Z`);
    expect(slots[27].end).toBe(`${FUTURE_DAY}T21:00:00.000Z`);
    expect(slots.every((s: { available: boolean }) => s.available)).toBe(true);
  });

  it('marks the slots covered by a booking as unavailable, and the slot it touches as available', async () => {
    const student = await createUser();
    const room = await createRoom();
    await createBooking({
      userId: student.id,
      roomId: room.id,
      startTime: `${FUTURE_DAY}T09:00:00Z`,
      endTime: `${FUTURE_DAY}T10:00:00Z`,
    });

    const res = await api()
      .get(`/api/rooms/${room.id}/availability?date=${FUTURE_DAY}`)
      .set('Authorization', authHeader(student));
    const { slots } = res.body.result;

    expect(slotAt(slots, `${FUTURE_DAY}T09:00:00.000Z`).available).toBe(false);
    expect(slotAt(slots, `${FUTURE_DAY}T09:30:00.000Z`).available).toBe(false);
    expect(slotAt(slots, `${FUTURE_DAY}T10:00:00.000Z`).available).toBe(true);
  });

  it('ignores cancelled bookings', async () => {
    const student = await createUser();
    const room = await createRoom();
    await createBooking({
      userId: student.id,
      roomId: room.id,
      startTime: `${FUTURE_DAY}T09:00:00Z`,
      endTime: `${FUTURE_DAY}T10:00:00Z`,
      status: 'cancelled',
    });

    const res = await api()
      .get(`/api/rooms/${room.id}/availability?date=${FUTURE_DAY}`)
      .set('Authorization', authHeader(student));

    expect(slotAt(res.body.result.slots, `${FUTURE_DAY}T09:00:00.000Z`).available).toBe(true);
  });

  it('marks every slot unavailable on a day that has already passed', async () => {
    const student = await createUser();
    const room = await createRoom();

    const res = await api()
      .get(`/api/rooms/${room.id}/availability?date=${PAST_DAY}`)
      .set('Authorization', authHeader(student));

    expect(res.body.result.slots.some((s: { available: boolean }) => s.available)).toBe(false);
  });

  it('returns 400 for an impossible date', async () => {
    const student = await createUser();
    const room = await createRoom();
    const res = await api()
      .get(`/api/rooms/${room.id}/availability?date=2030-02-31`)
      .set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
  });

  it('returns 400 when the date is missing', async () => {
    const student = await createUser();
    const room = await createRoom();
    const res = await api().get(`/api/rooms/${room.id}/availability`).set('Authorization', authHeader(student));
    expect(res.status).toBe(400);
  });

  it('hides an inactive room from a student with a 404', async () => {
    const student = await createUser();
    const room = await createRoom({ isActive: false });
    const res = await api()
      .get(`/api/rooms/${room.id}/availability?date=${FUTURE_DAY}`)
      .set('Authorization', authHeader(student));
    expect(res.status).toBe(404);
  });
});