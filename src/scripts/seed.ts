import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Room } from '../models/room.model.js';

const SEED_USERS = [
  { name: 'Test Admin', email: 'admin@test.local', password: 'Admin12345', role: 'admin' },
  { name: 'Test Student', email: 'student@test.local', password: 'Student123', role: 'student' },
] as const;

const SEED_ROOMS = [
  { roomName: 'Library L2-07', capacity: 10, amenities: ['whiteboard', 'screen'], isActive: true },
  { roomName: 'Library L2-08', capacity: 20, amenities: ['whiteboard'], isActive: true },
  { roomName: 'Library L3-01', capacity: 10, amenities: ['whiteboard', 'screen', 'projector'], isActive: true },
  { roomName: 'Engineering E1-12', capacity: 30, amenities: ['screen'], isActive: true },
  { roomName: 'Old Annex A-02', capacity: 10, amenities: [], isActive: false },
];

async function seedUsers() {
  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`exists  ${u.role.padEnd(8)} ${u.email}`);
      continue;
    }
    // The model's pre-save hook hashes passwordHash, so pass the plain password here
    await User.create({
      name: u.name,
      email: u.email,
      passwordHash: u.password,
      role: u.role,
    });
    console.log(`created ${u.role.padEnd(8)} ${u.email}  password: ${u.password}`);
  }
}

async function seedRooms() {
  for (const r of SEED_ROOMS) {
    const existing = await Room.findOne({ roomName: r.roomName });
    if (existing) {
      console.log(`exists  room     ${r.roomName}  id: ${existing.id}`);
      continue;
    }
    const room = await Room.create(r);
    console.log(`created room     ${r.roomName}  id: ${room.id}`);
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Check your .env file.');
  }

  await mongoose.connect(uri);
  console.log(`Connected to database: ${mongoose.connection.name}\n`);

  await seedUsers();
  console.log();
  await seedRooms();

  await mongoose.disconnect();
  console.log('\nSeeding complete. Running the seed again is safe: existing records are skipped.');
}

main().catch(async (err) => {
  console.error('Seeding failed:', err.message ?? err);
  await mongoose.disconnect();
  process.exit(1);
});