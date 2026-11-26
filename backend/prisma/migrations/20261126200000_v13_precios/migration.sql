-- Contrato v1.3: cotización desglosada (LFPC art. 59) o visita de diagnóstico, ajustes por tipo con
-- desglose, foto y ticket, bajas de precio, métrica de sobreprecio y preguntas antes de cotizar.
ALTER TABLE "cotizacion"
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'cerrado',
  ADD COLUMN "mano_obra" DECIMAL(10,2),
  ADD COLUMN "material" DECIMAL(10,2),
  ADD COLUMN "vigencia_dias" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "costo_visita" DECIMAL(10,2),
  ADD COLUMN "visita_abonable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_tipo_check" CHECK ("tipo" IN ('cerrado', 'diagnostico'));
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_vigencia_check" CHECK ("vigencia_dias" BETWEEN 1 AND 60);
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_desglose_check"
  CHECK (("mano_obra" IS NULL OR "mano_obra" >= 0) AND ("material" IS NULL OR "material" >= 0) AND ("costo_visita" IS NULL OR "costo_visita" > 0));
-- Las cotizaciones anteriores quedan como precio cerrado de pura mano de obra.
UPDATE "cotizacion" SET "mano_obra" = "monto", "material" = 0 WHERE "mano_obra" IS NULL;

-- Las bajas de precio ya están permitidas: se cambia el CHECK de "solo aumentos" por "monto positivo".
ALTER TABLE "ajuste_precio" DROP CONSTRAINT "ajuste_precio_aumento_check";
ALTER TABLE "ajuste_precio" ADD CONSTRAINT "ajuste_precio_monto_check" CHECK ("monto_propuesto" > 0);
ALTER TABLE "ajuste_precio"
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'mas_trabajo',
  ADD COLUMN "delta_mano_obra" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "delta_material" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "foto_clave" TEXT,
  ADD COLUMN "ticket_clave" TEXT,
  ADD COLUMN "ticket_monto" DECIMAL(10,2),
  ADD COLUMN "ticket_en" TIMESTAMP(3);
ALTER TABLE "ajuste_precio" ADD CONSTRAINT "ajuste_precio_tipo_check"
  CHECK ("tipo" IN ('pieza_extra', 'mas_trabajo', 'dano_oculto', 'cliente_pidio_mas', 'mas_facil', 'presupuesto'));
UPDATE "ajuste_precio" SET "delta_mano_obra" = "monto_propuesto" - "monto_anterior";

ALTER TABLE "solicitud"
  ADD COLUMN "monto_base" DECIMAL(10,2),
  ADD COLUMN "monto_cerrado" DECIMAL(10,2),
  ADD COLUMN "sobre_cotizado_pct" DECIMAL(7,4);

CREATE TABLE "pregunta" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL REFERENCES "solicitud"("id") ON DELETE CASCADE,
    "trabajador_id" UUID NOT NULL REFERENCES "perfil_trabajador"("id"),
    "texto" TEXT NOT NULL,
    "respuesta" TEXT,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondida_en" TIMESTAMP(3),
    CONSTRAINT "pregunta_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pregunta_solicitud_id_idx" ON "pregunta"("solicitud_id");

-- Métricas de los trabajos ya completados (antes de la v1.3 todo era precio cerrado y los
-- ajustes eran "más trabajo"): base = cotización aceptada; cerrado = base + ajustes aceptados.
UPDATE "solicitud" s SET
  "monto_base" = c."monto",
  "monto_cerrado" = c."monto" + COALESCE((SELECT SUM(a."monto_propuesto" - a."monto_anterior") FROM "ajuste_precio" a
                                          WHERE a."solicitud_id" = s."id" AND a."estado" = 'aceptado'), 0)
FROM "cotizacion" c
WHERE c."id" = s."cotizacion_aceptada_id" AND s."estado" = 'completada' AND s."monto_base" IS NULL;
UPDATE "solicitud" SET "sobre_cotizado_pct" = ("monto_cerrado" - "monto_base") / "monto_base"
WHERE "estado" = 'completada' AND "sobre_cotizado_pct" IS NULL AND "monto_base" > 0;
