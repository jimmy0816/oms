/*
  Warnings:

  - A unique constraint covering the columns `[modelName,date]` on the table `IdSequence` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "IdSequence_modelName_key";

-- CreateIndex
CREATE UNIQUE INDEX "IdSequence_modelName_date_key" ON "IdSequence"("modelName", "date");
