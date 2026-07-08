-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "quotes" (
    "id" SERIAL NOT NULL,
    "quote_date" TEXT NOT NULL,
    "customer_name" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" SERIAL NOT NULL,
    "quote_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "amount" INTEGER,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotes_quote_date_idx" ON "quotes"("quote_date");

-- CreateIndex
CREATE INDEX "quote_items_item_name_idx" ON "quote_items"("item_name");

-- CreateIndex
CREATE UNIQUE INDEX "quote_items_quote_id_item_name_key" ON "quote_items"("quote_id", "item_name");

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

