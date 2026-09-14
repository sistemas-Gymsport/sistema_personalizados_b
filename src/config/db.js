const { PrismaClient } = require('@prisma/client');

// Cliente Prisma como singleton para evitar agotar conexiones en desarrollo
// (hot reload de nodemon) y en entornos serverless.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
