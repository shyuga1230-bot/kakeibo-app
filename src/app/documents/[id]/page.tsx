// 書類(納品書・請求書)の編集ページ。編集フォームと印刷用プレビューを表示する。
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDocument } from "@/lib/documents";
import { getCompany } from "@/lib/company";
import DocumentEditor from "@/components/DocumentEditor";

export const metadata = { title: "書類の編集 | Ark 見積・案件データベース" };

export default async function DocumentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getSession())) redirect("/login");

  const { id: idRaw } = await params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [doc, company] = await Promise.all([getDocument(id), getCompany()]);
  if (!doc) notFound();

  return <DocumentEditor doc={doc} company={company} />;
}
