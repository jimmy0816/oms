-- CreateTable
CREATE TABLE "ReportTicket" (
    "reportId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportTicket_pkey" PRIMARY KEY ("reportId","ticketId")
);

-- AddForeignKey
ALTER TABLE "ReportTicket" ADD CONSTRAINT "ReportTicket_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTicket" ADD CONSTRAINT "ReportTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
