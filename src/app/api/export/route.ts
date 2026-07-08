// 全データのCSVダウンロード。Excelで開いても文字化けしない形式(BOM付きUTF-8)。
// 明細1行 = CSV1行(見積もりの情報は各行に繰り返し入る)。
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadAllForExport } from "@/lib/quotes";
import { buildCsv } from "@/lib/csv";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const quotes = await loadAllForExport();
    const rows: (string | number | null)[][] = [
      ["見積もりID", "日付", "顧客名", "メモ", "項目名", "金額(円)"],
    ];
    for (const q of quotes) {
      if (q.items.length === 0) {
        rows.push([q.id, q.quoteDate, q.customerName, q.memo, null, null]);
        continue;
      }
      for (const item of q.items) {
        rows.push([q.id, q.quoteDate, q.customerName, q.memo, item.itemName, item.amount]);
      }
    }
    const csv = buildCsv(rows);
    const today = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="quotes_${today}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/export failed:", e);
    return NextResponse.json(
      { error: "CSVの作成に失敗しました" },
      { status: 500 },
    );
  }
}
