# OficioYa — MVP (Etapa 3)

Plataforma web mobile-first que conecta clientes de Puebla con trabajadores de oficios verificados.
Construida según el contrato técnico v0.2 (ver los cambios en la tabla de trazabilidad).

- **backend/**: API REST en `/api/v1` — Node.js 22, Express 5, Prisma 6 (sin motor binario, adaptador `pg`) y PostgreSQL 16.
- **frontend/**: React 18 + Vite + React Router. En producción la API sirve el frontend compilado desde el mismo dominio.

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 (local con Docker o en la nube, por ejemplo Neon)

## Puesta en marcha local

```bash
# 1. Base de datos local (opcional si usas Neon)
cd backend
docker compose up -d

# 2. Variables de entorno
cp .env.example .env
#   Llena JWT_SECRET e IDENTITY_ENC_KEY (los comandos para generarlos están en el archivo).

# 3. Dependencias, migraciones y datos de prueba
npm install            # también ejecuta "prisma generate"
npx prisma migrate deploy
SEED_DEMO=true npm run db:seed     # cuentas de demostración (solo si se pide)

# 4. API (puerto 3000)
npm run dev

# 5. Frontend (en otra terminal, puerto 5173)
cd ../frontend
npm install
npm run dev
```

## Usuarios de prueba (datos ficticios)

Contraseña para todos: `OficioYa2026!`

| Correo | Rol |
|---|---|
| admin@oficioya.test | Administrador (verifica identidades) |
| cliente@oficioya.test | Cliente (tiene una solicitud abierta) |
| trabajador@oficioya.test | Trabajador verificado de Plomería en Centro |

El seed también crea el escenario del CA-04.1 y CA-10.1 (Beatriz con puntuación 3.49).

## Pruebas automáticas

```bash
cd backend
npm run test:unit                       # reglas de negocio, sin base de datos
DATABASE_URL_TEST="postgresql://usuario:clave@localhost:5432/oficioya_test" npm test
```

La base de pruebas se **borra y recrea** en cada ejecución: nunca uses la de desarrollo o producción.
Cada prueba lleva el ID del criterio de aceptación que verifica (por ejemplo `CA-07.5`).

## Despliegue (plan B: frontend en el subdominio, API en Render)

El servidor del profe solo sirve archivos (no ejecuta Node) y todo lo que se sube ahí es público.
Por eso **el backend y el `.env` nunca se suben a ese servidor**.

**API en Render (gratis):**
1. Sube este proyecto a un repositorio **privado** de GitHub (el `.gitignore` ya excluye `.env` y `node_modules`).
2. En render.com: **New → Blueprint** → elige el repositorio. Render lee `render.yaml`.
3. Cuando lo pida, pega en `DATABASE_URL` la cadena de Neon (conexión directa, sin pooling).
   `JWT_SECRET` e `IDENTITY_ENC_KEY` los genera Render solo.
4. Al terminar, abre `https://<tu-servicio>.onrender.com/api/v1/health` → debe responder `{"ok":true}`.

**Frontend en `equipo6.centrofuyuan.com`:**
1. En `frontend/`, crea `.env.production` con `VITE_API_URL=https://<tu-servicio>.onrender.com`.
2. `npm run build`
3. Sube **el contenido** de `frontend/dist` (incluido el archivo oculto `.htaccess`) a la raíz `/` del FTP.

**Limitaciones del plan gratuito de Render** (reportarlas en la trazabilidad):
- Se duerme tras 15 minutos sin uso. Desde la v1.2, `.github/workflows/mantener-despierta.yml` la mantiene despierta de 6:00 a 24:00 (Puebla) y dispara las tareas periódicas.
- (Resuelto en v1.1) Las fotos e identificaciones ya no se pierden: se guardan en PostgreSQL.
- Antes de un lanzamiento real: quitar `SEED_DEMO` de `render.yaml` y cambiar la contraseña del admin de demostración desde "Mi cuenta".

## Reglas de seguridad del proyecto

- Credenciales y claves solo en `.env` (ignorado por Git). `.env.example` no tiene secretos.
- Consultas solo con métodos de Prisma (parametrizadas). Prohibido `$queryRawUnsafe` y `$executeRawUnsafe`.
- Toda entrada se valida en el servidor con zod (`schemas.js` de cada módulo).
- Contraseñas con bcrypt (costo 10). Identificaciones cifradas con AES-256-GCM.
