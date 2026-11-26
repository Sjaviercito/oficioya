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
    const r = await request(app).post('/api/v1/auth/register').send({ nombre, email: `${nombre}@prueba.test`, password: 'Prueba1234', rol, telefono: '2221234567', aceptaPrivacidad: true });
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
      const r = await request(app).post('/api/v1/auth/register').send({ nombre: 'Ana 2', email: 'ana@prueba.test', password: 'Prueba1234', rol: 'cliente', telefono: '2221234567', aceptaPrivacidad: true });
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
      const guardado = await prisma.archivo.findUnique({ where: { clave: ident.rutaIneCifrada } });
      expect(guardado.publico).toBe(false);
      const bytes = Buffer.from(guardado.contenido);
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
    test('CA-17.1 al completar, el perfil cuenta el trabajo con ajuste y no cambia la tasa de cancelación', async () => {
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

  describe('RF-11 / RF-12 / RF-13 Avisos, respuesta a reseñas y reportes', () => {
    test('CA-11.1 el cliente recibe un aviso cuando le llega una cotización', async () => {
      const r = await request(app).get('/api/v1/notifications').set(auth('luis'));
      expect(r.status).toBe(200);
      expect(r.body.some((n) => n.texto.includes('cotización'))).toBe(true);
      await request(app).post('/api/v1/notifications/read').set(auth('luis')).expect(204);
    });
    test('CA-12.1 el trabajador calificado responde una vez; la segunda → 409; otro → 403', async () => {
      const ok = await request(app).post(`/api/v1/requests/${S.sol1}/review/response`).set(auth(S.aceptado)).send({ respuesta: 'Gracias por la confianza' });
      expect(ok.status).toBe(201);
      expect(ok.body.solicitud.resena.respuesta).toBe('Gracias por la confianza');
      await request(app).post(`/api/v1/requests/${S.sol1}/review/response`).set(auth(S.aceptado)).send({ respuesta: 'Otra respuesta' }).expect(409);
      await request(app).post(`/api/v1/requests/${S.sol1}/review/response`).set(auth(S.rechazado)).send({ respuesta: 'No me toca responder' }).expect(403);
    });
    test('CA-13.1 reporte del cliente → el admin suspende → el trabajador sale de la búsqueda y no cotiza', async () => {
      await request(app).post(`/api/v1/requests/${S.sol1}/report`).set(auth('ana')).send({ motivo: 'Cobró de más fuera de la plataforma' }).expect(201);
      await request(app).post(`/api/v1/requests/${S.sol1}/report`).set(auth('ana')).send({ motivo: 'Cobró de más fuera de la plataforma' }).expect(409);
      await request(app).post(`/api/v1/requests/${S.sol1}/report`).set(auth('luis')).send({ motivo: 'Reporte de alguien ajeno' }).expect(403);
      const lista = await request(app).get('/api/v1/admin/reports').set(auth('admin'));
      const rep = lista.body.find((x) => x.solicitudId === S.sol1);
      await request(app).patch(`/api/v1/admin/reports/${rep.id}`).set(auth('admin')).send({ accion: 'suspender' }).expect(200);
      const b = await request(app).get(`/api/v1/workers?oficioId=${cat.plomeria}&zonaId=${cat.centro}`).set(auth('ana'));
      expect(b.body.map((t) => t.id)).not.toContain(S[S.aceptado].perfilId);
      const id = await crearSolicitud('ana');
      await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth(S.aceptado)).send({ monto: 500, tiempoEstimadoHoras: 2 }).expect(403);
    });
  });

  describe('Mejoras v1.1 implementadas', () => {
    test('v1.1-2 al publicar una solicitud, el trabajador del oficio y zona recibe aviso; el electricista no', async () => {
      await crearSolicitud('ana');
      const ok = await request(app).get('/api/v1/notifications').set(auth('carlos'));
      expect(ok.body.some((n) => n.texto.startsWith('Nueva solicitud de Plomería'))).toBe(true);
      const no = await request(app).get('/api/v1/notifications').set(auth('elena'));
      expect(no.body.some((n) => n.texto.startsWith('Nueva solicitud de Plomería'))).toBe(false);
    });
    test('v1.1-7 el admin levanta la suspensión y el trabajador vuelve a aparecer; repetir → 409', async () => {
      const id = S[S.aceptado].perfilId;
      await request(app).patch(`/api/v1/admin/workers/${id}/reinstate`).set(auth('admin')).send({ motivo: 'Reporte revisado sin fundamento' }).expect(200);
      const b = await request(app).get(`/api/v1/workers?oficioId=${cat.plomeria}&zonaId=${cat.centro}`).set(auth('ana'));
      expect(b.body.map((t) => t.id)).toContain(id);
      await request(app).patch(`/api/v1/admin/workers/${id}/reinstate`).set(auth('admin')).send({ motivo: 'Reporte revisado sin fundamento' }).expect(409);
    });
    test('v1.1-4 el sexto intento fallido en un minuto → 429', async () => {
      for (let i = 0; i < 5; i++) await request(app).post('/api/v1/auth/login').send({ email: 'luis@prueba.test', password: 'mala' }).expect(401);
      await request(app).post('/api/v1/auth/login').send({ email: 'luis@prueba.test', password: 'mala' }).expect(429);
    });
  });

  describe('Mejoras v1.1 (segunda parte)', () => {
    test('v1.1-1 la foto de perfil se guarda en la base y se sirve por /uploads; la INE nunca', async () => {
      const p = await request(app).get('/api/v1/workers/me/profile').set(auth('arturo'));
      const foto = await request(app).get(p.body.perfil.fotoUrl);
      expect(foto.status).toBe(200);
      expect(foto.headers['content-type']).toMatch(/image\/png/);
      const ident = await prisma.identificacion.findUnique({ where: { trabajadorId: S.arturo.perfilId } });
      await request(app).get(`/uploads/${ident.rutaIneCifrada}`).expect(404);
    });
    test('v1.1-3 perfil público con reseñas y respuestas, sin correo; suspendido o inexistente → 404', async () => {
      const r = await request(app).get(`/api/v1/workers/${S[S.aceptado].perfilId}/public`).set(auth('luis'));
      expect(r.status).toBe(200);
      expect(r.body.resenas[0]).toMatchObject({ estrellas: 4, respuesta: 'Gracias por la confianza' });
      expect(JSON.stringify(r.body)).not.toMatch(/@prueba\.test/);
      await request(app).get('/api/v1/workers/00000000-0000-4000-8000-000000000000/public').set(auth('luis')).expect(404);
    });
    test('v1.1-5 el admin configura el tope por oficio; fuera de rango → 400; no admin → 403', async () => {
      await request(app).patch(`/api/v1/admin/oficios/${cat.plomeria}`).set(auth('admin')).send({ topeAjuste: 1.5 }).expect(400);
      await request(app).patch(`/api/v1/admin/oficios/${cat.plomeria}`).set(auth('ana')).send({ topeAjuste: 0.3 }).expect(403);
      const ok = await request(app).patch(`/api/v1/admin/oficios/${cat.plomeria}`).set(auth('admin')).send({ topeAjuste: 0.3 });
      expect(ok.body.topeAjuste).toBe(0.3);
      const id = await crearSolicitud('luis');
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('carlos')).send({ monto: 1000, tiempoEstimadoHoras: 2 });
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('luis')).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/start`).set(auth('carlos')).expect(200);
      const mal = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 1400, motivo: 'Material adicional para la pared' });
      expect(mal.status).toBe(422);
      expect(mal.body.error.message).toMatch(/30 %/);
      await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('carlos')).send({ montoPropuesto: 1300, motivo: 'Material adicional para la pared' }).expect(201);
      await request(app).patch(`/api/v1/admin/oficios/${cat.plomeria}`).set(auth('admin')).send({ topeAjuste: 0.5 }).expect(200);
    });
    test('v1.1-7 lista de suspendidos para el admin', async () => {
      const r = await request(app).get('/api/v1/admin/workers/suspended').set(auth('admin'));
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body)).toBe(true);
    });
  });

  describe('Contrato v1.2: privacidad, contacto, coordinación, reportes y baja de cuenta', () => {
    let sol;
    beforeAll(async () => {
      await registrar('cli12', 'cliente');
      await registrar('tra12', 'trabajador');
      await perfilYVerificar('tra12', cat.plomeria, cat.lapaz);
    });
    async function aceptadaEnLaPaz(cliente = 'cli12') {
      const r = await request(app).post('/api/v1/requests').set(auth(cliente))
        .field('oficioId', String(cat.plomeria)).field('zonaId', String(cat.lapaz)).field('colonia', 'La Paz')
        .field('direccionExacta', 'Calle Privada 7, Puebla').field('descripcion', 'Fuga en el calentador de agua del patio').field('fechaDeseada', hoy());
      const c = await request(app).post(`/api/v1/requests/${r.body.solicitud.id}/quotes`).set(auth('tra12')).send({ monto: 600, tiempoEstimadoHoras: 2 });
      await request(app).post(`/api/v1/requests/${r.body.solicitud.id}/accept`).set(auth(cliente)).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      return r.body.solicitud.id;
    }

    test('CA-01.6 registro sin aceptar el aviso de privacidad → 400; teléfono inválido → 400', async () => {
      const base = { nombre: 'Sin Aviso', email: 'sinaviso@prueba.test', password: 'Prueba1234', rol: 'cliente', telefono: '2221234567' };
      const r1 = await request(app).post('/api/v1/auth/register').send(base);
      expect(r1.status).toBe(400);
      expect(r1.body.error.message).toMatch(/aviso de privacidad/);
      await request(app).post('/api/v1/auth/register').send({ ...base, aceptaPrivacidad: true, telefono: '12345' }).expect(400);
      const ok = await request(app).post('/api/v1/auth/register').send({ ...base, aceptaPrivacidad: true, telefono: '+52 (222) 123-4567' });
      expect(ok.status).toBe(201);
      expect(ok.body.usuario).toMatchObject({ telefono: '2221234567', privacidadAceptada: true });
    });

    test('CA-23.1 el contacto solo lo ven cliente y trabajador aceptado mientras el trabajo está activo', async () => {
      sol = await aceptadaEnLaPaz();
      const c = await request(app).get(`/api/v1/requests/${sol}`).set(auth('cli12'));
      expect(c.body.solicitud.contacto).toEqual({ nombre: 'tra12', telefono: '2221234567' });
      const t = await request(app).get(`/api/v1/requests/${sol}`).set(auth('tra12'));
      expect(t.body.solicitud.contacto.nombre).toBe('cli12');
      const busqueda = await request(app).get(`/api/v1/workers?oficioId=${cat.plomeria}&zonaId=${cat.lapaz}`).set(auth('ana'));
      expect(JSON.stringify(busqueda.body)).not.toMatch(/2221234567/);
      const publico = await request(app).get(`/api/v1/workers/${S.tra12.perfilId}/public`).set(auth('ana'));
      expect(JSON.stringify(publico.body)).not.toMatch(/2221234567/);
    });

    test('CA-22.1 horario de visita: pasada → 400; el cliente la confirma', async () => {
      await request(app).post(`/api/v1/requests/${sol}/visit`).set(auth('tra12')).send({ fechaHora: '2020-01-01T10:00:00Z' }).expect(400);
      const manana = new Date(Date.now() + 86400000).toISOString();
      const p = await request(app).post(`/api/v1/requests/${sol}/visit`).set(auth('tra12')).send({ fechaHora: manana });
      expect(p.status).toBe(201);
      expect(p.body.solicitud.visita.confirmada).toBe(false);
      await request(app).patch(`/api/v1/requests/${sol}/visit`).set(auth('ana')).send({ decision: 'aceptar' }).expect(403);
      const a = await request(app).patch(`/api/v1/requests/${sol}/visit`).set(auth('cli12')).send({ decision: 'aceptar' });
      expect(a.body.solicitud.visita.confirmada).toBe(true);
    });

    test('CA-26.1 terminado por el trabajador, disputa del cliente y cierre automático a las 72 h', async () => {
      await request(app).post(`/api/v1/requests/${sol}/finish`).set(auth('tra12')).expect(409); // aún "aceptada"
      await request(app).post(`/api/v1/requests/${sol}/start`).set(auth('tra12')).expect(200);
      const f = await request(app).post(`/api/v1/requests/${sol}/finish`).set(auth('tra12'));
      expect(f.status).toBe(200);
      expect(f.body.solicitud.horasParaDisputar).toBe(72);
      await request(app).post(`/api/v1/requests/${sol}/finish`).set(auth('tra12')).expect(409);
      const d = await request(app).post(`/api/v1/requests/${sol}/dispute`).set(auth('cli12')).send({ motivo: 'Todavía gotea la conexión' });
      expect(d.body.solicitud.terminadaPorTrabajadorEn).toBeNull();
      expect(d.body.solicitud.disputaMotivo).toBe('Todavía gotea la conexión');
      await request(app).post(`/api/v1/requests/${sol}/finish`).set(auth('tra12')).expect(200);
      await prisma.solicitud.update({ where: { id: sol }, data: { terminadaPorTrabajadorEn: new Date(Date.now() - 73 * 3600000) } });
      const r = await request(app).get(`/api/v1/requests/${sol}`).set(auth('cli12'));
      expect(r.body.solicitud.estado).toBe('completada');
      expect(r.body.solicitud.contacto).toBeUndefined();
    });

    test('CA-10.9 un ajuste rechazado cuenta para el ranking; uno aceptado no', async () => {
      const id = await aceptadaEnLaPaz();
      await request(app).post(`/api/v1/requests/${id}/start`).set(auth('tra12')).expect(200);
      const a = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('tra12')).send({ montoPropuesto: 700, motivo: 'Material adicional necesario' });
      await request(app).patch(`/api/v1/requests/${id}/adjustments/${a.body.solicitud.ajustes[0].id}`).set(auth('cli12')).send({ decision: 'rechazar' }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/complete`).set(auth('cli12')).expect(200);
      const p = await prisma.perfilTrabajador.findUnique({ where: { id: S.tra12.perfilId } });
      expect(p.trabajosConAjusteRechazado).toBe(1);
      expect(p.trabajosConAjuste).toBe(0);
    });

    test('CA-13.3 el trabajador reporta al cliente; el admin lo suspende y ya no puede publicar; se reactiva', async () => {
      await request(app).post(`/api/v1/requests/${sol}/report`).set(auth('tra12')).send({ motivo: 'El cliente fue agresivo en la visita' }).expect(201);
      await request(app).post(`/api/v1/requests/${sol}/report`).set(auth('tra12')).send({ motivo: 'El cliente fue agresivo en la visita' }).expect(409);
      const lista = await request(app).get('/api/v1/admin/reports').set(auth('admin'));
      const rep = lista.body.find((x) => x.solicitudId === sol && x.rolReportado === 'cliente');
      expect(rep.reportado).toMatchObject({ rol: 'cliente', nombre: 'cli12' });
      await request(app).patch(`/api/v1/admin/reports/${rep.id}`).set(auth('admin')).send({ accion: 'suspender' }).expect(200);
      const bloqueado = await request(app).post('/api/v1/requests').set(auth('cli12'))
        .field('oficioId', String(cat.plomeria)).field('zonaId', String(cat.lapaz)).field('colonia', 'La Paz')
        .field('direccionExacta', 'Calle Privada 7, Puebla').field('descripcion', 'Otra fuga en el calentador de agua').field('fechaDeseada', hoy());
      expect(bloqueado.status).toBe(403);
      const susp = await request(app).get('/api/v1/admin/users/suspended').set(auth('admin'));
      expect(susp.body.map((u) => u.usuarioId)).toContain(S.cli12.id);
      await request(app).patch(`/api/v1/admin/users/${S.cli12.id}/reinstate`).set(auth('admin')).send({ motivo: 'Se revisó y fue un malentendido' }).expect(200);
    });

    test('CA-27.1 cambiar contraseña: la actual incorrecta → 401; la nueva funciona', async () => {
      await request(app).put('/api/v1/auth/me/password').set(auth('cli12')).send({ actual: 'mala', nueva: 'NuevaClave2026' }).expect(401);
      const r = await request(app).put('/api/v1/auth/me/password').set(auth('cli12')).send({ actual: 'Prueba1234', nueva: 'NuevaClave2026' });
      expect(r.status).toBe(200);
      S.cli12.token = r.body.accessToken;
      await request(app).post('/api/v1/auth/login').send({ email: 'cli12@prueba.test', password: 'NuevaClave2026' }).expect(200);
    });

    test('CA-28.1 eliminar cuenta: con trabajo activo → 409; contraseña mal → 401; luego no puede entrar y sus datos se borran', async () => {
      const activa = await aceptadaEnLaPaz();
      await request(app).delete('/api/v1/auth/me').set(auth('cli12')).send({ password: 'NuevaClave2026' }).expect(409);
      await request(app).post(`/api/v1/requests/${activa}/cancel`).set(auth('cli12')).send({ motivo: 'Ya no lo necesito' }).expect(200);
      await request(app).delete('/api/v1/auth/me').set(auth('cli12')).send({ password: 'mala' }).expect(401);
      await request(app).delete('/api/v1/auth/me').set(auth('cli12')).send({ password: 'NuevaClave2026' }).expect(204);
      await request(app).post('/api/v1/auth/login').send({ email: 'cli12@prueba.test', password: 'NuevaClave2026' }).expect(401);
      const u = await prisma.usuario.findUnique({ where: { id: S.cli12.id } });
      expect(u).toMatchObject({ nombre: 'Usuario eliminado', telefono: null });
      const s = await prisma.solicitud.findUnique({ where: { id: activa } });
      expect(s.direccionExacta).toBe('Dirección eliminada');
      const resenas = await prisma.resena.count({ where: { trabajadorId: S.tra12.perfilId } });
      expect(resenas).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Contrato v1.3: cotización desglosada, diagnóstico, cambios de precio, ticket, insignias y preguntas', () => {
    beforeAll(async () => {
      await registrar('cli13', 'cliente');
      await registrar('tra13', 'trabajador');
      await perfilYVerificar('tra13', cat.electricidad, cat.lapaz);
    });
    async function solicitudLaPaz() {
      const r = await request(app).post('/api/v1/requests').set(auth('cli13'))
        .field('oficioId', String(cat.electricidad)).field('zonaId', String(cat.lapaz)).field('colonia', 'La Paz')
        .field('direccionExacta', 'Calle Luz 3, Puebla').field('descripcion', 'Se bota la pastilla al prender el horno').field('fechaDeseada', hoy());
      return r.body.solicitud.id;
    }
    async function enCurso(cuerpo) {
      const id = await solicitudLaPaz();
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('tra13')).send(cuerpo);
      expect(c.status).toBe(201);
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('cli13')).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/start`).set(auth('tra13')).expect(200);
      return id;
    }

    test('CA-06.6 precio cerrado desglosado: el total es mano de obra + material y tiene vigencia', async () => {
      const id = await solicitudLaPaz();
      const r = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('tra13')).send({ tipo: 'cerrado', manoObra: 500, material: 300, tiempoEstimadoHoras: 2, vigenciaDias: 3 });
      expect(r.body.cotizacion).toMatchObject({ tipo: 'cerrado', monto: 800, manoObra: 500, material: 300, vigenciaDias: 3, vencida: false });
    });

    test('CA-06.7 cotización vencida → 409 al aceptar', async () => {
      const id = await solicitudLaPaz();
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('tra13')).send({ tipo: 'cerrado', manoObra: 500, material: 0, tiempoEstimadoHoras: 2, vigenciaDias: 1 });
      await prisma.cotizacion.update({ where: { id: c.body.cotizacion.id }, data: { creadaEn: new Date(Date.now() - 2 * 86400000) } });
      const r = await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('cli13')).send({ cotizacionId: c.body.cotizacion.id });
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('COTIZACION_VENCIDA');
    });

    test('CA-30.6 diagnóstico de $200 abonable → presupuesto $600 aceptado → total $600 → al completar la base es $600', async () => {
      const id = await enCurso({ tipo: 'diagnostico', costoVisita: 200, visitaAbonable: true });
      const p = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('tra13'))
        .field('tipo', 'presupuesto').field('deltaManoObra', '450').field('deltaMaterial', '150');
      expect(p.status).toBe(201);
      const aj = p.body.solicitud.ajustes[0];
      expect(aj).toMatchObject({ tipo: 'presupuesto', montoPropuesto: 600, estado: 'pendiente' });
      const a = await request(app).patch(`/api/v1/requests/${id}/adjustments/${aj.id}`).set(auth('cli13')).send({ decision: 'aceptar' });
      expect(a.body.solicitud.montoFinal).toBe(600);
      await request(app).post(`/api/v1/requests/${id}/complete`).set(auth('cli13')).expect(200);
      const s = await prisma.solicitud.findUnique({ where: { id } });
      expect(Number(s.montoBase)).toBe(600);
      expect(Number(s.sobreCotizadoPct)).toBe(0);
    });

    test('CA-30.7 presupuesto rechazado: se cierra solo con la visita y el rechazo no pesa en el ranking', async () => {
      const id = await enCurso({ tipo: 'diagnostico', costoVisita: 200 });
      const p = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('tra13')).send({ tipo: 'presupuesto', deltaManoObra: 900 });
      await request(app).patch(`/api/v1/requests/${id}/adjustments/${p.body.solicitud.ajustes[0].id}`).set(auth('cli13')).send({ decision: 'rechazar' }).expect(200);
      const antes = await prisma.perfilTrabajador.findUnique({ where: { id: S.tra13.perfilId } });
      await request(app).post(`/api/v1/requests/${id}/complete`).set(auth('cli13')).expect(200);
      const s = await request(app).get(`/api/v1/requests/${id}`).set(auth('cli13'));
      expect(s.body.solicitud.montoFinal).toBe(200);
      const despues = await prisma.perfilTrabajador.findUnique({ where: { id: S.tra13.perfilId } });
      expect(despues.trabajosConAjusteRechazado).toBe(antes.trabajosConAjusteRechazado);
    });

    test('CA-16.14 pieza extra con foto → el cliente ve la foto; ticket más barato baja el total', async () => {
      const id = await enCurso({ tipo: 'cerrado', manoObra: 500, material: 300, tiempoEstimadoHoras: 2 });
      const p = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('tra13'))
        .field('tipo', 'pieza_extra').field('deltaMaterial', '250').field('detalle', 'El contacto está quemado').attach('foto', PNG, 'f.png');
      const aj = p.body.solicitud.ajustes[0];
      expect(aj).toMatchObject({ tipo: 'pieza_extra', deltaMaterial: 250, tieneFoto: true, montoPropuesto: 1050 });
      const foto = await request(app).get(`/api/v1/requests/${id}/adjustments/${aj.id}/files/foto`).set(auth('cli13'));
      expect(foto.status).toBe(200);
      await request(app).get(`/api/v1/requests/${id}/adjustments/${aj.id}/files/foto`).set(auth('ana')).expect(403);
      await request(app).patch(`/api/v1/requests/${id}/adjustments/${aj.id}`).set(auth('cli13')).send({ decision: 'aceptar' }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/adjustments/${aj.id}/ticket`).set(auth('cli13')).field('ticketMonto', '200').attach('ticket', PNG, 't.png').expect(403);
      const t = await request(app).post(`/api/v1/requests/${id}/adjustments/${aj.id}/ticket`).set(auth('tra13')).field('ticketMonto', '200').attach('ticket', PNG, 't.png');
      expect(t.status).toBe(200);
      expect(t.body.solicitud.montoFinal).toBe(1000);
      await request(app).post(`/api/v1/requests/${id}/adjustments/${aj.id}/ticket`).set(auth('tra13')).field('ticketMonto', '150').attach('ticket', PNG, 't.png').expect(409);
    });

    test('CA-16.12 "resultó más fácil" se aplica sola y avisa al cliente', async () => {
      const id = await enCurso({ tipo: 'cerrado', manoObra: 500, material: 0, tiempoEstimadoHoras: 2 });
      const r = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('tra13')).send({ tipo: 'mas_facil', deltaManoObra: -100 });
      expect(r.body.solicitud.ajustes[0].estado).toBe('aceptado');
      expect(r.body.solicitud.montoFinal).toBe(400);
    });

    test('CA-08.6 "No puedo continuar": sin foto → 409; con un aumento con foto rechazado → no se atribuye', async () => {
      const sinFoto = await enCurso({ tipo: 'cerrado', manoObra: 500, material: 0, tiempoEstimadoHoras: 2 });
      const a1 = await request(app).post(`/api/v1/requests/${sinFoto}/adjustments`).set(auth('tra13')).send({ tipo: 'dano_oculto', deltaManoObra: 200 });
      await request(app).patch(`/api/v1/requests/${sinFoto}/adjustments/${a1.body.solicitud.ajustes[0].id}`).set(auth('cli13')).send({ decision: 'rechazar' });
      const r1 = await request(app).post(`/api/v1/requests/${sinFoto}/cancel`).set(auth('tra13')).send({ motivo: 'No puedo continuar con el precio original' });
      expect(r1.status).toBe(409);
      expect(r1.body.error.code).toBe('SIN_EVIDENCIA');

      const conFoto = await enCurso({ tipo: 'cerrado', manoObra: 500, material: 0, tiempoEstimadoHoras: 2 });
      const a2 = await request(app).post(`/api/v1/requests/${conFoto}/adjustments`).set(auth('tra13'))
        .field('tipo', 'dano_oculto').field('deltaManoObra', '200').attach('foto', PNG, 'f.png');
      await request(app).patch(`/api/v1/requests/${conFoto}/adjustments/${a2.body.solicitud.ajustes[0].id}`).set(auth('cli13')).send({ decision: 'rechazar' });
      const antes = await prisma.perfilTrabajador.findUnique({ where: { id: S.tra13.perfilId } });
      await request(app).post(`/api/v1/requests/${conFoto}/cancel`).set(auth('tra13')).send({ motivo: 'No puedo continuar con el precio original' }).expect(200);
      const canc = await prisma.cancelacion.findUnique({ where: { solicitudId: conFoto } });
      expect(canc.atribuibleAlTrabajador).toBe(false);
      const despues = await prisma.perfilTrabajador.findUnique({ where: { id: S.tra13.perfilId } });
      expect(despues.cancelacionesAtribuibles).toBe(antes.cancelacionesAtribuibles);
      await request(app).post(`/api/v1/requests/${sinFoto}/cancel`).set(auth('cli13')).send({ motivo: 'No puedo continuar con el precio original' }).expect(400);
    });

    test('CA-21.1 preguntas: el trabajador elegible pregunta, sin teléfonos; máximo 3; el cliente responde una vez', async () => {
      const id = await solicitudLaPaz();
      await request(app).post(`/api/v1/requests/${id}/questions`).set(auth('arturo')).send({ texto: '¿Es monofásico o bifásico?' }).expect(403);
      await request(app).post(`/api/v1/requests/${id}/questions`).set(auth('tra13')).send({ texto: 'Llámame al 222 123 4567' }).expect(400);
      const q = await request(app).post(`/api/v1/requests/${id}/questions`).set(auth('tra13')).send({ texto: '¿El horno es eléctrico o de gas?' });
      expect(q.status).toBe(201);
      const pid = q.body.solicitud.preguntas[0].id;
      await request(app).post(`/api/v1/requests/${id}/questions`).set(auth('tra13')).send({ texto: '¿De qué año es la instalación?' }).expect(201);
      await request(app).post(`/api/v1/requests/${id}/questions`).set(auth('tra13')).send({ texto: '¿Hay centro de carga con pastillas?' }).expect(201);
      await request(app).post(`/api/v1/requests/${id}/questions`).set(auth('tra13')).send({ texto: '¿Una más por favor?' }).expect(409);
      const r = await request(app).patch(`/api/v1/requests/${id}/questions/${pid}`).set(auth('cli13')).send({ respuesta: 'Eléctrico, de 2018' });
      expect(r.body.solicitud.preguntas[0].respuesta).toBe('Eléctrico, de 2018');
      await request(app).patch(`/api/v1/requests/${id}/questions/${pid}`).set(auth('cli13')).send({ respuesta: 'Otra' }).expect(409);
    });

    test('CA-06.8 el trabajador actualiza su cotización vencida y la vigencia vuelve a contar', async () => {
      const id = await solicitudLaPaz();
      await request(app).put(`/api/v1/requests/${id}/quotes/mine`).set(auth('tra13')).send({ tipo: 'cerrado', manoObra: 500, material: 0, tiempoEstimadoHoras: 2 }).expect(404);
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('tra13')).send({ tipo: 'cerrado', manoObra: 500, material: 0, tiempoEstimadoHoras: 2, vigenciaDias: 1 });
      await prisma.cotizacion.update({ where: { id: c.body.cotizacion.id }, data: { creadaEn: new Date(Date.now() - 2 * 86400000) } });
      const u = await request(app).put(`/api/v1/requests/${id}/quotes/mine`).set(auth('tra13')).send({ tipo: 'diagnostico', costoVisita: 250, vigenciaDias: 3 });
      expect(u.status).toBe(200);
      expect(u.body.cotizacion).toMatchObject({ id: c.body.cotizacion.id, tipo: 'diagnostico', monto: 250, vencida: false });
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('cli13')).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      await request(app).put(`/api/v1/requests/${id}/quotes/mine`).set(auth('tra13')).send({ tipo: 'diagnostico', costoVisita: 300 }).expect(409);
    });

    test('CA-30.8 presupuesto rechazado → el trabajador cierra solo con la visita → el cliente confirma', async () => {
      const id = await solicitudLaPaz();
      const c = await request(app).post(`/api/v1/requests/${id}/quotes`).set(auth('tra13')).send({ tipo: 'diagnostico', costoVisita: 200 });
      await request(app).post(`/api/v1/requests/${id}/accept`).set(auth('cli13')).send({ cotizacionId: c.body.cotizacion.id }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/close-visit`).set(auth('tra13')).expect(409);
      const p = await request(app).post(`/api/v1/requests/${id}/adjustments`).set(auth('tra13')).send({ tipo: 'presupuesto', deltaManoObra: 900 });
      await request(app).patch(`/api/v1/requests/${id}/adjustments/${p.body.solicitud.ajustes[0].id}`).set(auth('cli13')).send({ decision: 'rechazar' }).expect(200);
      await request(app).post(`/api/v1/requests/${id}/close-visit`).set(auth('cli13')).expect(403);
      const r = await request(app).post(`/api/v1/requests/${id}/close-visit`).set(auth('tra13'));
      expect(r.status).toBe(200);
      expect(r.body.solicitud).toMatchObject({ estado: 'en_curso', montoFinal: 200 });
      expect(r.body.solicitud.terminadaPorTrabajadorEn).toBeTruthy();
      await request(app).post(`/api/v1/requests/${id}/close-visit`).set(auth('tra13')).expect(409);
      await request(app).post(`/api/v1/requests/${id}/complete`).set(auth('cli13')).expect(200);
    });

    test('CA-32.2 las cancelaciones por desacuerdo de precio se cuentan en el perfil', async () => {
      const p = await request(app).get('/api/v1/workers/me/profile').set(auth('tra13'));
      expect(p.body.perfil.cancelacionesPorDesacuerdo).toBe(1);
      const pub = await request(app).get(`/api/v1/workers/${S.tra13.perfilId}/public`).set(auth('cli13'));
      expect(pub.body.cancelacionesPorDesacuerdo).toBe(1);
    });

    test('CA-11.3 contador de avisos sin leer para el menú; CA-UX.1 el error de validación dice qué campo falló', async () => {
      const c = await request(app).get('/api/v1/notifications/unread-count').set(auth('cli13'));
      expect(c.status).toBe(200);
      expect(c.body.noLeidos).toBeGreaterThan(0);
      await request(app).post('/api/v1/notifications/read').set(auth('cli13')).expect(204);
      expect((await request(app).get('/api/v1/notifications/unread-count').set(auth('cli13'))).body.noLeidos).toBe(0);
      const r = await request(app).post('/api/v1/auth/register').send({ nombre: 'Campo', email: 'campo@prueba.test', telefono: '123', password: 'Prueba1234', rol: 'cliente', aceptaPrivacidad: true });
      expect(r.status).toBe(400);
      expect(r.body.error.campo).toBe('telefono');
    });

    test('CA-17.4 la búsqueda y el perfil incluyen insignias y progreso', async () => {
      const b = await request(app).get(`/api/v1/workers?oficioId=${cat.electricidad}&zonaId=${cat.lapaz}`).set(auth('cli13'));
      const t = b.body.find((x) => x.id === S.tra13.perfilId);
      expect(Array.isArray(t.insignias)).toBe(true);
      const p = await request(app).get('/api/v1/workers/me/profile').set(auth('tra13'));
      expect(p.body.perfil.progresoInsignias.map((x) => x.clave)).toEqual(['comprueba_gastos', 'respeta_cotizacion', 'cumplido']);
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
