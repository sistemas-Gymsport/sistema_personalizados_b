-- AlterTable
ALTER TABLE "formatos" ADD COLUMN     "datasetId" TEXT;

-- CreateIndex
CREATE INDEX "formatos_datasetId_idx" ON "formatos"("datasetId");

-- AddForeignKey
ALTER TABLE "formatos" ADD CONSTRAINT "formatos_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
