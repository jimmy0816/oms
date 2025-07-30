-- CreateTable
CREATE TABLE "IdSequence" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdSequence_modelName_key" ON "IdSequence"("modelName");
