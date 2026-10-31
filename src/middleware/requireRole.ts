import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError.js';
import type { Role } from '../constants/roles.js';

// Must run after requireAuth, which sets req.user
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to do this.'));
    }
    next();
  };
}