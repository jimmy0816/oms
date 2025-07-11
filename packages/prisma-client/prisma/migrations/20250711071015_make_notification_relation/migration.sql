/*
  Warnings:

  - You are about to drop the column `relatedReportId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `relatedTicketId` on the `Notification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_relatedReportId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_relatedTicketId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "relatedReportId",
DROP COLUMN "relatedTicketId",
ADD COLUMN     "relatedId" TEXT,
ADD COLUMN     "relatedType" TEXT;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'UNCONFIRMED';

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_relatedId_relatedType_idx" ON "Notification"("relatedId", "relatedType");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
