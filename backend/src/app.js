// Aplicación Express: API REST versionada en /api/v1 (ADR-01).
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const { manejadorErrores, errores } = require('./shared/errors');
const { forzarHttps } = require('./shared/middleware/https');

const app = express();
app.set('trust proxy', 1); // el hosting termina HTTPS en un proxy y manda x-forwarded-proto
app.disable('x-powered-by');

app.use(forzarHttps);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
      },
    },
    // Las fotos públicas se muestran desde el frontend, que vive en otro dominio.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
// Orígenes permitidos (separados por coma): el frontend en el subdominio y localhost para desarrollo.
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '100kb' }));

// Fotos públicas (perfil y solicitudes), servidas desde la base de datos (ADR-05 v1.1).
// Las identificaciones están marcadas como privadas y nunca salen por esta ruta.
const { leerPublico } = require('./shared/storage');
app.use('/uploads', async (req, res, next) => {
  try {
    const archivo = await leerPublico(decodeURIComponent(req.path.slice(1)));
    if (!archivo) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=86400');
    return res.type(archivo.mime).send(archivo.buffer);
  } catch (e) {
    return next(e);
  }
});

const api = express.Router();
// El ping externo (cada 10 min) mantiene la API despierta y de paso ejecuta las tareas periódicas
// que un cron interno no puede garantizar en el plan gratuito.
const { tareasPeriodicas } = require('./shared/tareas');
api.get('/health', (req, res) => {
  tareasPeriodicas().catch((e) => console.error('[tareas]', e.message));
  res.json({ ok: true });
});
api.use('/auth', require('./modules/auth/routes'));
api.use('/catalog', require('./modules/catalog/routes'));
api.use('/workers', require('./modules/workers/routes'));
api.use('/admin', require('./modules/admin/routes'));
api.use('/requests/:id/quotes', require('./modules/quotes/routes'));
api.use('/requests/:id/review', require('./modules/reviews/routes'));
api.use('/requests/:id/adjustments', require('./modules/adjustments/routes'));
api.use('/requests/:id', require('./modules/coordinacion/routes')); // v1.2
api.use('/requests', require('./modules/requests/routes'));
api.use('/', require('./modules/extras/routes')); // RF-11, RF-12, RF-13
api.use((req, res, next) => next(errores.notFound('Ruta no encontrada')));
app.use('/api/v1', api);

// En producción se sirve el frontend compilado (frontend/dist) desde el mismo dominio.
const dist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(manejadorErrores);

module.exports = app;
