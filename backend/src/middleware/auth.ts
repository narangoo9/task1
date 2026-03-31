import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '../services/TokenService';
import { AppError } from '../utils/AppError';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.slice(7);
  try {
    req.user = TokenService.verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

// Role guard factory
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

// Tenant isolation — ensure user belongs to the tenant they're accessing
export async function requireTenantAccess(req: Request, _res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] as string || req.user?.tid;
  if (!tenantId || req.user?.tid !== tenantId) {
    return next(new AppError('Tenant access denied', 403));
  }
  next();
}
