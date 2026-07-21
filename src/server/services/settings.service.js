import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// Campos del negocio (tabla Tenant) y de la configuración (TenantSettings).
const TENANT_FIELDS = ['name', 'email', 'phone', 'logoUrl'];
const SETTINGS_FIELDS = [
  'currency',
  'timezone',
  'primaryColor',
  'taxRate',
  'invoiceSeries',
  'facebookUrl',
  'instagramUrl',
  'whatsappNumber',
  'pointsPerCurrency',
  'pointsOnBirthday',
  'pointsOnFirstVisit',
  'pointsOnReferral',
];

const pick = (obj, keys) =>
  Object.fromEntries(
    keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])
  );

export const settingsService = {
  async get(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true },
    });
    if (!tenant) throw ApiError.notFound('Negocio no encontrado');

    // Garantiza que exista la fila de settings.
    let settings = tenant.settings;
    if (!settings) {
      settings = await prisma.tenantSettings.create({ data: { tenantId } });
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      phone: tenant.phone,
      logoUrl: tenant.logoUrl,
      settings,
    };
  },

  async update(tenantId, data) {
    const tenantData = pick(data, TENANT_FIELDS);
    const settingsData = pick(data, SETTINGS_FIELDS);

    await prisma.$transaction(async (tx) => {
      if (Object.keys(tenantData).length) {
        await tx.tenant.update({ where: { id: tenantId }, data: tenantData });
      }
      await tx.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, ...settingsData },
        update: settingsData,
      });
    });

    return this.get(tenantId);
  },

  async updateLogo(tenantId, logoUrl) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } });
    return this.get(tenantId);
  },
};
