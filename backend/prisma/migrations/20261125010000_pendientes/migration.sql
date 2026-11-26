-- Etapa 4: RF-11 (avisos), RF-12 (respuesta a reseñas) y RF-13 (reportes y suspensión).
ALTER TABLE "perfil_trabajador" ADD COLUMN "suspendido" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "resena" ADD COLUMN "respuesta" TEXT, ADD COLUMN "respondida_en" TIMESTAMP(3);

CREATE TABLE "reporte" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL REFERENCES "solicitud"("id") ON DELETE CASCADE,
    "cliente_id" UUID NOT NULL REFERENCES "usuario"("id"),
    "trabajador_id" UUID NOT NULL REFERENCES "perfil_trabajador"("id"),
    "motivo" TEXT NOT NULL,
    "atendido" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reporte_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reporte_solicitud_id_cliente_id_key" ON "reporte"("solicitud_id", "cliente_id");

CREATE TABLE "notificacion" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
    "solicitud_id" UUID REFERENCES "solicitud"("id") ON DELETE CASCADE,
    "texto" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notificacion_usuario_id_leida_idx" ON "notificacion"("usuario_id", "leida");
