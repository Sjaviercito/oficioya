-- Contrato v1.2: privacidad, baja de cuenta, contacto, horario de visita, terminado por el trabajador,
-- reportes en ambos sentidos y ranking que solo penaliza ajustes rechazados.
ALTER TABLE "usuario"
  ADD COLUMN "telefono" TEXT,
  ADD COLUMN "privacidad_aceptada_en" TIMESTAMP(3),
  ADD COLUMN "privacidad_version" TEXT,
  ADD COLUMN "suspendido" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "eliminado_en" TIMESTAMP(3);
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_telefono_check" CHECK ("telefono" IS NULL OR "telefono" ~ '^[0-9]{10}$');

ALTER TABLE "perfil_trabajador" ADD COLUMN "trabajos_con_ajuste_rechazado" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "solicitud"
  ADD COLUMN "terminada_por_trabajador_en" TIMESTAMP(3),
  ADD COLUMN "disputa_motivo" TEXT,
  ADD COLUMN "visita_propuesta" TIMESTAMP(3),
  ADD COLUMN "visita_confirmada" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "reporte" ADD COLUMN "rol_reportado" TEXT NOT NULL DEFAULT 'trabajador';
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_rol_reportado_check" CHECK ("rol_reportado" IN ('trabajador', 'cliente'));
DROP INDEX "reporte_solicitud_id_cliente_id_key";
CREATE UNIQUE INDEX "reporte_solicitud_id_rol_reportado_key" ON "reporte"("solicitud_id", "rol_reportado");
