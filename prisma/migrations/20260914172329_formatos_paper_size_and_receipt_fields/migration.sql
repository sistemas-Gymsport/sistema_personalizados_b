-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('TICKET_58', 'TICKET_80', 'CARTA', 'LEGAL');

-- AlterTable
ALTER TABLE "formatos" ADD COLUMN     "paperSize" "PaperSize" NOT NULL DEFAULT 'TICKET_80';

-- AlterTable
ALTER TABLE "personalizados" ADD COLUMN     "cargoExtra" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "concepto" TEXT,
ADD COLUMN     "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "recargos" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sucursales" ADD COLUMN     "rfc" TEXT;
