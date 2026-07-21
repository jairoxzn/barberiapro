import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'admin@barberiapro.com';

async function main() {
  console.log('🌱 Sembrando datos demo...');

  // Idempotente: si ya existe el admin demo, no duplicar.
  const existing = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log('⚠️  Datos demo ya existen. Omitiendo seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Barbería Demo',
      slug: 'barberia-demo',
      email: DEMO_EMAIL,
      phone: '+51 999 888 777',
      settings: {
        create: {
          currency: 'PEN',
          timezone: 'America/Lima',
          taxRate: 18,
          pointsPerCurrency: 1,
          pointsOnBirthday: 100,
          pointsOnFirstVisit: 50,
        },
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
      branches: {
        create: [
          { name: 'Sucursal Centro', address: 'Av. Principal 123', phone: '01-2345678' },
          { name: 'Sucursal Norte', address: 'Jr. Los Olivos 456' },
        ],
      },
    },
    include: { branches: true },
  });

  const mainBranch = tenant.branches[0];

  // Usuarios
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      name: 'Administrador Demo',
      email: DEMO_EMAIL,
      passwordHash,
      role: 'ADMIN',
    },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      name: 'Recepción Demo',
      email: 'recepcion@barberiapro.com',
      passwordHash,
      role: 'RECEPTIONIST',
    },
  });

  // Categorías
  const [catCortes, catBarba, catColor] = await Promise.all([
    prisma.category.create({ data: { tenantId: tenant.id, name: 'Cortes', color: '#6366f1' } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: 'Barba', color: '#f59e0b' } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: 'Color', color: '#ec4899' } }),
  ]);

  // Servicios
  await prisma.service.createMany({
    data: [
      { tenantId: tenant.id, categoryId: catCortes.id, name: 'Corte Clásico', durationMinutes: 30, price: 25, color: '#6366f1' },
      { tenantId: tenant.id, categoryId: catCortes.id, name: 'Corte + Lavado', durationMinutes: 45, price: 35, color: '#8b5cf6' },
      { tenantId: tenant.id, categoryId: catBarba.id, name: 'Perfilado de Barba', durationMinutes: 20, price: 18, color: '#f59e0b' },
      { tenantId: tenant.id, categoryId: catBarba.id, name: 'Afeitado Clásico', durationMinutes: 30, price: 22, color: '#f97316' },
      { tenantId: tenant.id, categoryId: catColor.id, name: 'Tinte', durationMinutes: 60, price: 60, color: '#ec4899' },
    ],
  });

  // Barberos con horario Lun-Sáb 09:00-19:00
  const weekdays = [1, 2, 3, 4, 5, 6];
  const scheduleData = weekdays.map((weekday) => ({
    weekday,
    startTime: '09:00',
    endTime: '19:00',
    isActive: true,
  }));

  for (const b of [
    { name: 'Carlos Ramírez', specialty: 'Fade & diseños', commissionRate: 40 },
    { name: 'Luis Torres', specialty: 'Barba clásica', commissionRate: 35 },
    { name: 'Andrés Gómez', specialty: 'Color', commissionRate: 45 },
  ]) {
    await prisma.barber.create({
      data: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        name: b.name,
        specialty: b.specialty,
        commissionRate: b.commissionRate,
        schedules: { create: scheduleData },
      },
    });
  }

  // Clientes con cuenta de fidelización
  for (const c of [
    { firstName: 'Juan', lastName: 'Pérez', phone: '987654321', dni: '45678912' },
    { firstName: 'María', lastName: 'López', phone: '912345678', dni: '78912345' },
    { firstName: 'Pedro', lastName: 'Sánchez', phone: '955555555', dni: '12345678' },
  ]) {
    await prisma.client.create({
      data: { ...c, tenantId: tenant.id, loyaltyAccount: { create: {} } },
    });
  }

  // Marca + productos con stock inicial en la sucursal principal (para el POS)
  const brand = await prisma.brand.create({
    data: { tenantId: tenant.id, name: 'BarberLine' },
  });
  for (const p of [
    { name: 'Cera Mate 100g', sku: 'CER-001', costPrice: 12, salePrice: 25, stock: 40, minStock: 10 },
    { name: 'Shampoo Anticaspa', sku: 'SHA-001', costPrice: 15, salePrice: 30, stock: 25, minStock: 8 },
    { name: 'Aceite para Barba', sku: 'ACE-001', costPrice: 18, salePrice: 35, stock: 30, minStock: 10 },
    { name: 'Gel Fijador Fuerte', sku: 'GEL-001', costPrice: 8, salePrice: 18, stock: 6, minStock: 12 },
  ]) {
    const { stock, ...data } = p;
    const product = await prisma.product.create({
      data: { ...data, tenantId: tenant.id, brandId: brand.id },
    });
    await prisma.productStock.create({
      data: { productId: product.id, branchId: mainBranch.id, quantity: stock },
    });
    await prisma.inventoryMovement.create({
      data: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        productId: product.id,
        type: 'INITIAL',
        quantity: stock,
        balanceAfter: stock,
        unitCost: data.costPrice,
        note: 'Stock inicial (seed)',
      },
    });
  }

  console.log('✅ Seed completo.');
  console.log('   Login:  admin@barberiapro.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
