-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
