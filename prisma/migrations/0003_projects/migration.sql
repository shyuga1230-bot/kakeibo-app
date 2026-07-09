-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "client_name" TEXT,
    "partner_name" TEXT,
    "project_name" TEXT NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stages" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "stage_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "date" TEXT,
    "memo" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_logs" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_client_name_idx" ON "projects"("client_name");

-- CreateIndex
CREATE INDEX "projects_updated_at_idx" ON "projects"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_stages_project_id_stage_key_key" ON "project_stages"("project_id", "stage_key");

-- CreateIndex
CREATE INDEX "project_logs_project_id_created_at_idx" ON "project_logs"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
