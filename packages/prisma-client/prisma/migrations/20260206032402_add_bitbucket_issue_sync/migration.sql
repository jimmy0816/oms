-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "bitbucketIssueId" TEXT,
ADD COLUMN     "bitbucketIssueUrl" TEXT;

-- CreateIndex
CREATE INDEX "Report_bitbucketIssueId_idx" ON "Report"("bitbucketIssueId");
