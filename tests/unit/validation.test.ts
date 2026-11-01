import { describe, it, expect } from 'vitest';
import { createRoomSchema, updateRoomSchema, availabilityQuerySchema } from '../../src/validation/room.schema.js';
import { registerSchema, loginSchema } from '../../src/validation/user.schema.js';
import { createBookingSchema, listMyBookingsQuerySchema } from '../../src/validation/booking.schema.js';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : result.error!.issues.map((i) => i.message);

const validBooking = {
  roomId: '64f1a2b3c4d5e6f7a8b9c0d1',
  startTime: '2030-06-03T09:00:00Z',
  endTime: '2030-06-03T10:00:00Z',
  attendeeCount: 4,
};

describe('room schemas', () => {
  it('fills in amenities and isActive defaults on create', () => {
    const room = createRoomSchema.parse({ name: 'Library L2-07', capacity: 12 });
    expect(room.amenities).toEqual([]);
    expect(room.isActive).toBe(true);
  });

  it('rejects capacity below the model minimum of 10', () => {
    expect(createRoomSchema.safeParse({ name: 'Tiny', capacity: 5 }).success).toBe(false);
  });

  it('rejects capacity above the model maximum of 200', () => {
    expect(createRoomSchema.safeParse({ name: 'Huge', capacity: 201 }).success).toBe(false);
  });

  it('rejects a name that is only whitespace', () => {
    expect(createRoomSchema.safeParse({ name: '   ', capacity: 12 }).success).toBe(false);
  });

  it('does not reset fields that a PATCH leaves out', () => {
    expect(updateRoomSchema.parse({ capacity: 12 })).toEqual({ capacity: 12 });
  });

  it('rejects an empty PATCH body', () => {
    expect(updateRoomSchema.safeParse({}).success).toBe(false);
  });
});

describe('availability query schema', () => {
  it('accepts a real calendar date', () => {
    expect(availabilityQuerySchema.safeParse({ date: '2030-06-03' }).success).toBe(true);
  });

  it('rejects an impossible date', () => {
    expect(messages(availabilityQuerySchema.safeParse({ date: '2030-02-31' }))).toContain('Not a real date.');
  });

  it('rejects a date in the wrong format', () => {
    expect(availabilityQuerySchema.safeParse({ date: '03-06-2030' }).success).toBe(false);
  });
});

describe('register and login schemas', () => {
  it('trims and lowercases the email', () => {
    const parsed = registerSchema.parse({ name: 'Ada', email: '  Ada@Example.COM ', password: 'password1' });
    expect(parsed.email).toBe('ada@example.com');
  });

  it('removes a client-supplied role', () => {
    const parsed = registerSchema.parse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
      role: 'admin',
    });
    expect(parsed).not.toHaveProperty('role');
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'short' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(registerSchema.safeParse({ name: 'Ada', email: 'not-an-email', password: 'password1' }).success).toBe(false);
  });

  it('login accepts a short password, so existing accounts are never locked out by a rule change', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'abc' }).success).toBe(true);
  });
});

describe('booking schema', () => {
  it('converts ISO strings into Date objects', () => {
    const parsed = createBookingSchema.parse(validBooking);
    expect(parsed.startTime).toBeInstanceOf(Date);
    expect(parsed.endTime.toISOString()).toBe('2030-06-03T10:00:00.000Z');
  });

  it('accepts a valid booking without a purpose', () => {
    expect(createBookingSchema.safeParse(validBooking).success).toBe(true);
  });

  it('rejects an end time before the start time', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      startTime: '2030-06-03T10:00:00Z',
      endTime: '2030-06-03T09:00:00Z',
    });
    expect(messages(result)).toContain('endTime must be after startTime.');
  });

  it('rejects a 20-minute booking', () => {
    const result = createBookingSchema.safeParse({ ...validBooking, endTime: '2030-06-03T09:20:00Z' });
    expect(messages(result)).toContain('A booking must be between 30 minutes and 4 hours.');
  });

  it('rejects a booking longer than 4 hours', () => {
    const result = createBookingSchema.safeParse({ ...validBooking, endTime: '2030-06-03T14:00:00Z' });
    expect(messages(result)).toContain('A booking must be between 30 minutes and 4 hours.');
  });

  it('rejects a start time that is not on the half hour', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      startTime: '2030-06-03T09:15:00Z',
      endTime: '2030-06-03T10:00:00Z',
    });
    expect(messages(result)).toContain('Start and end times must fall on :00 or :30.');
  });

  it('rejects a roomId that is not a 24-character hex id', () => {
    expect(createBookingSchema.safeParse({ ...validBooking, roomId: 'room-1' }).success).toBe(false);
  });

  it('rejects a purpose longer than 200 characters', () => {
    expect(createBookingSchema.safeParse({ ...validBooking, purpose: 'x'.repeat(201) }).success).toBe(false);
  });
});

describe('list my bookings query schema', () => {
  it('turns the string "true" into a boolean true', () => {
    expect(listMyBookingsQuerySchema.parse({ upcoming: 'true' }).upcoming).toBe(true);
  });

  it('turns the string "false" into a boolean false, not true', () => {
    expect(listMyBookingsQuerySchema.parse({ upcoming: 'false' }).upcoming).toBe(false);
  });

  it('rejects any other value for upcoming', () => {
    expect(listMyBookingsQuerySchema.safeParse({ upcoming: 'yes' }).success).toBe(false);
  });

  it('defaults page to 1 and limit to 20', () => {
    const parsed = listMyBookingsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it('rejects a limit above 100', () => {
    expect(listMyBookingsQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});