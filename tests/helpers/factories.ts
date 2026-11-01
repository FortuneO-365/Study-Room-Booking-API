import jwt from 'jsonwebtoken';
import { User } from '../../src/models/user.model.js';
import { Room } from '../../src/models/room.model.js';
import { Booking } from '../../src/models/booking.model.js';

let seq = 0;

// Fixed dates. FUTURE_DAY is a Monday in 2030, so it is always in the future.
// Africa/Lagos has no daylight saving, so local time is always UTC+1 here.
export const FUTURE_DAY = '2030-06-03';
export const PAST_DAY = '2020-01-06';

export async function createUser(role: 'student' | 'admin' = 'student') {
  seq += 1;
  return User.create({
    name: `Test User ${seq}`,
    email: `user${seq}@test.local`,
    passwordHash: 'Password123', // hashed by the model's pre-save hook
    role,
  });
}

export function tokenFor(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export function authHeader(user: { id: string; role: string }) {
  return `Bearer ${tokenFor(user)}`;
}

export async function createRoom(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return Room.create({
    roomName: `Room ${seq}`,
    capacity: 12,
    amenities: [],
    isActive: true,
    ...overrides,
  });
}

// Writes straight to the database, for setting up state the API would refuse to create
export async function createBooking(overrides: {
  userId: unknown;
  roomId: unknown;
  startTime: string;
  endTime: string;
  status?: 'confirmed' | 'cancelled';
  attendeeCount?: number;
}) {
  return Booking.create({
    attendeeCount: 2,
    status: 'confirmed',
    ...overrides,
    startTime: new Date(overrides.startTime),
    endTime: new Date(overrides.endTime),
  });
}