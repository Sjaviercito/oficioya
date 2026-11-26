-- Etapa 4: ajuste de precio con aprobación del cliente (contrato v1.0, RF-16 y RF-17).
CREATE TYPE "EstadoAjuste" AS ENUM ('pendiente', 'aceptado', 'rechazado');

ALTER TABLE "perfil_trabajador" ADD COLUMN "trabajos_con_ajuste" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ajuste_precio" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "monto_anterior" DECIMAL(10,2) NOT NULL,
    "monto_propuesto" DECIMAL(10,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoAjuste" NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_en" TIMESTAMP(3),
    CONSTRAINT "ajuste_precio_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ajuste_precio_aumento_check" CHECK ("monto_propuesto" > "monto_anterior")
);

CREATE INDEX "ajuste_precio_solicitud_id_estado_idx" ON "ajuste_precio"("solicitud_id", "estado");
-- Un solo ajuste pendiente por solicitud, garantizado por la base de datos.
CREATE UNIQUE INDEX "ajuste_precio_un_pendiente" ON "ajuste_precio"("solicitud_id") WHERE "estado" = 'pendiente';

ALTER TABLE "ajuste_precio" ADD CONSTRAINT "ajuste_precio_solicitud_id_fkey"
  FOREIGN KEY ("solicitud_id") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
