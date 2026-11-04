-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('cliente', 'trabajador', 'admin');

-- CreateEnum
CREATE TYPE "EstadoVerificacion" AS ENUM ('sin_enviar', 'pendiente', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('abierta', 'cotizada', 'aceptada', 'en_curso', 'completada', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- CreateEnum
CREATE TYPE "RolCancelacion" AS ENUM ('cliente', 'trabajador');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_trabajador" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "experiencia_anios" INTEGER NOT NULL DEFAULT 0,
    "foto_url" TEXT,
    "estado_verificacion" "EstadoVerificacion" NOT NULL DEFAULT 'sin_enviar',
    "motivo_rechazo" TEXT,
    "verificado_en" TIMESTAMP(3),
    "solicitudes_aceptadas" INTEGER NOT NULL DEFAULT 0,
    "cancelaciones_atribuibles" INTEGER NOT NULL DEFAULT 0,
    "trabajos_completados" INTEGER NOT NULL DEFAULT 0,
    "calificacion_ponderada" DECIMAL(6,4),
    "tasa_cancelacion" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "puntuacion_ranking" DECIMAL(6,4),
    "ranking_actualizado_en" TIMESTAMP(3),

    CONSTRAINT "perfil_trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oficio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "oficio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zona" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajador_oficio" (
    "trabajador_id" UUID NOT NULL,
    "oficio_id" INTEGER NOT NULL,

    CONSTRAINT "trabajador_oficio_pkey" PRIMARY KEY ("trabajador_id","oficio_id")
);

-- CreateTable
CREATE TABLE "trabajador_zona" (
    "trabajador_id" UUID NOT NULL,
    "zona_id" INTEGER NOT NULL,

    CONSTRAINT "trabajador_zona_pkey" PRIMARY KEY ("trabajador_id","zona_id")
);

-- CreateTable
CREATE TABLE "identificacion" (
    "id" UUID NOT NULL,
    "trabajador_id" UUID NOT NULL,
    "ruta_ine_cifrada" TEXT NOT NULL,
    "ruta_selfie_cifrada" TEXT NOT NULL,
    "enviada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisada_por" UUID,
    "revisada_en" TIMESTAMP(3),

    CONSTRAINT "identificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "oficio_id" INTEGER NOT NULL,
    "zona_id" INTEGER NOT NULL,
    "colonia" TEXT NOT NULL,
    "direccion_exacta" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_deseada" DATE NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'abierta',
    "cotizacion_aceptada_id" UUID,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completada_en" TIMESTAMP(3),

    CONSTRAINT "solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto_solicitud" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "foto_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "trabajador_id" UUID NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "tiempo_estimado_horas" INTEGER NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'pendiente',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelacion" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "cancelada_por" UUID NOT NULL,
    "rol_que_cancela" "RolCancelacion" NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalle" TEXT,
    "atribuible_al_trabajador" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancelacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resena" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "trabajador_id" UUID NOT NULL,
    "estrellas" INTEGER NOT NULL,
    "comentario" TEXT,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_trabajador_usuario_id_key" ON "perfil_trabajador"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "oficio_nombre_key" ON "oficio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "zona_nombre_key" ON "zona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "identificacion_trabajador_id_key" ON "identificacion"("trabajador_id");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_cotizacion_aceptada_id_key" ON "solicitud"("cotizacion_aceptada_id");

-- CreateIndex
CREATE INDEX "solicitud_oficio_id_zona_id_estado_idx" ON "solicitud"("oficio_id", "zona_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_solicitud_id_trabajador_id_key" ON "cotizacion"("solicitud_id", "trabajador_id");

-- CreateIndex
CREATE UNIQUE INDEX "cancelacion_solicitud_id_key" ON "cancelacion"("solicitud_id");

-- CreateIndex
CREATE UNIQUE INDEX "resena_solicitud_id_key" ON "resena"("solicitud_id");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_trabajador" ADD CONSTRAINT "perfil_trabajador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_oficio" ADD CONSTRAINT "trabajador_oficio_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "perfil_trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_oficio" ADD CONSTRAINT "trabajador_oficio_oficio_id_fkey" FOREIGN KEY ("oficio_id") REFERENCES "oficio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_zona" ADD CONSTRAINT "trabajador_zona_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "perfil_trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_zona" ADD CONSTRAINT "trabajador_zona_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identificacion" ADD CONSTRAINT "identificacion_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "perfil_trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identificacion" ADD CONSTRAINT "identificacion_revisada_por_fkey" FOREIGN KEY ("revisada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_oficio_id_fkey" FOREIGN KEY ("oficio_id") REFERENCES "oficio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_cotizacion_aceptada_id_fkey" FOREIGN KEY ("cotizacion_aceptada_id") REFERENCES "cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_solicitud" ADD CONSTRAINT "foto_solicitud_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "perfil_trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelacion" ADD CONSTRAINT "cancelacion_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelacion" ADD CONSTRAINT "cancelacion_cancelada_por_fkey" FOREIGN KEY ("cancelada_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "resena_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "resena_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "resena_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "perfil_trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
