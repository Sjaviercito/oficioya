// Datos de prueba FICTICIOS para la demo (npm run db:seed). Nunca usar datos reales.
// Crea el catálogo, un administrador, clientes y trabajadores, e incluye el escenario del
// CA-04.1 / CA-10.1 (trabajadores A, B, C y D de Plomería en Centro).
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/shared/prisma');
const { recalcularTrabajador } = require('../src/modules/ranking/service');

const PASSWORD_DEMO = 'OficioYa2026!';
const DIA = 24 * 60 * 60 * 1000;
const haceDias = (n) => new Date(Date.now() - n * DIA);
const enDias = (n) => new Date(new Date(Date.now() + n * DIA).toISOString().slice(0, 10) + 'T00:00:00Z');

const OFICIOS = ['Plomería', 'Electricidad', 'Albañilería', 'Cerrajería', 'Carpintería', 'Pintura'];
const ZONAS = ['Centro', 'La Paz', 'Angelópolis', 'San Manuel', 'Huexotitla', 'Cholula'];

async function usuario(nombre, email, rol, hash) {
  return prisma.usuario.create({
    data: { nombre, email, rol, passwordHash: hash, ...(rol === 'trabajador' ? { perfilTrabajador: { create: {} } } : {}) },
    include: { perfilTrabajador: true },
  });
}

async function trabajador(nombre, email, hash, { oficio, zona, verificado = true, diasVerificado = 200, experiencia = 5 }) {
  const u = await usuario(nombre, email, 'trabajador', hash);
  await prisma.perfilTrabajador.update({
    where: { id: u.perfilTrabajador.id },
    data: {
      experienciaAnios: experiencia,
      estadoVerificacion: verificado ? 'aprobado' : 'pendiente',
      verificadoEn: verificado ? haceDias(diasVerificado) : null,
      oficios: { create: [{ oficioId: oficio.id }] },
      zonas: { create: [{ zonaId: zona.id }] },
    },
  });
  return u.perfilTrabajador.id;
}

// Crea una solicitud ya aceptada por el trabajador y la lleva al estado final indicado.
async function historial(clienteId, trabajadorId, oficio, zona, { final, diasAtras, estrellas, quienCancela }) {
  const s = await prisma.solicitud.create({
    data: {
      clienteId,
      oficioId: oficio.id,
      zonaId: zona.id,
      colonia: 'Centro Histórico',
      direccionExacta: 'Calle Ficticia 123, Puebla',
      descripcion: 'Trabajo de demostración generado por el seed (datos ficticios).',
      fechaDeseada: enDias(-diasAtras),
      estado: final,
      creadaEn: haceDias(diasAtras + 2),
      completadaEn: final === 'completada' ? haceDias(diasAtras) : null,
    },
  });
  const c = await prisma.cotizacion.create({
    data: { solicitudId: s.id, trabajadorId, monto: 850, tiempoEstimadoHoras: 3, estado: 'aceptada', creadaEn: haceDias(diasAtras + 1) },
  });
  await prisma.solicitud.update({ where: { id: s.id }, data: { cotizacionAceptadaId: c.id } });
  await prisma.perfilTrabajador.update({ where: { id: trabajadorId }, data: { solicitudesAceptadas: { increment: 1 } } });

  if (final === 'completada') {
    await prisma.perfilTrabajador.update({ where: { id: trabajadorId }, data: { trabajosCompletados: { increment: 1 } } });
    if (estrellas) {
      await prisma.resena.create({
        data: { solicitudId: s.id, clienteId, trabajadorId, estrellas, comentario: 'Reseña de demostración', creadaEn: haceDias(diasAtras) },
      });
    }
  }
  if (final === 'cancelada') {
    const atribuible = quienCancela === 'trabajador';
    const perfil = await prisma.perfilTrabajador.findUnique({ where: { id: trabajadorId } });
    await prisma.cancelacion.create({
      data: {
        solicitudId: s.id,
        canceladaPor: atribuible ? perfil.usuarioId : clienteId,
        rolQueCancela: quienCancela,
        motivo: atribuible ? 'No puedo asistir' : 'Ya no lo necesito',
        atribuibleAlTrabajador: atribuible,
        fecha: haceDias(diasAtras),
      },
    });
    if (atribuible) {
      await prisma.perfilTrabajador.update({ where: { id: trabajadorId }, data: { cancelacionesAtribuibles: { increment: 1 } } });
    }
  }
}

async function main() {
  if ((await prisma.usuario.count()) > 0) {
    console.log('La base ya tiene usuarios; el seed no se vuelve a ejecutar.');
    return;
  }
  const hash = await bcrypt.hash(PASSWORD_DEMO, 10);

  for (const nombre of OFICIOS) await prisma.oficio.upsert({ where: { nombre }, update: {}, create: { nombre } });
  for (const nombre of ZONAS) await prisma.zona.upsert({ where: { nombre }, update: {}, create: { nombre } });
  const plomeria = await prisma.oficio.findUnique({ where: { nombre: 'Plomería' } });
  const centro = await prisma.zona.findUnique({ where: { nombre: 'Centro' } });

  await usuario('Administración OficioYa', 'admin@oficioya.test', 'admin', hash);
  const ana = await usuario('Ana Prueba', 'cliente@oficioya.test', 'cliente', hash);
  const luis = await usuario('Luis Demo', 'cliente2@oficioya.test', 'cliente', hash);

  // Escenario CA-04.1: A (mejor ranking), B (3.49, CA-10.1), C (Nuevo) y D (sin verificar).
  const a = await trabajador('Arturo Fontanero', 'trabajador@oficioya.test', hash, { oficio: plomeria, zona: centro, diasVerificado: 300, experiencia: 8 });
  const b = await trabajador('Beatriz Tubos', 'trabajadorb@oficioya.test', hash, { oficio: plomeria, zona: centro, diasVerificado: 250 });
  const c = await trabajador('Carlos Llaves', 'trabajadorc@oficioya.test', hash, { oficio: plomeria, zona: centro, diasVerificado: 20, experiencia: 2 });
  const d = await trabajador('Diego Pendiente', 'trabajadord@oficioya.test', hash, { oficio: plomeria, zona: centro, verificado: false });

  for (const [dias, estrellas] of [[5, 5], [15, 4], [30, 5], [45, 4], [60, 5]]) {
    await historial(luis.id, a, plomeria, centro, { final: 'completada', diasAtras: dias, estrellas });
  }
  // B: 5★ hace 10 días, 4★ hace 120, 3★ hace 400; 1 cancelación suya y 1 del cliente → 3.49.
  await historial(luis.id, b, plomeria, centro, { final: 'completada', diasAtras: 10, estrellas: 5 });
  await historial(luis.id, b, plomeria, centro, { final: 'completada', diasAtras: 120, estrellas: 4 });
  await historial(luis.id, b, plomeria, centro, { final: 'completada', diasAtras: 400, estrellas: 3 });
  await historial(luis.id, b, plomeria, centro, { final: 'cancelada', diasAtras: 50, quienCancela: 'trabajador' });
  await historial(luis.id, b, plomeria, centro, { final: 'cancelada', diasAtras: 40, quienCancela: 'cliente' });
  await historial(luis.id, c, plomeria, centro, { final: 'completada', diasAtras: 7, estrellas: 5 });

  for (const id of [a, b, c, d]) await recalcularTrabajador(id);

  // Una solicitud abierta de Ana para probar el flujo completo en la demo.
  await prisma.solicitud.create({
    data: {
      clienteId: ana.id,
      oficioId: plomeria.id,
      zonaId: centro.id,
      colonia: 'El Carmen',
      direccionExacta: 'Avenida Inventada 45, interior 2, Puebla',
      descripcion: 'Gotea la llave del fregadero y el tubo de abajo tiene humedad.',
      fechaDeseada: enDias(3),
    },
  });

  console.log('Seed listo. Usuarios de prueba (contraseña para todos: ' + PASSWORD_DEMO + '):');
  console.log('  admin@oficioya.test      (administrador)');
  console.log('  cliente@oficioya.test    (cliente)');
  console.log('  trabajador@oficioya.test (trabajador verificado de Plomería en Centro)');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
