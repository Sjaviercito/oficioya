-- Contrato v1.1: tope de ajuste por oficio y archivos persistentes en la base de datos.
ALTER TABLE "oficio" ADD COLUMN "tope_ajuste" DECIMAL(4,2) NOT NULL DEFAULT 0.50;
ALTER TABLE "oficio" ADD CONSTRAINT "oficio_tope_ajuste_check" CHECK ("tope_ajuste" >= 0.10 AND "tope_ajuste" <= 1.00);

CREATE TABLE "archivo" (
    "clave" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,
    "publico" BOOLEAN NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "archivo_pkey" PRIMARY KEY ("clave")
);
