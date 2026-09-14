const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

const include = {
  instructor: true,
  sucursal: true,
  items: { include: { comision: { include: { personalizado: { select: { folio: true } } } } } },
};

const list = asyncHandler(async (req, res) => {
  const { instructorId, period, sucursalId, page = '1', pageSize = '20' } = req.query;
  const where = {};
  if (instructorId) where.instructorId = instructorId;
  if (period) where.period = period;
  if (sucursalId) where.sucursalId = sucursalId;

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.corteComision.findMany({ where, include, orderBy: { date: 'desc' }, skip, take }),
    prisma.corteComision.count({ where }),
  ]);
  sendSuccess(res, 200, items, { total, page: Number(page), pageSize: take });
});

const getById = asyncHandler(async (req, res) => {
  const item = await prisma.corteComision.findUnique({ where: { id: req.params.id }, include });
  if (!item) throw new ApiError(404, 'Corte no encontrado.');
  sendSuccess(res, 200, item);
});

// Registra un corte/pago de comisiones: reparte el monto entre las
// comisiones indicadas y actualiza su paidAmount de forma transaccional.
const create = asyncHandler(async (req, res) => {
  const { instructorId, sucursalId, period, date, observaciones, comisiones } = req.body;
  if (!instructorId || !period || !Array.isArray(comisiones) || comisiones.length === 0) {
    throw new ApiError(400, 'Instructor, periodo y al menos una comision son obligatorios.');
  }

  const result = await prisma.$transaction(async (tx) => {
    let total = 0;
    for (const c of comisiones) {
      if (!c.comisionId || c.amountApplied === undefined) {
        throw new ApiError(400, 'Cada comision debe incluir comisionId y amountApplied.');
      }
      total += Number(c.amountApplied);
    }

    const corte = await tx.corteComision.create({
      data: {
        instructorId,
        sucursalId: sucursalId || null,
        period,
        amount: total,
        date: date ? new Date(date) : new Date(),
        observaciones,
        createdById: req.user.id,
      },
    });

    for (const c of comisiones) {
      const comision = await tx.comision.findUnique({ where: { id: c.comisionId } });
      if (!comision) throw new ApiError(404, `Comision no encontrada: ${c.comisionId}`);

      await tx.corteComisionItem.create({
        data: { corteId: corte.id, comisionId: c.comisionId, amountApplied: c.amountApplied },
      });

      const newPaid = Number(comision.paidAmount) + Number(c.amountApplied);
      await tx.comision.update({
        where: { id: c.comisionId },
        data: { paidAmount: newPaid, paymentDate: corte.date },
      });
    }

    return tx.corteComision.findUnique({ where: { id: corte.id }, include });
  });

  sendSuccess(res, 201, result);
});

// Resumen agregado de comisiones generadas/pagadas/pendientes por instructor/periodo/sucursal
const resumen = asyncHandler(async (req, res) => {
  const { instructorId, period, sucursalId } = req.query;
  const where = {};
  if (instructorId) where.instructorId = instructorId;
  if (period) where.period = period;
  if (sucursalId) where.personalizado = { sucursalId };

  const comisiones = await prisma.comision.findMany({ where });

  const generado = comisiones.reduce((sum, c) => sum + Number(c.generatedAmount), 0);
  const pagado = comisiones.reduce((sum, c) => sum + Number(c.paidAmount), 0);

  sendSuccess(res, 200, {
    comisionGenerada: round2(generado),
    comisionPagada: round2(pagado),
    comisionPendiente: round2(generado - pagado),
    totalRegistros: comisiones.length,
  });
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { list, getById, create, resumen };
