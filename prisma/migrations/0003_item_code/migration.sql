-- AlterTable
ALTER TABLE "items" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");
