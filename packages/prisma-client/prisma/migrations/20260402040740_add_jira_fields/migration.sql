/*
  Warnings:

  - You are about to drop the column `bitbucketIssueUrl` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "bitbucketIssueUrl",
ADD COLUMN     "jiraIssueId" TEXT,
ADD COLUMN     "jiraIssueKey" TEXT;

-- CreateIndex
CREATE INDEX "Report_jiraIssueId_idx" ON "Report"("jiraIssueId");
