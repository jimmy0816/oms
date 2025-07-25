/*
  Warnings:

  - You are about to drop the column `type` on the `SavedView` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,name,viewType]` on the table `SavedView` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SavedView_userId_name_key";

-- AlterTable
ALTER TABLE "SavedView" DROP COLUMN "type",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewType" "SavedViewType" NOT NULL DEFAULT 'REPORT';

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_name_viewType_key" ON "SavedView"("userId", "name", "viewType");
