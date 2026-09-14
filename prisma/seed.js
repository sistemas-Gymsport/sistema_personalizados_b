require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Catalogos base reales del gimnasio (no son datos de prueba: son las
// sucursales fisicas con las que opera GymSport). Los datos marcados con
// [DEV] mas abajo si son unicamente de desarrollo/demo.
const SUCURSALES_BASE = ['Geoplazas', 'Toscana', 'Lomas', 'Satélite'];

async function main() {
  console.log('Sembrando datos base...');

  // ---- Usuario administrador ----
  const adminUsername = (process.env.SEED_ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'CambiaEstaClave123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      name: 'Administrador',
      username: adminUsername,
      passwordHash,
      role: 'ADMIN',
    },
  });
  const admin = await prisma.user.findUnique({ where: { username: adminUsername } });

  // ---- Sucursales reales ----
  const sucursales = {};
  for (const name of SUCURSALES_BASE) {
    sucursales[name] = await prisma.sucursal.upsert({ where: { name }, update: {}, create: { name } });
  }
  const sucursalPrincipal = sucursales[SUCURSALES_BASE[0]];

  // ---- Catalogos simples (forma de pago / estatus) ----
  const catalogSeeds = [
    { type: 'FORMA_PAGO', names: ['Efectivo', 'Tarjeta', 'Transferencia'] },
    { type: 'ESTATUS_PAGO', names: ['Pagado', 'Pendiente', 'Parcial'] },
    { type: 'ESTATUS_SESION', names: ['Programada', 'Realizada', 'Cancelada'] },
    { type: 'ESTATUS_COMISION', names: ['Generada', 'Pagada', 'Pendiente'] },
  ];

  for (const group of catalogSeeds) {
    for (let i = 0; i < group.names.length; i += 1) {
      await prisma.catalogItem.upsert({
        where: { type_name: { type: group.type, name: group.names[i] } },
        update: {},
        create: { type: group.type, name: group.names[i], order: i },
      });
    }
  }

  const estatusPagado = await prisma.catalogItem.findFirst({ where: { type: 'ESTATUS_PAGO', name: 'Pagado' } });
  const formaPagoEfectivo = await prisma.catalogItem.findFirst({ where: { type: 'FORMA_PAGO', name: 'Efectivo' } });
  const estatusSesionRealizada = await prisma.catalogItem.findFirst({ where: { type: 'ESTATUS_SESION', name: 'Realizada' } });

  // ---- Margenes de impresion ----
  const margins = [
    { name: 'Pequeño', top: 5, right: 5, bottom: 5, left: 5 },
    { name: 'Normal', top: 10, right: 10, bottom: 10, left: 10 },
    { name: 'Amplio', top: 20, right: 20, bottom: 20, left: 20 },
  ];
  for (const m of margins) {
    await prisma.margin.upsert({ where: { name: m.name }, update: {}, create: m });
  }

  // ---- Configuracion visual por defecto ----
  await prisma.themeConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', systemName: 'GymSport' },
  });

  // ---- Campos dinamicos de ejemplo ----
  await prisma.fieldDefinition.upsert({
    where: { entity_key: { entity: 'PERSONALIZADO', key: 'contacto_emergencia' } },
    update: {},
    create: {
      entity: 'PERSONALIZADO',
      key: 'contacto_emergencia',
      label: 'Contacto de emergencia',
      type: 'TEXT',
      required: false,
      order: 1,
    },
  });

  // ------------------------------------------------------------------------
  // Datos de ejemplo (SOLO desarrollo), marcados con prefijo [DEV].
  // ------------------------------------------------------------------------

  const instructor = await prisma.instructor.upsert({
    where: { id: 'seed-instructor-1' },
    update: {},
    create: {
      id: 'seed-instructor-1',
      name: '[DEV] Instructor Ejemplo',
      email: 'instructor.dev@gymsport.dev',
      defaultCommissionPercent: 30,
    },
  });

  // Usuario colaborador de ejemplo, enlazado al instructor de ejemplo.
  const colaboradorUsername = 'colaborador.dev';
  await prisma.user.upsert({
    where: { username: colaboradorUsername },
    update: {},
    create: {
      name: '[DEV] Colaborador Ejemplo',
      username: colaboradorUsername,
      passwordHash: await bcrypt.hash('Colaborador123!', 10),
      role: 'COLABORADOR',
      sucursalId: sucursalPrincipal.id,
    },
  });
  const colaborador = await prisma.user.findUnique({ where: { username: colaboradorUsername } });
  if (!instructor.userId) {
    await prisma.instructor.update({ where: { id: instructor.id }, data: { userId: colaborador.id } });
  }

  const paquete = await prisma.paquete.upsert({
    where: { id: 'seed-paquete-1' },
    update: {},
    create: {
      id: 'seed-paquete-1',
      name: '[DEV] Paquete 10 sesiones',
      sessionsCount: 10,
      price: 3000,
      sessionValue: 150,
    },
  });

  const socio = await prisma.socio.upsert({
    where: { id: 'seed-socio-1' },
    update: {},
    create: { id: 'seed-socio-1', name: '[DEV] Socio Ejemplo', email: 'socio.dev@gymsport.dev' },
  });

  // ---- Personalizado de ejemplo con sesiones y comision ----
  let personalizado = await prisma.personalizado.findUnique({ where: { folio: 'PER-0001' } });
  if (!personalizado) {
    const count = await prisma.personalizado.count();
    personalizado = await prisma.personalizado.create({
      data: {
        folio: `PER-${String(count + 1).padStart(4, '0')}`,
        saleDate: new Date(),
        sucursalId: sucursalPrincipal.id,
        socioId: socio.id,
        instructorId: instructor.id,
        paqueteId: paquete.id,
        sessionsContracted: paquete.sessionsCount,
        salePrice: paquete.price,
        formaPagoId: formaPagoEfectivo?.id,
        paymentDate: new Date(),
        estatusPagoId: estatusPagado?.id,
        startDate: new Date(),
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  const existingSesiones = await prisma.sesion.count({ where: { personalizadoId: personalizado.id } });
  if (existingSesiones === 0) {
    const data = [];
    for (let n = 1; n <= personalizado.sessionsContracted; n += 1) {
      data.push({
        personalizadoId: personalizado.id,
        sessionNumber: n,
        date: new Date(),
        instructorId: instructor.id,
        sucursalId: sucursalPrincipal.id,
        estatusId: n <= 3 ? estatusSesionRealizada?.id : null,
        realizada: n <= 3,
        createdById: admin.id,
        updatedById: admin.id,
      });
    }
    await prisma.sesion.createMany({ data });

    await prisma.personalizado.update({
      where: { id: personalizado.id },
      data: { sessionsRealized: 3 },
    });

    const percent = instructor.defaultCommissionPercent;
    const generatedAmount = Number(paquete.sessionValue) * 3 * (Number(percent) / 100);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await prisma.comision.create({
      data: {
        personalizadoId: personalizado.id,
        instructorId: instructor.id,
        period,
        sessionsRealized: 3,
        sessionValue: paquete.sessionValue,
        percent,
        generatedAmount,
        paidAmount: 0,
      },
    });
  }

  console.log('Seed completado.');
  console.log(`Sucursales: ${SUCURSALES_BASE.join(', ')}`);
  console.log(`Usuario admin: ${adminUsername} / contrasena: ${adminPassword}`);
  console.log(`Usuario colaborador de ejemplo: ${colaboradorUsername} / contrasena: Colaborador123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
