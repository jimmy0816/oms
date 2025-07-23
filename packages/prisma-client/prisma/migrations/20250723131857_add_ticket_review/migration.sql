-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "TicketReview" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ticketId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "TicketReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketReview_ticketId_idx" ON "TicketReview"("ticketId");

-- CreateIndex
CREATE INDEX "TicketReview_creatorId_idx" ON "TicketReview"("creatorId");

-- AddForeignKey
ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
