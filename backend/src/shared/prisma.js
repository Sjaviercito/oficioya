// Cliente único de Prisma (sin motor binario, con el adaptador oficial de "pg").
// Prisma usa consultas parametrizadas (equivalente a sentencias preparadas), así que nunca
// se concatena SQL. Regla del proyecto: prohibido $queryRawUnsafe y $executeRawUnsafe.
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
