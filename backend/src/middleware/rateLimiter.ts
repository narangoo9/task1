import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import type { Request, Response, NextFunction } from 'express';

const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();

export const rateLimiter = config.isDevelopment
  ? passThrough
  : rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
      skip: (req) => req.path === '/health',
    });

// Stricter limiter for auth endpoints
export const authRateLimiter = config.isDevelopment
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { error: 'Too many auth attempts.', code: 'AUTH_RATE_LIMITED' },
    });
