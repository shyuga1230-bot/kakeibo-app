// 自社情報(書類に印字する会社名・住所・振込先など)の保存API。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveCompany, type CompanyInfo } from "@/lib/company";

export async function PUT(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "送信内容を読み取れません" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;

  const info: CompanyInfo = {
    name: str(b.name, 100) ?? "",
    postal: str(b.postal, 20),
    address: str(b.address, 200),
    tel: str(b.tel, 30),
    fax: str(b.fax, 30),
    email: str(b.email, 100),
    invoiceRegNo: str(b.invoiceRegNo, 20),
    bankInfo: str(b.bankInfo, 500),
  };

  try {
    await saveCompany(info);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/company failed:", e);
    return NextResponse.json(
      { error: "保存に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
