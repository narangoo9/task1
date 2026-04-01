import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { TokenService } from '../services/TokenService';
import { AppError } from '../utils/AppError';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { generateSlug } from '../utils/helpers';

const COOKIE_SAME_SITE: 'none' | 'lax' = config.isProduction ? 'none' : 'lax';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: COOKIE_SAME_SITE,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: COOKIE_OPTIONS.sameSite,
  path: '/',
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, tenantName } = req.body;

      // Check existing user
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError('Email already registered', 409);

      const passwordHash = await bcrypt.hash(password, 12);

      // Create tenant + user in transaction
      const { user, tenant } = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: tenantName ?? `${name}'s Workspace`,
            slug: await generateSlug(tenantName ?? name),
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            name,
            passwordHash,
            tenants: {
              create: { tenantId: tenant.id, role: 'ADMIN' },
            },
          },
          select: { id: true, email: true, name: true, avatar: true },
        });

        // Create default workspace
        const workspace = await tx.workspace.create({
          data: {
            tenantId: tenant.id,
            name: 'My Workspace',
            members: {
              create: { userId: user.id, role: 'ADMIN' },
            },
          },
        });

        // Seed a default board
        await tx.board.create({
          data: {
            workspaceId: workspace.id,
            name: 'Getting Started',
            color: '#6366f1',
            lists: {
              create: [
                { name: 'To Do', position: 1000 },
                { name: 'In Progress', position: 2000 },
                { name: 'Done', position: 3000 },
              ],
            },
          },
        });

        return { user, tenant };
      });

      const tokens = await TokenService.generateTokenPair(
        user.id,
        tenant.id,
        'ADMIN',
        user.email,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        }
      );

      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      logger.info({ userId: user.id, tenantId: tenant.id }, 'User registered');

      res.status(201).json({
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenants: {
            take: 1,
            orderBy: { joinedAt: 'asc' },
          },
        },
      });

      if (!user) throw new AppError('Invalid credentials', 401);

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new AppError('Invalid credentials', 401);

      const primaryTenant = user.tenants[0];
      if (!primaryTenant) throw new AppError('No tenant found', 400);

      const tokens = await TokenService.generateTokenPair(
        user.id,
        primaryTenant.tenantId,
        primaryTenant.role,
        user.email,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        }
      );

      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      res.json({
        user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
        tenantId: primaryTenant.tenantId,
        role: primaryTenant.role,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new AppError('No refresh token', 401);

      const result = await TokenService.rotateRefreshToken(refreshToken, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      res.json({
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        // Revoke this specific token
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { revokedAt: new Date() },
        });
      }

      res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
          tenants: {
            select: {
              tenantId: true,
              role: true,
              tenant: { select: { name: true, slug: true, plan: true } },
            },
          },
        },
      });

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}
