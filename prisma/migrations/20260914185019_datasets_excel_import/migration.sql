-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "columnCount" INTEGER NOT NULL DEFAULT 0,
    "status" "DatasetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_columns" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "detectedType" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "dataset_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_rows" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,

    CONSTRAINT "dataset_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_values" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "dataset_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "datasets_expiresAt_idx" ON "datasets"("expiresAt");

-- CreateIndex
CREATE INDEX "datasets_createdById_idx" ON "datasets"("createdById");

-- CreateIndex
CREATE INDEX "dataset_columns_datasetId_idx" ON "dataset_columns"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_columns_datasetId_normalizedKey_key" ON "dataset_columns"("datasetId", "normalizedKey");

-- CreateIndex
CREATE INDEX "dataset_rows_datasetId_idx" ON "dataset_rows"("datasetId");

-- CreateIndex
CREATE INDEX "dataset_values_columnId_idx" ON "dataset_values"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_values_rowId_columnId_key" ON "dataset_values"("rowId", "columnId");

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_columns" ADD CONSTRAINT "dataset_columns_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_rows" ADD CONSTRAINT "dataset_rows_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_values" ADD CONSTRAINT "dataset_values_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "dataset_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_values" ADD CONSTRAINT "dataset_values_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "dataset_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
