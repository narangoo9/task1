import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export interface TokenPayload {
  sub: string;   // userId
  tid: string;   // tenantId
  role: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class TokenService {
  // ---- Access Token ----
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      issuer: 'taskflow',
      audience: 'taskflow-client',
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.JWT_ACCESS_SECRET, {
        issuer: 'taskflow',
        audience: 'taskflow-client',
      }) as TokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid access token', 401, 'TOKEN_INVALID');
    }
  }

  // ---- Refresh Token Rotation ----
  static async generateTokenPair(
    userId: string,
    tenantId: string,
    role: string,
    email: string,
    meta?: { userAgent?: string; ipAddress?: string },
    existingFamily?: string
  ): Promise<AuthTokens> {
    const family = existingFamily ?? randomUUID();
    const refreshToken = randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store hashed refresh token
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        family,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    const accessToken = this.generateAccessToken({ sub: userId, tid: tenantId, role, email });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  static async rotateRefreshToken(
    refreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens & { userId: string }> {
    const existing = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { tenants: true } } },
    });

    if (!existing) {
      throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
    }

    // Detect token reuse — revoke entire family (compromise detection)
    if (existing.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { family: existing.family },
        data: { revokedAt: new Date() },
      });
      throw new AppError('Refresh token reuse detected. Please log in again.', 401, 'TOKEN_REUSE');
    }

    if (existing.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    // Get primary tenant
    const primaryTenant = existing.user.tenants[0];
    if (!primaryTenant) throw new AppError('User has no tenant', 400);

    const tokens = await this.generateTokenPair(
      existing.userId,
      primaryTenant.tenantId,
      primaryTenant.role,
      existing.user.email,
      meta,
      existing.family // Same family for rotation tracking
    );

    return { ...tokens, userId: existing.userId };
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Clean up expired tokens (run via cron)
  static async cleanExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  }
}
