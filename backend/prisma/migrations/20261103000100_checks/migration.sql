-- Restricciones CHECK de la sección 3.1 del contrato. Prisma no las expresa en schema.prisma,
-- por eso van en una migración SQL aparte. Son el respaldo de las validaciones de la API.
ALTER TABLE "resena" ADD CONSTRAINT "resena_estrellas_check" CHECK ("estrellas" BETWEEN 1 AND 5);
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_monto_check" CHECK ("monto" > 0);
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_tiempo_estimado_horas_check" CHECK ("tiempo_estimado_horas" > 0);
ALTER TABLE "perfil_trabajador" ADD CONSTRAINT "perfil_trabajador_contadores_check"
  CHECK ("solicitudes_aceptadas" >= 0 AND "cancelaciones_atribuibles" >= 0 AND "trabajos_completados" >= 0);
