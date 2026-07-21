import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt.js';
const REFRESH_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const buildTokens = (user) => {
  const payload = {
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
    branchId: user.branchId,
  };
  return {
    accessToken: signAccessToken(payload),
    // jti aleatorio: garantiza que cada refresh token sea único aunque se
    // emitan dos en el mismo segundo (evita colisiones de tokenHash → 409).
    refreshToken: signRefreshToken({ sub: user.id, jti: crypto.randomUUID() }),
  };
};

const persistRefreshToken = async (userId, refreshToken, meta = {}) => {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_MS),
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
  });
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId,
  branchId: user.branchId,
  avatarUrl: user.avatarUrl,
});

export const authService = {
  // Registro self-service: crea barbería (tenant) + sucursal + admin.
  async register({ businessName, name, email, password }, meta) {
    const passwordHash = await hashPassword(password);
    let slug = slugify(businessName) || 'barberia';

    // Garantiza slug único.
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const user = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug,
          email,
          settings: { create: {} },
          branches: {
            create: { name: 'Sucursal Principal' },
          },
          loyaltyTiers: {
            create: [
              { level: 'BRONZE', name: 'Bronce', minPoints: 0 },
              { level: 'SILVER', name: 'Plata', minPoints: 500 },
              { level: 'GOLD', name: 'Oro', minPoints: 1500 },
              { level: 'PLATINUM', name: 'Platino', minPoints: 4000 },
              { level: 'DIAMOND', name: 'Diamante', minPoints: 10000 },
            ],
          },
        },
        include: { branches: true },
      });

      return tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: tenant.branches[0].id,
          name,
          email,
          passwordHash,
          role: 'ADMIN',
        },
      });
    });

    const tokens = buildTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, meta);
    return { user: publicUser(user), ...tokens };
  },

  async login({ email, password }, meta) {
    // Login de staff: excluye cuentas de cliente (esas entran por el portal).
    const user = await prisma.user.findFirst({
      where: { email, isActive: true, role: { not: 'CLIENT' } },
    });
    if (!user) throw ApiError.unauthorized('Credenciales inválidas');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Credenciales inválidas');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = buildTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, meta);
    return { user: publicUser(user), ...tokens };
  },

  // ----- Reserva online: registro de cliente (scoped por barbería) -----
  async registerClient({ slug, firstName, lastName, phone, email, password }, meta) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.isActive) throw ApiError.notFound('Barbería no encontrada');

    const existing = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email },
    });
    if (existing) {
      throw ApiError.conflict('Ya existe una cuenta con ese correo en esta barbería');
    }

    const passwordHash = await hashPassword(password);
    const name = `${firstName} ${lastName || ''}`.trim();

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          passwordHash,
          role: 'CLIENT',
        },
      });
      await tx.client.create({
        data: {
          tenantId: tenant.id,
          userId: u.id,
          firstName,
          lastName,
          phone,
          email,
          loyaltyAccount: { create: {} },
        },
      });
      return u;
    });

    const tokens = buildTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, meta);
    return { user: publicUser(user), ...tokens };
  },

  // ----- Reserva online: login de cliente (scoped por barbería) -----
  async loginClient({ slug, email, password }, meta) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw ApiError.unauthorized('Credenciales inválidas');

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email, role: 'CLIENT', isActive: true },
    });
    if (!user) throw ApiError.unauthorized('Credenciales inválidas');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Credenciales inválidas');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = buildTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, meta);
    return { user: publicUser(user), ...tokens };
  },

  async refresh(refreshToken, meta) {
    if (!refreshToken) throw ApiError.unauthorized('Refresh token requerido');

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Refresh token inválido o expirado');
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Sesión inválida, inicia sesión nuevamente');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.isActive) throw ApiError.unauthorized();

    // Rotación: revoca el token usado y emite uno nuevo.
    const tokens = buildTokens(user);
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + REFRESH_MS),
          userAgent: meta?.userAgent,
          ip: meta?.ip,
        },
      }),
    ]);

    return { user: publicUser(user), ...tokens };
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { include: { settings: true } }, branch: true },
    });
    if (!user) throw ApiError.notFound('Usuario no encontrado');
    return {
      ...publicUser(user),
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            logoUrl: user.tenant.logoUrl,
            currency: user.tenant.settings?.currency || 'PEN',
            primaryColor: user.tenant.settings?.primaryColor || '#6366f1',
          }
        : null,
      branch: user.branch
        ? { id: user.branch.id, name: user.branch.name }
        : null,
    };
  },
};

export { REFRESH_MS };
