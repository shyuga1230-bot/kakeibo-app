-- 「誰が登録・変更したか」の記録と、ごみ箱(30日以内の復元)用の列を追加する

-- 見積もり: 登録者名と、ごみ箱に入れた日時(NULL = 削除されていない)
ALTER TABLE "quotes" ADD COLUMN "created_by" TEXT;
ALTER TABLE "quotes" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- 案件: ごみ箱に入れた日時(NULL = 削除されていない)
ALTER TABLE "projects" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- 案件の更新履歴: 変更した人の名前
ALTER TABLE "project_logs" ADD COLUMN "changed_by" TEXT;

-- 一覧の「削除済みを除く」絞り込みと、ごみ箱の一覧用
CREATE INDEX "quotes_deleted_at_idx" ON "quotes"("deleted_at");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");
