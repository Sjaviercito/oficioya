// Pruebas de integración de punta a punta contra PostgreSQL real (DATABASE_URL_TEST).
// Cada prueba lleva el ID del criterio de aceptación del contrato que verifica.
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const hayDb = Boolean(process.env.DATABASE_URL_TEST);
const describeDb = hayDb ? describe : describe.skip;

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
const hoy = () => require('../../src/shared/fechas').hoyEnPuebla();

describeDb('Flujo completo de OficioYa (integración)', () => {
  let app, prisma, cat;
  const S = {}; // sesiones por nombre: { token, refresh, id }

  const auth = (s) => ({ Authorization: `Bearer ${S[s].token}` });

  async function registrar(nombre, rol) {
    const r = await request(app).post('/api/v1/auth/register').send({ nombre, email: `${nombre}@prueba.test`, password: 'Prueba1234', rol });
    expect(r.status).toBe(201);
    S[nombre] = { token: r.body.accessToken, refresh: r.body.refreshToken, id: r.body.usuario.id };
    return r;
  }

  async function perfilYVerificar(nombre, oficioId, zonaId, aprobar = true) {
    await request(app).put('/api/v1/workers/me/profile').set(auth(nombre))
      .field('oficioIds', JSON.stringify([oficioId])).field('zonaIds', JSON.stringify([zonaId])).field('experienciaAnios', '4')
      .expect(200);
    const env = await request(app).post('/api/v1/workers/me/identity').set(auth(nombre))
      .attach('ine', PNG, 'ine.png').attach('selfie', PNG, 'selfie.png');
    expect(env.status).toBe(202);
    const perfil = await request(app).get('/api/v1/workers/me/profile').set(auth(nombre));
    S[nombre].perfilId = perfil.body.perfil.id;
    if (aprobar) {
      await request(app).patch(`/api/v1/admin/verifications/${S[nombre].perfilId}`).set(auth('admin')).send({ decision: 'aprobar' }).expect(200);
    }
  }

  async function crearSolicitud(cliente, extra = {}) {
    const r = await request(app).post('/api/v1/requests').set(auth(cliente))
      .field('oficioId', String(cat.plomeria)).field('zonaId', String(cat.centro))
      .field('colonia', 'El Carmen').field('direccionExacta', 'Calle Secreta 99, Puebla')
      .field('descripcion', 'Gotea la llave del fregadero de la cocina').field('fechaDeseada', hoy());
    expect(r.status).toBe(201);
    return r.body.solicitud.id;
  }

  beforeAll(async () => {
    app = require('../../src/app');
    prisma = require('../../src/shared/prisma');
    const plomeria = await prisma.oficio.create({ data: { nombre: 'Plomería' } });
    const electricidad = await prisma.oficio.create({ data: { nombre: 'Electricidad' } });
    const centro = await prisma.zona.create({ data: { nombre: 'Centro' } });
    const lapaz = await prisma.zona.create({ data: { nombre: 'La Paz' } });
    cat = { plomeria: plomeria.id, electricidad: electricidad.id, centro: centro.id, lapaz: lapaz.id };
    await prisma.usuario.create({
      data: { nombre: 'Admin', email: 'admin@prueba.test', rol: 'admin', passwordHash: await bcrypt.hash('Admin1234', 10) },
    });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@prueba.test', password: 'Admin1234' });
    S.admin = { token: login.body.accessToken };
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  describe('RF-01 Registro e inicio de sesión', () => {
    test('CA-01.1 registro de cliente → 201 con sesión', async () => {
      const r = await registrar('ana', 'cliente');
      expect(r.body.usuario.rol).toBe('cliente');
      expect(r.body.accessToken).toBeTruthy();
    });
    test('CA-01.2 correo duplicado → 409', async () => {
      const r = await request(app).post('/api/v1/auth/register').send({ nombre: 'Ana 2', email: 'ana@prueba.test', password: 'Prueba1234', rol: 'cliente' });
      expect(r.status).toBe(409);
      expect(r.body.error.message).toBe('Este correo ya está registrado');
    });
    test('CA-01.3 contraseña incorrecta → 401 sin decir qué falló', async () => {
      const r = await request(app).post('/api/v1/auth/login').send({ email: 'ana@prueba.test', password: 'equivocada' });
      expect(r.status).toBe(401);
      expect(r.body.error.message).toBe('Correo o contraseña incorrectos');
    });
    test('CA-01.5 rol admin → 400', async () => {
      const r = await request(app).post('/api/v1/auth/register').send({ nombre: 'Hacker', email: 'h@prueba.test', password: 'Prueba1234', rol: 'admin' });
      expect(r.status).toBe(400);
    });
    test('RNF-02 (a) la contraseña se guarda con bcrypt ($2b$, costo 10)', async () => {
      const u = await prisma.usuario.findUnique({ where: { email: 'ana@prueba.test' } });
      expect(u.passwordHash.startsWith('$2b$10$')).toBe(true);
    });
    test('sin token → 401', async () => {
      await request(app).get('/api/v1/requests/mine').expect(401);
    });
  });

  describe('RF-02 / RF-03 Perfil y verificación', () => {
    test('CA-02.4 un cliente no puede editar perfil de trabajador → 403', async () => {
      await request(app).put('/api/v1/workers/me/profile').set(auth('ana')).field('oficioIds', '[1]').expect(403);
    });
    test('CA-02.2 sin zona → 400', async () => {
      await registrar('arturo', 'trabajador');
      const r = await request(app).put('/api/v1/workers/me/profile').set(auth('arturo'))
        .field('oficioIds', JSON.stringify([cat.plomeria])).field('experienciaAnios', '5');
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBe('Selecciona al menos una zona de servicio');
    });
    test('CA-02.1 perfil guardado queda "sin_enviar" y NO aparece en búsquedas [M1→M2]', async () => {
      const r = await request(app).put('/api/v1/workers/me/profile').set(auth('arturo'))
        .field('oficioIds', JSON.stringify([cat.plomeria])).field('zonaIds', JSON.stringify([cat.centro, cat.lapaz]))
        .field('experienciaAnios', '5').attach('foto', PNG, 'foto.png');
      expect(r.status).toBe(200);
      expect(r.body.perfil.estadoVerificacion).toBe('sin_enviar');
      expect(r.body.perfil.fotoUrl).toMatch(/^\/uploads\/perfiles\//);
      S.arturo.perfilId = r.body.perfil.id;
      const b = await request(app).get(`/api/v1/workers?oficioId=${cat.plomeria}&zonaId=${cat.centro}`).set(auth('ana'));
      expect(b.body.map((t) => t.id)).not.toContain(S.arturo.perfilId);
    });
    test('CA-02.3 foto de 6 MB → 413', async () => {
      const grande = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
      const r = await request(app).put('/api/v1/workers/me/profile').set(auth('arturo'))
        .field('oficioIds', JSON.stringify([cat.plomeria])).field('zonaIds', JSON.stringify([cat.centro]))
        .field('experienciaAnios', '5').attach('foto', grande, 'grande.png');
      expect(r.status).toBe(413);
      expect(r.body.error.message).toBe('La foto debe pesar máximo 5 MB');
    });
    test('CA-03.4 identificación en PDF → 400', async () => {
      const r = await request(app).post('/api/v1/workers/me/identity').set(auth('arturo'))
        .attach('ine', PDF, 'ine.pdf').attach('selfie', PNG, 'selfie.png');
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBe('Formato no permitido: usa JPG o PNG');
    });
    test('envío de INE y selfie → 202 "pendiente"', async () => {
      const r = await request(app).post('/api/v1/workers/me/identity').set(auth('arturo'))
        .attach('ine', PNG, 'ine.png').attach('selfie', PNG, 'selfie.png');
      expect(r.status).toBe(202);
      expect(r.body.estadoVerificacion).toBe('pendiente');
    });
    test('RNF-03 el archivo en disco está cifrado y no es una imagen', async () => {
      const ident = await prisma.identificacion.findUnique({ where: { trabajadorId: S.arturo.perfilId } });
      const bytes = fs.readFileSync(path.resolve(process.env.PRIVATE_STORAGE_DIR, ident.rutaIneCifrada));
      const { detectarTipo } = require('../../src/shared/middleware/upload');
      expect(detectarTipo(bytes)).toBeNull();
      expect(ident.rutaIneCifrada.endsWith('.enc')).toBe(true);
    });
    test('CA-03.5 un cliente o trabajador no puede ver la INE → 403', async () => {
      await request(app).get(`/api/v1/admin/verifications/${S.arturo.perfilId}/files/ine`).set(auth('ana')).expect(403);
      await request(app).get(`/api/v1/admin/verifications/${S.arturo.perfilId}/files/ine`).set(auth('arturo')).expect(403);
    });
    test('el administrador ve la INE descifrada', async () => {
      const r = await request(app).get(`/api/v1/admin/verifications/${S.arturo.perfilId}/files/ine`).set(auth('admin'));
      expect(r.status).toBe(200);
      expect(r.headers['content-type']).toMatch(/image\/png/);
      expect(Buffer.compare(r.body, PNG)).toBe(0);
    });
    test('CA-03.3 rechazar sin motivo → 400 y sigue "pendiente"', async () => {
      const r = await request(app).patch(`/api/v1/admin/verifications/${S.arturo.perfilId}`).set(auth('admin')).send({ decision: 'rechazar' });
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBe('El motivo es obligatorio al rechazar');
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S.arturo.perfilId } });
      expect(p.estadoVerificacion).toBe('pendiente');
    });
    test('CA-03.2 rechazo con motivo: el trabajador ve el motivo y puede reenviar', async () => {
      await request(app).patch(`/api/v1/admin/verifications/${S.arturo.perfilId}`).set(auth('admin'))
        .send({ decision: 'rechazar', motivo: 'La foto de la INE es ilegible' }).expect(200);
      const p = await request(app).get('/api/v1/workers/me/profile').set(auth('arturo'));
      expect(p.body.perfil.estadoVerificacion).toBe('rechazado');
      expect(p.body.perfil.motivoRechazo).toBe('La foto de la INE es ilegible');
      await request(app).post('/api/v1/workers/me/identity').set(auth('arturo'))
        .attach('ine', PNG, 'ine.png').attach('selfie', PNG, 'selfie.png').expect(202);
    });
    test('CA-03.1 al aprobar, aparece en la búsqueda [M1→M2]', async () => {
      await request(app).patch(`/api/v1/admin/verifications/${S.arturo.perfilId}`).set(auth('admin')).send({ decision: 'aprobar' }).expect(200);
      const b = await request(app).get(`/api/v1/workers?oficioId=${cat.plomeria}&zonaId=${cat.centro}`).set(auth('ana'));
      expect(b.body.map((t) => t.id)).toContain(S.arturo.perfilId);
      expect(b.body.find((t) => t.id === S.arturo.perfilId).esNuevo).toBe(true);
    });
    test('aprobar dos veces → 409', async () => {
      await request(app).patch(`/api/v1/admin/verifications/${S.arturo.perfilId}`).set(auth('admin')).send({ decision: 'aprobar' }).expect(409);
    });
  });

  describe('RF-04 / RF-05 / RF-06 Búsqueda, solicitudes y cotizaciones', () => {
    beforeAll(async () => {
      await registrar('beatriz', 'trabajador');
      await perfilYVerificar('beatriz', cat.plomeria, cat.centro);
      await registrar('elena', 'trabajador');
      await perfilYVerificar('elena', cat.electricidad, cat.centro);
      await registrar('pedro', 'trabajador');
      await perfilYVerificar('pedro', cat.plomeria, cat.centro, false);
      await registrar('luis', 'cliente');
    });

    test('CA-04.4 buscar sin oficio → 400', async () => {
      const r = await request(app).get(`/api/v1/workers?zonaId=${cat.centro}`).set(auth('ana'));
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBe('Selecciona un oficio');
    });
    test('CA-04.2 sin resultados → 200 []', async () => {
      const r = await request(app).get(`/api/v1/workers?oficioId=${cat.electricidad}&zonaId=${cat.lapaz}`).set(auth('ana'));
      expect(r.status).toBe(200);
      expect(r.body).toEqual([]);
    });
    test('CA-05.3 seis fotos → 400 "Máximo 5 fotos"', async () => {
      let req = request(app).post('/api/v1/requests').set(auth('ana'))
        .field('oficioId', String(cat.plomeria)).field('zonaId', String(cat.centro)).field('colonia', 'El Carmen')
        .field('direccionExacta', 'Calle Secreta 99, Puebla').field('descripcion', 'Gotea la llave del fregadero de la cocina').field('fechaDeseada', hoy());
      for (let i = 0; i < 6; i++) req = req.attach('fotos', PNG, `f${i}.png`);
      const r = await req;
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBe('Máximo 5 fotos');
    });
    test('CA-05.1 la solicitud aparece en "disponibles" de trabajadores verificados, sin dirección [M2→M1, RNF-04]', async () => {
      const r = await request(app).post('/api/v1/requests').set(auth('ana'))
        .field('oficioId', String(cat.plomeria)).field('zonaId', String(cat.centro)).field('colonia', 'El Carmen')
        .field('direccionExacta', 'Calle Secreta 99, Puebla').field('descripcion', 'Gotea la llave del fregadero de la cocina')
        .field('fechaDeseada', hoy()).attach('fotos', PNG, 'a.png').attach('fotos', PNG, 'b.png');
      expect(r.status).toBe(201);
      expect(r.body.solicitud.estado).toBe('abierta');
      expect(r.body.solicitud.fotos).toHaveLength(2);
      S.sol1 = r.body.solicitud.id;
      const d = await request(app).get('/api/v1/requests/available').set(auth('arturo'));
      const vista = d.body.find((s) => s.id === S.sol1);
      expect(vista).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(vista, 'direccionExacta')).toBe(false);
      const e = await request(app).get('/api/v1/requests/available').set(auth('elena'));
      expect(e.body.find((s) => s.id === S.sol1)).toBeUndefined();
    });
    test('un trabajador sin verificar no ve solicitudes disponibles → 403', async () => {
      await request(app).get('/api/v1/requests/available').set(auth('pedro')).expect(403);
    });
    test('CA-06.2 trabajador sin verificar no cotiza → 403 [M1→M2]', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/quotes`).set(auth('pedro')).send({ monto: 500, tiempoEstimadoHoras: 2 });
      expect(r.status).toBe(403);
      expect(r.body.error.message).toBe('Tu cuenta debe estar verificada para cotizar');
    });
    test('CA-06.5 electricista no cotiza plomería → 403', async () => {
      await request(app).post(`/api/v1/requests/${S.sol1}/quotes`).set(auth('elena')).send({ monto: 500, tiempoEstimadoHoras: 2 }).expect(403);
    });
    test('CA-06.3 monto 0 → 400', async () => {
      await request(app).post(`/api/v1/requests/${S.sol1}/quotes`).set(auth('arturo')).send({ monto: 0, tiempoEstimadoHoras: 2 }).expect(400);
    });
    test('CA-06.1 primera cotización → 201 y la solicitud pasa a "cotizada"', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/quotes`).set(auth('arturo')).send({ monto: 850, tiempoEstimadoHoras: 3 });
      expect(r.status).toBe(201);
      expect(r.body.cotizacion.estado).toBe('pendiente');
      expect(r.body.cotizacion.solicitudEstado).toBe('cotizada');
      S.cotX = r.body.cotizacion.id;
      const lista = await request(app).get(`/api/v1/requests/${S.sol1}/quotes`).set(auth('ana'));
      expect(lista.body.map((c) => c.id)).toContain(S.cotX);
    });
    test('CA-06.4 segunda cotización del mismo trabajador → 409', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/quotes`).set(auth('arturo')).send({ monto: 800, tiempoEstimadoHoras: 3 });
      expect(r.status).toBe(409);
      expect(r.body.error.message).toBe('Ya enviaste una cotización para esta solicitud');
    });
    test('otro cliente no ve las cotizaciones ajenas → 403', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/quotes`).set(auth('beatriz')).send({ monto: 900, tiempoEstimadoHoras: 4 });
      S.cotY = r.body.cotizacion.id;
      await request(app).get(`/api/v1/requests/${S.sol1}/quotes`).set(auth('luis')).expect(403);
    });
  });

  describe('RF-07 Estados de la solicitud', () => {
    test('CA-07.5 dos aceptaciones simultáneas: solo una se aplica', async () => {
      const [r1, r2] = await Promise.all([
        request(app).post(`/api/v1/requests/${S.sol1}/accept`).set(auth('ana')).send({ cotizacionId: S.cotX }),
        request(app).post(`/api/v1/requests/${S.sol1}/accept`).set(auth('ana')).send({ cotizacionId: S.cotY }),
      ]);
      expect([r1.status, r2.status].sort()).toEqual([200, 409]);
      const aceptadas = await prisma.cotizacion.count({ where: { solicitudId: S.sol1, estado: 'aceptada' } });
      expect(aceptadas).toBe(1);
      const ganadora = r1.status === 200 ? 'arturo' : 'beatriz';
      const perdedora = ganadora === 'arturo' ? 'beatriz' : 'arturo';
      S.aceptado = ganadora;
      S.rechazado = perdedora;
    });
    test('CA-07.1 el aceptado ve la dirección y el rechazado no [RNF-04]', async () => {
      const a = await request(app).get(`/api/v1/requests/${S.sol1}`).set(auth(S.aceptado));
      expect(a.body.solicitud.direccionExacta).toBe('Calle Secreta 99, Puebla');
      const b = await request(app).get(`/api/v1/requests/${S.sol1}`).set(auth(S.rechazado));
      expect(b.body.solicitud.miCotizacion.estado).toBe('rechazada');
      expect(Object.prototype.hasOwnProperty.call(b.body.solicitud, 'direccionExacta')).toBe(false);
    });
    test('CA-07.3 completar sin iniciar → 409', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/complete`).set(auth('ana'));
      expect(r.status).toBe(409);
      expect(r.body.error.message).toBe('Transición no permitida: aceptada → completada');
    });
    test('CA-07.4 el trabajador rechazado no puede iniciar → 403', async () => {
      await request(app).post(`/api/v1/requests/${S.sol1}/start`).set(auth(S.rechazado)).expect(403);
    });
    test('CA-07.2 iniciar y confirmar terminado', async () => {
      const i = await request(app).post(`/api/v1/requests/${S.sol1}/start`).set(auth(S.aceptado));
      expect(i.body.solicitud.estado).toBe('en_curso');
      const c = await request(app).post(`/api/v1/requests/${S.sol1}/complete`).set(auth('ana'));
      expect(c.body.solicitud.estado).toBe('completada');
      expect(c.body.solicitud.completadaEn).toBeTruthy();
    });
  });

  describe('RF-09 / RF-10 Reseñas y ranking', () => {
    test('CA-09.3 el trabajador no puede reseñar → 403', async () => {
      await request(app).post(`/api/v1/requests/${S.sol1}/review`).set(auth(S.aceptado)).send({ estrellas: 5 }).expect(403);
    });
    test('CA-09.1 reseña de 4★ → 201 y se recalcula el ranking [M2→M3]', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/review`).set(auth('ana')).send({ estrellas: 4, comentario: 'Buen trabajo' });
      expect(r.status).toBe(201);
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S[S.aceptado].perfilId } });
      expect(p.trabajosCompletados).toBe(1);
      expect(p.rankingActualizadoEn).not.toBeNull();
      expect(p.puntuacionRanking).toBeNull(); // 1 trabajo: sigue "Nuevo"
    });
    test('CA-09.4 segunda reseña → 409', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/review`).set(auth('ana')).send({ estrellas: 5 });
      expect(r.status).toBe(409);
      expect(r.body.error.message).toBe('Esta solicitud ya tiene reseña');
    });
    test('CA-09.5 reseña fuera de plazo (31 días) → 422', async () => {
      const id = await crearSolicitud('ana');
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('arturo')).send({ monto: 300, tiempoEstimadoHoras: 1 });
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('ana')).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/start`).set(auth('arturo')).expect(200);
      await request(app).post(`/api/v1/requests/${id}/complete`).set(auth('ana')).expect(200);
      await prisma.solicitud.update({ where: { id }, data: { completadaEn: new Date(Date.now() - 31 * 86400000) } });
      const r = await request(app).post(`/api/v1/requests/${id}/review`).set(auth('ana')).send({ estrellas: 5 });
      expect(r.status).toBe(422);
      expect(r.body.error.message).toBe('El plazo para reseñar venció');
    });
  });

  describe('RF-08 Cancelaciones', () => {
    async function aceptadaCon(trabajador, cliente = 'luis') {
      const id = await crearSolicitud(cliente);
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth(trabajador)).send({ monto: 400, tiempoEstimadoHoras: 2 });
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth(cliente)).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      return id;
    }
    test('CA-08.1 el trabajador cancela: atribuible y sube su tasa [M2→M3]', async () => {
      const antes = await prisma.perfilTrabajador.findUnique({ where: { id: S.beatriz.perfilId } });
      const id = await aceptadaCon('beatriz');
      const r = await request(app).post(`/api/v1/requests/${id}/cancel`).set(auth('beatriz')).send({ motivo: 'No puedo asistir' });
      expect(r.status).toBe(200);
      const canc = await prisma.cancelacion.findUnique({ where: { solicitudId: id } });
      expect(canc.rolQueCancela).toBe('trabajador');
      expect(canc.atribuibleAlTrabajador).toBe(true);
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S.beatriz.perfilId } });
      expect(p.cancelacionesAtribuibles).toBe(antes.cancelacionesAtribuibles + 1);
      expect(Number(p.tasaCancelacion)).toBeCloseTo(p.cancelacionesAtribuibles / p.solicitudesAceptadas, 4);
    });
    test('CA-08.2 el cliente cancela: no es atribuible y la tasa del trabajador no cambia', async () => {
      await registrar('carlos', 'trabajador');
      await perfilYVerificar('carlos', cat.plomeria, cat.centro);
      const id = await aceptadaCon('carlos');
      const r = await request(app).post(`/api/v1/requests/${id}/cancel`).set(auth('luis')).send({ motivo: 'Ya no lo necesito' });
      expect(r.status).toBe(200);
      const canc = await prisma.cancelacion.findUnique({ where: { solicitudId: id } });
      expect(canc.atribuibleAlTrabajador).toBe(false);
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S.carlos.perfilId } });
      expect(Number(p.tasaCancelacion)).toBe(0);
    });
    test('CA-08.3 el cliente cancela una solicitud cotizada: las cotizaciones quedan rechazadas', async () => {
      const id = await crearSolicitud('luis');
      await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('arturo')).send({ monto: 400, tiempoEstimadoHoras: 2 }).expect(201);
      await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('carlos')).send({ monto: 450, tiempoEstimadoHoras: 2 }).expect(201);
      await request(app).post(`/api/v1/requests/${id}/cancel`).set(auth('luis')).send({ motivo: 'Encontré otra opción' }).expect(200);
      const estados = (await prisma.cotizacion.findMany({ where: { solicitudId: id } })).map((c) => c.estado);
      expect(estados).toEqual(['rechazada', 'rechazada']);
    });
    test('CA-08.4 cancelar una completada → 409', async () => {
      const r = await request(app).post(`/api/v1/requests/${S.sol1}/cancel`).set(auth('ana')).send({ motivo: 'Ya no lo necesito' });
      expect(r.status).toBe(409);
      expect(r.body.error.message).toBe('No se puede cancelar una solicitud completada');
    });
    test('CA-08.5 "Otro" sin detalle suficiente → 400', async () => {
      const id = await crearSolicitud('luis');
      const r = await request(app).post(`/api/v1/requests/${id}/cancel`).set(auth('luis')).send({ motivo: 'Otro', detalle: 'corto' });
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBe('Describe el motivo (mínimo 10 caracteres)');
    });
  });

  describe('RF-16 / RF-17 Ajuste de precio con aprobación del cliente', () => {
    let sol, ajusteId;
    async function enCurso(monto) {
      const id = await crearSolicitud('luis');
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('carlos')).send({ monto, tiempoEstimadoHoras: 2 });
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('luis')).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      return id;
    }
    test('CA-16.5 proponer con la solicitud "aceptada" → 409', async () => {
      sol = await enCurso(800);
      await request(app).post(`/api/v1/requests/${sol}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 1000, motivo: 'Material adicional para la pared' }).expect(409);
      await request(app).post(`/api/v1/requests/${sol}/start`).set(auth('carlos')).expect(200);
    });
    test('CA-16.3 propuesta de $1,300 (más del 50 %) → 422', async () => {
      const r = await request(app).post(`/api/v1/requests/${sol}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 1300, motivo: 'Material adicional para la pared' });
      expect(r.status).toBe(422);
    });
    test('CA-16.7 un trabajador que no es el aceptado → 403', async () => {
      await request(app).post(`/api/v1/requests/${sol}/adjustments`).set(auth('arturo')).send({ montoPropuesto: 1000, motivo: 'Material adicional para la pared' }).expect(403);
    });
    test('el trabajador propone $1,000 → 201 con ajuste pendiente; la solicitud sigue "en_curso"', async () => {
      const r = await request(app).post(`/api/v1/requests/${sol}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 1000, motivo: 'Material adicional para la pared' });
      expect(r.status).toBe(201);
      expect(r.body.solicitud.estado).toBe('en_curso');
      expect(r.body.solicitud.montoFinal).toBe(800);
      ajusteId = r.body.solicitud.ajustes[0].id;
    });
    test('CA-16.6 segunda propuesta con una pendiente → 409', async () => {
      await request(app).post(`/api/v1/requests/${sol}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 1100, motivo: 'Otro material extra necesario' }).expect(409);
    });
    test('CA-16.8 confirmar "terminado" con el ajuste pendiente → 409', async () => {
      const r = await request(app).post(`/api/v1/requests/${sol}/complete`).set(auth('luis'));
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('AJUSTE_PENDIENTE');
    });
    test('CA-16.7 un cliente ajeno responde el ajuste → 403', async () => {
      await request(app).patch(`/api/v1/requests/${sol}/adjustments/${ajusteId}`).set(auth('ana')).send({ decision: 'aceptar' }).expect(403);
    });
    test('CA-16.1 el cliente acepta: monto final $1,000 e historial $800 → $1,000', async () => {
      const r = await request(app).patch(`/api/v1/requests/${sol}/adjustments/${ajusteId}`).set(auth('luis')).send({ decision: 'aceptar' });
      expect(r.status).toBe(200);
      expect(r.body.solicitud.montoFinal).toBe(1000);
      expect(r.body.solicitud.ajustes[0]).toMatchObject({ montoAnterior: 800, montoPropuesto: 1000, estado: 'aceptado' });
    });
    test('responder dos veces el mismo ajuste → 409', async () => {
      await request(app).patch(`/api/v1/requests/${sol}/adjustments/${ajusteId}`).set(auth('luis')).send({ decision: 'rechazar' }).expect(409);
    });
    test('CA-17.1 al completar, el perfil cuenta el trabajo con ajuste y el ranking no cambia de fórmula', async () => {
      const antes = await prisma.perfilTrabajador.findUnique({ where: { id: S.carlos.perfilId } });
      await request(app).post(`/api/v1/requests/${sol}/complete`).set(auth('luis')).expect(200);
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S.carlos.perfilId } });
      expect(p.trabajosConAjuste).toBe(antes.trabajosConAjuste + 1);
      expect(p.cancelacionesAtribuibles).toBe(antes.cancelacionesAtribuibles);
      const perfil = await request(app).get('/api/v1/workers/me/profile').set(auth('carlos'));
      expect(perfil.body.perfil.porcentajeConAjuste).toBe(Math.round((p.trabajosConAjuste / p.trabajosCompletados) * 100));
    });
    test('CA-16.2 si el cliente rechaza, el trabajo sigue al precio original sin penalizar', async () => {
      const id = await enCurso(500);
      await request(app).post(`/api/v1/requests/${id}/start`).set(auth('carlos')).expect(200);
      const prop = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 600, motivo: 'Se necesita una pieza extra' });
      const antes = await prisma.perfilTrabajador.findUnique({ where: { id: S.carlos.perfilId } });
      const r = await request(app).patch(`/api/v1/requests/${id}/adjustments/${prop.body.solicitud.ajustes[0].id}`).set(auth('luis')).send({ decision: 'rechazar' });
      expect(r.body.solicitud.estado).toBe('en_curso');
      expect(r.body.solicitud.montoFinal).toBe(500);
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S.carlos.perfilId } });
      expect(p.cancelacionesAtribuibles).toBe(antes.cancelacionesAtribuibles);
      expect(Number(p.tasaCancelacion)).toBe(Number(antes.tasaCancelacion));
    });
    test('CA-16.9 cancelar con un ajuste pendiente lo deja rechazado', async () => {
      const id = await enCurso(500);
      await request(app).post(`/api/v1/requests/${id}/start`).set(auth('carlos')).expect(200);
      await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 600, motivo: 'Se necesita una pieza extra' }).expect(201);
      await request(app).post(`/api/v1/requests/${id}/cancel`).set(auth('luis')).send({ motivo: 'Ya no lo necesito' }).expect(200);
      const a = await prisma.ajustePrecio.findFirst({ where: { solicitudId: id } });
      expect(a.estado).toBe('rechazado');
    });
  });

  describe('RNF-02 Sesiones (ADR-04)', () => {
    test('el refresh token rota: el usado ya no sirve', async () => {
      const r = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: S.ana.refresh });
      expect(r.status).toBe(200);
      await request(app).post('/api/v1/auth/refresh').send({ refreshToken: S.ana.refresh }).expect(401);
      S.ana.refresh = r.body.refreshToken;
    });
    test('(c) un refresh token sin usar durante 24 h → 401', async () => {
      await prisma.refreshToken.updateMany({ where: { usuarioId: S.ana.id }, data: { expiraEn: new Date(Date.now() - 1000) } });
      await request(app).post('/api/v1/auth/refresh').send({ refreshToken: S.ana.refresh }).expect(401);
    });
  });
});
