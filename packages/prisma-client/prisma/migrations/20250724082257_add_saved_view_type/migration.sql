-- CreateEnum
CREATE TYPE "SavedViewType" AS ENUM ('REPORT', 'TICKET');

-- DropForeignKey
ALTER TABLE "SavedView" DROP CONSTRAINT "SavedView_userId_fkey";

-- DropIndex
DROP INDEX "SavedView_userId_idx";

-- AlterTable
ALTER TABLE "SavedView" ADD COLUMN     "type" "SavedViewType" NOT NULL DEFAULT 'REPORT';

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
