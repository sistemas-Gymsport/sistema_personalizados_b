-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "CatalogType" AS ENUM ('FORMA_PAGO', 'ESTATUS_PAGO', 'ESTATUS_SESION', 'ESTATUS_COMISION');

-- CreateEnum
CREATE TYPE "FieldEntity" AS ENUM ('PERSONALIZADO', 'SESION', 'COMISION', 'SOCIO');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'TIME', 'CURRENCY', 'BOOLEAN', 'SELECT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COLABORADOR',
    "sucursalId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "type" "CatalogType" NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "defaultCommissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "instructores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquetes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionsCount" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sessionValue" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paquetes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "socios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT,
    "percent" DECIMAL(5,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "margins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "top" DOUBLE PRECISION NOT NULL,
    "right" DOUBLE PRECISION NOT NULL,
    "bottom" DOUBLE PRECISION NOT NULL,
    "left" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "margins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalizados" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "sessionsContracted" INTEGER NOT NULL,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "formaPagoId" TEXT,
    "paymentDate" TIMESTAMP(3),
    "estatusPagoId" TEXT,
    "sessionsRealized" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "personalizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "personalizadoId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "instructorId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "estatusId" TEXT,
    "realizada" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comisiones" (
    "id" TEXT NOT NULL,
    "personalizadoId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "sessionsRealized" INTEGER NOT NULL,
    "sessionValue" DECIMAL(10,2) NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "generatedAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentDate" TIMESTAMP(3),
    "estatusId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "comisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes_comision" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "sucursalId" TEXT,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "cortes_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes_comision_items" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "amountApplied" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cortes_comision_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" TEXT NOT NULL,
    "entity" "FieldEntity" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_values" (
    "id" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formatos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT NOT NULL,
    "logoPublicId" TEXT NOT NULL,
    "marginId" TEXT NOT NULL,
    "fieldsConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "formatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formatos_impresos" (
    "id" TEXT NOT NULL,
    "formatoId" TEXT NOT NULL,
    "snapshotConfig" JSONB NOT NULL,
    "snapshotValues" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,

    CONSTRAINT "formatos_impresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "systemName" TEXT NOT NULL DEFAULT 'GymSport',
    "primaryColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f8fafc',
    "textColor" TEXT NOT NULL DEFAULT '#0f172a',
    "buttonColor" TEXT NOT NULL DEFAULT '#1d4ed8',
    "logoUrl" TEXT,
    "logoPublicId" TEXT,
    "faviconUrl" TEXT,
    "faviconPublicId" TEXT,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Bienvenido al sistema de personalizados',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_sucursalId_idx" ON "users"("sucursalId");

-- CreateIndex
CREATE INDEX "catalog_items_type_active_idx" ON "catalog_items"("type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_type_name_key" ON "catalog_items"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_name_key" ON "sucursales"("name");

-- CreateIndex
CREATE UNIQUE INDEX "instructores_userId_key" ON "instructores"("userId");

-- CreateIndex
CREATE INDEX "commission_rules_instructorId_active_idx" ON "commission_rules"("instructorId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "margins_name_key" ON "margins"("name");

-- CreateIndex
CREATE UNIQUE INDEX "personalizados_folio_key" ON "personalizados"("folio");

-- CreateIndex
CREATE INDEX "personalizados_sucursalId_idx" ON "personalizados"("sucursalId");

-- CreateIndex
CREATE INDEX "personalizados_instructorId_idx" ON "personalizados"("instructorId");

-- CreateIndex
CREATE INDEX "personalizados_socioId_idx" ON "personalizados"("socioId");

-- CreateIndex
CREATE INDEX "personalizados_saleDate_idx" ON "personalizados"("saleDate");

-- CreateIndex
CREATE INDEX "sesiones_personalizadoId_idx" ON "sesiones"("personalizadoId");

-- CreateIndex
CREATE INDEX "sesiones_instructorId_idx" ON "sesiones"("instructorId");

-- CreateIndex
CREATE INDEX "sesiones_sucursalId_idx" ON "sesiones"("sucursalId");

-- CreateIndex
CREATE INDEX "sesiones_date_idx" ON "sesiones"("date");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_personalizadoId_sessionNumber_key" ON "sesiones"("personalizadoId", "sessionNumber");

-- CreateIndex
CREATE INDEX "comisiones_instructorId_period_idx" ON "comisiones"("instructorId", "period");

-- CreateIndex
CREATE INDEX "comisiones_period_idx" ON "comisiones"("period");

-- CreateIndex
CREATE INDEX "cortes_comision_instructorId_period_idx" ON "cortes_comision"("instructorId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "cortes_comision_items_corteId_comisionId_key" ON "cortes_comision_items"("corteId", "comisionId");

-- CreateIndex
CREATE INDEX "field_definitions_entity_active_idx" ON "field_definitions"("entity", "active");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_entity_key_key" ON "field_definitions"("entity", "key");

-- CreateIndex
CREATE INDEX "field_values_recordId_idx" ON "field_values"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "field_values_fieldDefinitionId_recordId_key" ON "field_values"("fieldDefinitionId", "recordId");

-- CreateIndex
CREATE INDEX "formatos_active_idx" ON "formatos"("active");

-- CreateIndex
CREATE INDEX "formatos_name_idx" ON "formatos"("name");

-- CreateIndex
CREATE INDEX "formatos_impresos_formatoId_idx" ON "formatos_impresos"("formatoId");

-- CreateIndex
CREATE INDEX "formatos_impresos_generatedAt_idx" ON "formatos_impresos"("generatedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructores" ADD CONSTRAINT "instructores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "paquetes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_estatusPagoId_fkey" FOREIGN KEY ("estatusPagoId") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizados" ADD CONSTRAINT "personalizados_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_personalizadoId_fkey" FOREIGN KEY ("personalizadoId") REFERENCES "personalizados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_estatusId_fkey" FOREIGN KEY ("estatusId") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_personalizadoId_fkey" FOREIGN KEY ("personalizadoId") REFERENCES "personalizados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_estatusId_fkey" FOREIGN KEY ("estatusId") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_comision" ADD CONSTRAINT "cortes_comision_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_comision" ADD CONSTRAINT "cortes_comision_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_comision" ADD CONSTRAINT "cortes_comision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_comision_items" ADD CONSTRAINT "cortes_comision_items_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "cortes_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_comision_items" ADD CONSTRAINT "cortes_comision_items_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comisiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formatos" ADD CONSTRAINT "formatos_marginId_fkey" FOREIGN KEY ("marginId") REFERENCES "margins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formatos" ADD CONSTRAINT "formatos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formatos" ADD CONSTRAINT "formatos_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formatos_impresos" ADD CONSTRAINT "formatos_impresos_formatoId_fkey" FOREIGN KEY ("formatoId") REFERENCES "formatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formatos_impresos" ADD CONSTRAINT "formatos_impresos_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
