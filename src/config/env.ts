import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not set. Check your .env file.');
}

export const env = {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  openingHour: Number(process.env.OPENING_HOUR ?? 8),
  closingHour: Number(process.env.CLOSING_HOUR ?? 22),
  maxFutureBookings: Number(process.env.MAX_FUTURE_BOOKINGS_PER_STUDENT ?? 3),
  buildingTimezone: process.env.BUILDING_TIMEZONE ?? "UTC",
};