import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError.js';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const timestamp = new Date().toISOString();
  const path = `${req.method} ${req.originalUrl}`;

  // 1. Our own errors, with their own status and code
  if (err instanceof ApiError) {
    console.error(JSON.stringify({ level: 'error', timestamp, path, ...err.toJSON() }));
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // 2. Bad JSON in the request body (missing or extra comma, unquoted key, smart quotes).
  //    body-parser sets type to 'entity.parse.failed' on these errors.
  if (err?.type === 'entity.parse.failed') {
    console.warn(JSON.stringify({ level: 'warn', timestamp, path, code: 'INVALID_JSON' }));
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request body is not valid JSON. Check for missing or extra commas and straight quotes.',
        details: [],
      },
    });
  }

  // 3. Other client-side body errors from body-parser (wrong size, wrong encoding)
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    console.warn(JSON.stringify({ level: 'warn', timestamp, path, status: err.status, message: err.message }));
    return res.status(err.status).json({
      error: { code: 'BAD_REQUEST', message: err.message, details: [] },
    });
  }

  // 4. Everything else is a real server bug. Log the stack and return 500.
  console.error(
    JSON.stringify({
      level: 'error',
      timestamp,
      path,
      name: err?.name ?? 'UnknownError',
      message: err?.message ?? String(err),
      stack: err?.stack,
    }),
  );
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', details: [] },
  });
}