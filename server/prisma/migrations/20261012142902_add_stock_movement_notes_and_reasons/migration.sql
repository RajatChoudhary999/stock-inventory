-- AlterEnum
ALTER TYPE "MovementReason" ADD VALUE 'DAMAGE';

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "notes" TEXT;
