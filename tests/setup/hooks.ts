import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/user.model.js';
import { Room } from '../../src/models/room.model.js';

// Each test file gets its own in-memory MongoDB, so the real database is never touched.
let mongod: MongoMemoryServer | undefined;

beforeAll(async () => {
  // The error handler logs every expected 4xx as JSON. Tests check the responses instead,
  // so the logs are muted to keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'study-room-test' });
  // Build unique indexes, so duplicate-key tests exercise the real index
  await Promise.all([User.init(), Room.init()]);
}, 120_000);

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})),
  );
});

afterAll(async () => {
  vi.restoreAllMocks();
  await mongoose.disconnect();
  await mongod?.stop();
});