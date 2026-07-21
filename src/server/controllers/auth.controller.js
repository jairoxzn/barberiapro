import { authService, REFRESH_MS } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'bp_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: REFRESH_MS,
  path: '/api/auth',
};

const meta = (req) => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});

const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, cookieOptions);

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, meta(req));
    setRefreshCookie(res, result.refreshToken);
    created(res, { user: result.user, accessToken: result.accessToken });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, meta(req));
    setRefreshCookie(res, result.refreshToken);
    ok(res, { user: result.user, accessToken: result.accessToken });
  }),

  registerClient: asyncHandler(async (req, res) => {
    const result = await authService.registerClient(req.body, meta(req));
    setRefreshCookie(res, result.refreshToken);
    created(res, { user: result.user, accessToken: result.accessToken });
  }),

  loginClient: asyncHandler(async (req, res) => {
    const result = await authService.loginClient(req.body, meta(req));
    setRefreshCookie(res, result.refreshToken);
    ok(res, { user: result.user, accessToken: result.accessToken });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const result = await authService.refresh(token, meta(req));
    setRefreshCookie(res, result.refreshToken);
    ok(res, { user: result.user, accessToken: result.accessToken });
  }),

  logout: asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
    ok(res, { message: 'Sesión cerrada' });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id);
    ok(res, user);
  }),
};
