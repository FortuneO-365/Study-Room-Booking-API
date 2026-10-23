import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validation/user.schema.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again later.',
          details: [],
        },
      },
})

router.post('/register', authLimiter, validate(registerSchema), register);

router.post('/login', authLimiter, validate(loginSchema), login);


export default router;