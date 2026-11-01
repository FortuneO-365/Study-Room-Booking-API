import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { requireRole } from '../../src/middleware/requireRole.js';
import { requireAuth } from '../../src/middleware/requireAuth.js';
import ApiError from '../../src/utils/ApiError.js';

// Runs a middleware with a fake request and returns the next() spy
function run(middleware: (req: any, res: any, next: any) => unknown, req: Record<string, unknown>) {
  const next = vi.fn();
  middleware(req, {}, next);
  return next;
}

const secret = process.env.JWT_SECRET!;

describe('validate()', () => {
  const schema = z.object({ capacity: z.number().min(10) });

  it('replaces the body with the parsed value and calls next() with no error', () => {
    const req: any = { body: { capacity: 12 } };
    const next = run(validate(schema), req);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ capacity: 12 });
  });

  it('passes a 400 VALIDATION_ERROR with field details when the input is invalid', () => {
    const next = run(validate(schema), { body: { capacity: 3 } });
    const err = next.mock.calls[0][0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual([expect.objectContaining({ field: 'capacity' })]);
  });

  it('validates params when asked to', () => {
    const next = run(validate(z.object({ id: z.string().min(3) }), 'params'), { params: { id: 'ab' } });
    expect((next.mock.calls[0][0] as ApiError).code).toBe('VALIDATION_ERROR');
  });
});

describe('requireRole()', () => {
  it('lets a user with an allowed role through', () => {
    const next = run(requireRole('admin'), { user: { id: 'u1', role: 'admin' } });
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 FORBIDDEN for a role that is not allowed', () => {
    const next = run(requireRole('admin'), { user: { id: 'u1', role: 'student' } });
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('returns 403 when no user is attached, for example if requireAuth was forgotten', () => {
    const next = run(requireRole('admin'), {});
    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(403);
  });
});

describe('requireAuth()', () => {
  it('returns 401 when the Authorization header is missing', () => {
    const next = run(requireAuth, { headers: {} });
    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(401);
  });

  it('returns 401 when the scheme is not Bearer', () => {
    const next = run(requireAuth, { headers: { authorization: 'Basic abc' } });
    expect((next.mock.calls[0][0] as ApiError).code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'u1', role: 'admin' }, 'some-other-secret-value-here-123456');
    const next = run(requireAuth, { headers: { authorization: `Bearer ${forged}` } });
    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(401);
  });

  it('returns 401 for an expired token', () => {
    const expired = jwt.sign({ sub: 'u1', role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }, secret);
    const next = run(requireAuth, { headers: { authorization: `Bearer ${expired}` } });
    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(401);
  });

  it('attaches id and role from a valid token and calls next() with no error', () => {
    const token = jwt.sign({ sub: 'user-123', role: 'student' }, secret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const next = run(requireAuth, req);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-123', role: 'student' });
  });
});

describe('ApiError', () => {
  it('serialises to a plain object with the fields the error handler logs', () => {
    const err = ApiError.conflict('BOOKING_CONFLICT', 'Overlap.');
    expect(err.toJSON()).toEqual({
      name: 'ApiError',
      statusCode: 409,
      code: 'BOOKING_CONFLICT',
      message: 'Overlap.',
      details: [],
    });
  });

  it('builds 404 with the NOT_FOUND code', () => {
    expect(ApiError.notFound('Missing.')).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});