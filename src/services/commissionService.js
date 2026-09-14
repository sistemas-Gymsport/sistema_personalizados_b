const prisma = require('../config/db');

// Resuelve el porcentaje de comision aplicable a un instructor:
// 1) regla activa especifica del instructor (la mas reciente)
// 2) regla global activa (instructorId null)
// 3) porcentaje por defecto guardado en el instructor
async function resolveCommissionPercent(instructorId) {
  const specificRule = await prisma.commissionRule.findFirst({
    where: { instructorId, active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (specificRule) return specificRule.percent;

  const globalRule = await prisma.commissionRule.findFirst({
    where: { instructorId: null, active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (globalRule) return globalRule.percent;

  const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } });
  return instructor ? instructor.defaultCommissionPercent : 0;
}

// Comision generada = valor por sesion * sesiones realizadas * porcentaje/100
function computeGeneratedAmount(sessionValue, sessionsRealized, percent) {
  const value = Number(sessionValue) * Number(sessionsRealized) * (Number(percent) / 100);
  return Math.round(value * 100) / 100;
}

function periodFromDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Crea o actualiza la comision de un personalizado para el periodo actual,
// recalculando a partir de las sesiones realizadas hasta el momento.
async function upsertComisionForPersonalizado(personalizadoId, tx = prisma) {
  const personalizado = await tx.personalizado.findUnique({
    where: { id: personalizadoId },
    include: { paquete: true, instructor: true },
  });
  if (!personalizado) return null;

  const realizedCount = await tx.sesion.count({
    where: { personalizadoId, realizada: true },
  });

  const percent = await resolveCommissionPercent(personalizado.instructorId);
  const sessionValue = personalizado.paquete.sessionValue;
  const generatedAmount = computeGeneratedAmount(sessionValue, realizedCount, percent);
  const period = periodFromDate(personalizado.saleDate);

  const existing = await tx.comision.findFirst({
    where: { personalizadoId, period },
  });

  if (existing) {
    return tx.comision.update({
      where: { id: existing.id },
      data: {
        sessionsRealized: realizedCount,
        sessionValue,
        percent,
        generatedAmount,
      },
    });
  }

  return tx.comision.create({
    data: {
      personalizadoId,
      instructorId: personalizado.instructorId,
      period,
      sessionsRealized: realizedCount,
      sessionValue,
      percent,
      generatedAmount,
      paidAmount: 0,
    },
  });
}

module.exports = {
  resolveCommissionPercent,
  computeGeneratedAmount,
  periodFromDate,
  upsertComisionForPersonalizado,
};
