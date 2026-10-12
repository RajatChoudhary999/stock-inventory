import { Request, Response } from 'express';
import { env } from '../../config/env';
import { authService } from './auth.service';

const REFRESH_COOKIE = 'refreshToken';

/** httpOnly cookie so JS can't read the refresh token (mitigates XSS token theft). */
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

export const authController = {
  async register(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ user, accessToken });
  },

  async login(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  },

  async refresh(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.refresh(
      req.cookies?.[REFRESH_COOKIE],
    );
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.sub);
    res.json({ user });
  },
};
