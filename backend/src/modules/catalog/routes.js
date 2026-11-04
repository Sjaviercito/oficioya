// Catálogo de oficios y zonas (público).
const { Router } = require('express');
const prisma = require('../../shared/prisma');

const router = Router();
router.get('/', async (req, res) => {
  const [oficios, zonas] = await Promise.all([
    prisma.oficio.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.zona.findMany({ orderBy: { nombre: 'asc' } }),
  ]);
  res.json({ oficios, zonas });
});

module.exports = router;
