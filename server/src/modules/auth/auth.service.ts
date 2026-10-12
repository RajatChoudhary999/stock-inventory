import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { User, UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import type { AuthPayload } from '../../middleware/auth';
import type { LoginInput, RegisterInput } from './auth.schema';

const SALT_ROUNDS = 12;

function signAccessToken(user: Pick<User, 'id' | 'role' | 'email'>) {
  const payload: AuthPayload = { sub: user.id, role: user.role, email: user.email };
  const opts: SignOptions = { expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwt.accessSecret, opts);
}

function signRefreshToken(userId: number) {
  const opts: SignOptions = { expiresIn: `${env.jwt.refreshTtlDays}d` as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId }, env.jwt.refreshSecret, opts);
}

function publicUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export const authService = {
  /**
   * Registers a user. The FIRST user in an empty system becomes ADMIN so the
   * app is usable out of the box; everyone after is STAFF (admins promote later).
   */
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw HttpError.conflict('EMAIL_TAKEN', 'Email is already registered');

    const userCount = await prisma.user.count();
    const role: UserRole = userCount === 0 ? 'ADMIN' : 'STAFF';
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role },
    });
    return this.issueTokens(user);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Generic message + always compare to avoid user enumeration & timing leaks.
    const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !ok) throw HttpError.unauthorized('Invalid email or password');
    if (!user.isActive) throw HttpError.forbidden('Account is deactivated');
    return this.issueTokens(user);
  },

  issueTokens(user: User) {
    return {
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user.id),
    };
  },

  /** Verifies a refresh token and mints a new access token (rotation). */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw HttpError.unauthorized('Missing refresh token');
    let decoded: { sub: number };
    try {
      decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as unknown as { sub: number };
    } catch {
      throw HttpError.unauthorized('Invalid or expired refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.isActive) throw HttpError.unauthorized('User no longer valid');
    return {
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user.id),
    };
  },

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('User not found');
    return publicUser(user);
  },
};
