import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { createUser } from '../helpers/factories.js';
import { User } from '../../src/models/user.model.js';

const newStudent = { name: 'Ada Okafor', email: 'ada@student.example.edu', password: 'password123' };

describe('POST /api/auth/register', () => {
  it('creates a student and returns a token, without ever exposing the password or its hash', async () => {
    const res = await request(app).post('/api/auth/register').send(newStudent);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.result.user).toMatchObject({ email: newStudent.email, role: 'student' });
    expect(res.body.result.token).toEqual(expect.any(String));

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain('password123');
  });

  it('ignores a role sent by the client and always creates a student', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...newStudent, email: 'sneaky@student.example.edu', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.result.user.role).toBe('student');
  });

  it('stores a padded, mixed-case email in normalised form', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...newStudent, email: '  Ada.Two@Example.COM ' });

    expect(res.status).toBe(201);
    expect(res.body.result.user.email).toBe('ada.two@example.com');
  });

  it('returns 409 EMAIL_TAKEN for an email that is already registered', async () => {
    await request(app).post('/api/auth/register').send(newStudent);
    const res = await request(app).post('/api/auth/register').send(newStudent);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('gives exactly one 201 and one 409 when the same email is registered at the same moment', async () => {
    // Both requests can pass the findOne check. The unique index must stop the second one.
    const [a, b] = await Promise.all([
      request(app).post('/api/auth/register').send(newStudent),
      request(app).post('/api/auth/register').send(newStudent),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await User.countDocuments({ email: newStudent.email })).toBe(1);
  });

  it('returns 400 VALIDATION_ERROR pointing at email for a malformed address', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...newStudent, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'email' })]);
  });

  it('returns 400 when the password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...newStudent, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 INVALID_JSON for a body with a trailing comma', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": "Ada", "email": "a@b.co", "password": "password1",}');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token and the user, including createdAt, for correct credentials', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.result.token).toEqual(expect.any(String));
    expect(res.body.result.user.email).toBe(user.email);
    expect(res.body.result.user.createdAt).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('returns 401 UNAUTHORIZED for a wrong password', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('gives the same 401 response for an unknown email as for a wrong password', async () => {
    const user = await createUser();
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: user.email, password: 'nope-nope' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@test.local', password: 'nope-nope' });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('returns 400 when the password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'someone@test.local' });
    expect(res.status).toBe(400);
  });
});

describe('error handling', () => {
  it('returns a generic 500 for an unexpected failure and never leaks the internal message', async () => {
    vi.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('connection string secret leaked here'));

    const res = await request(app).post('/api/auth/register').send(newStudent);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('returns 413 with a BAD_REQUEST code for a body over the size limit', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x'.repeat(200_000), email: 'a@b.co', password: 'password1' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});