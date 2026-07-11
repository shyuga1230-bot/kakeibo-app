-- 納品書・請求書
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "doc_number" TEXT NOT NULL,
    "issue_date" TEXT NOT NULL,
    "due_date" TEXT,
    "customer_name" TEXT NOT NULL DEFAULT '',
    "honorific" TEXT NOT NULL DEFAULT '御中',
    "subject" TEXT,
    "note" TEXT,
    "tax_rate" INTEGER NOT NULL DEFAULT 10,
    "quote_id" INTEGER,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- 書類の明細1行(品名・数量・単位・単価・金額)
CREATE TABLE "document_items" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "unit_price" INTEGER,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_items_pkey" PRIMARY KEY ("id")
);

-- 自社情報(書類に印字する会社名・住所・振込先など)。1行だけ使う
CREATE TABLE "company_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT '',
    "postal" TEXT,
    "address" TEXT,
    "tel" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "invoice_reg_no" TEXT,
    "bank_info" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_type_doc_number_key" ON "documents"("type", "doc_number");
CREATE INDEX "documents_deleted_at_idx" ON "documents"("deleted_at");
CREATE INDEX "documents_type_issue_date_idx" ON "documents"("type", "issue_date");
CREATE INDEX "documents_quote_id_idx" ON "documents"("quote_id");
CREATE INDEX "document_items_document_id_position_idx" ON "document_items"("document_id", "position");

ALTER TABLE "documents" ADD CONSTRAINT "documents_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
