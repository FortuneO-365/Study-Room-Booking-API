process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-at-least-thirty-two-characters-long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.OPENING_HOUR = '8';
process.env.CLOSING_HOUR = '22';
process.env.MAX_FUTURE_BOOKINGS_PER_STUDENT = '3';
process.env.BUILDING_TIMEZONE = 'Africa/Lagos';