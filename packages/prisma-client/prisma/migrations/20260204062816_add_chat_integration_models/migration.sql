-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'GOOGLE_CHAT',
    "chatSpaceId" TEXT NOT NULL,
    "chatSpaceName" TEXT,
    "chatThreadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "request" JSONB,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_reportId_key" ON "ChatThread"("reportId");

-- CreateIndex
CREATE INDEX "ChatThread_chatSpaceId_chatThreadId_idx" ON "ChatThread"("chatSpaceId", "chatThreadId");

-- CreateIndex
CREATE INDEX "ChatThread_platform_idx" ON "ChatThread"("platform");

-- CreateIndex
CREATE INDEX "ChatLog_platform_idx" ON "ChatLog"("platform");

-- CreateIndex
CREATE INDEX "ChatLog_status_idx" ON "ChatLog"("status");

-- CreateIndex
CREATE INDEX "ChatLog_relatedId_relatedType_idx" ON "ChatLog"("relatedId", "relatedType");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
