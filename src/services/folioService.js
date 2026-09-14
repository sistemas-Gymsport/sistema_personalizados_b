const prisma = require('../config/db');

const PREFIX = 'PER-';
const PAD = 4;

// Genera el siguiente folio y crea el personalizado en una sola operacion
// atomica, reintentando si otra peticion concurrente ya tomo ese folio.
async function createPersonalizadoWithFolio(data, maxRetries = 5) {
  let attempt = 0;
  let lastError;

  while (attempt < maxRetries) {
    attempt += 1;
    try {
      return await prisma.$transaction(async (tx) => {
        const count = await tx.personalizado.count();
        const folio = `${PREFIX}${String(count + 1).padStart(PAD, '0')}`;
        return tx.personalizado.create({ data: { ...data, folio } });
      });
    } catch (err) {
      lastError = err;
      // P2002 = violacion de restriccion unica (folio duplicado por carrera)
      if (err.code !== 'P2002') throw err;
    }
  }
  throw lastError;
}

module.exports = { createPersonalizadoWithFolio };
