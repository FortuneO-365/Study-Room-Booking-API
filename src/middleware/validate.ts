import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import ApiError from '../utils/ApiError.js';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodType, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || target,
        message: issue.message,
      }));
      return next(ApiError.badRequest('VALIDATION_ERROR', 'Invalid request.', details));
    }

    (req as any)[target] = result.data;
    next();
  };
}