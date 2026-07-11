// 納品書・請求書のA4シート(会社共通フォーマット)。
// 編集画面のプレビューと印刷(PDF保存)の両方でこのまま使う。
// サーバー・クライアントのどちらからも使える表示専用の部品。

import { DOC_TYPES, docTotals, lineAmount, type DocType, type DocItemInput } from "@/lib/document-calc";
import type { CompanyInfo } from "@/lib/company";
import { formatDate, formatYen } from "@/lib/format";

export type SheetData = {
  type: DocType;
  docNumber: string;
  issueDate: string;
  dueDate: string | null;
  customerName: string;
  honorific: string;
  subject: string | null;
  note: string | null;
  taxRate: number;
  createdBy: string | null;
  items: DocItemInput[];
};

// 明細が少なくても表の高さがそろうように、最低行数まで空行で埋める
const MIN_ROWS = 8;

/** 数量の表示(1 → "1"、1.5 → "1.5") */
function formatQty(n: number | null): string {
  if (n == null) return "";
  return Number.isInteger(n) ? String(n) : String(n);
}

export default function DocumentSheet({
  data,
  company,
}: {
  data: SheetData;
  company: CompanyInfo;
}) {
  const def = DOC_TYPES[data.type];
  const totals = docTotals(data.items, data.taxRate);
  const rows: (DocItemInput | null)[] = [...data.items];
  while (rows.length < MIN_ROWS) rows.push(null);

  return (
    // スマホでは縮めずにA4の幅のまま横スクロールで見せる(親が overflow-x-auto)
    <div className="doc-sheet mx-auto flex w-[210mm] min-w-[210mm] flex-col bg-white p-[12mm] text-[11pt] leading-relaxed text-slate-900">
      {/* 表題と書類番号・発行日 */}
      <div className="relative text-center">
        <h1 className="inline-block border-b-4 border-double border-blue-800 px-10 pb-1 text-[20pt] font-bold tracking-[0.5em] text-blue-900">
          {def.title}
        </h1>
        <div className="absolute right-0 top-0 text-right text-[9pt] text-slate-600">
          <p>No. {data.docNumber}</p>
          <p>発行日: {formatDate(data.issueDate)}</p>
        </div>
      </div>

      {/* 宛名(左)と自社情報(右) */}
      <div className="mt-8 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="inline-block max-w-full border-b border-slate-400 pb-1 pr-6 text-[14pt] font-semibold">
            <span className="break-all">{data.customerName || "(宛名未入力)"}</span>
            {data.honorific && <span className="ml-2">{data.honorific}</span>}
          </p>
          {data.subject && (
            <p className="mt-3 text-[10.5pt]">
              <span className="mr-2 text-slate-500">件名:</span>
              <span className="break-all font-medium">{data.subject}</span>
            </p>
          )}
          <p className="mt-3 text-[10pt] text-slate-700">{def.greeting}</p>
        </div>

        <div className="w-64 shrink-0 text-[9pt] leading-relaxed text-slate-700">
          <p className="text-[11pt] font-bold text-slate-900">
            {company.name || "(自社情報が未設定です)"}
          </p>
          {company.postal && <p>〒{company.postal}</p>}
          {company.address && <p className="break-all">{company.address}</p>}
          {(company.tel || company.fax) && (
            <p>
              {company.tel && <>TEL: {company.tel}</>}
              {company.tel && company.fax && <span className="mx-1">/</span>}
              {company.fax && <>FAX: {company.fax}</>}
            </p>
          )}
          {company.email && <p className="break-all">{company.email}</p>}
          {company.invoiceRegNo && <p>登録番号: {company.invoiceRegNo}</p>}
          {data.createdBy && <p>担当: {data.createdBy}</p>}
        </div>
      </div>

      {/* 合計金額の箱 */}
      <div className="mt-5 flex items-center gap-4 border-y-2 border-blue-800 bg-blue-50/60 px-4 py-2.5">
        <span className="text-[11pt] font-semibold text-slate-700">合計金額</span>
        <span className="text-[16pt] font-bold tabular-nums tracking-wide">
          ¥{formatYen(totals.total)}
          <span className="ml-1 text-[9pt] font-medium text-slate-500">(税込)</span>
        </span>
      </div>

      {/* 明細表 */}
      <table className="mt-5 w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-blue-900 text-white">
            <th className="w-8 border border-blue-900 px-1 py-1.5 font-medium">No</th>
            <th className="border border-blue-900 px-2 py-1.5 text-left font-medium">品名</th>
            <th className="w-16 border border-blue-900 px-1 py-1.5 font-medium">数量</th>
            <th className="w-14 border border-blue-900 px-1 py-1.5 font-medium">単位</th>
            <th className="w-24 border border-blue-900 px-2 py-1.5 text-right font-medium">単価</th>
            <th className="w-28 border border-blue-900 px-2 py-1.5 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={i} className="odd:bg-slate-50/60">
              <td className="border border-slate-300 px-1 py-1.5 text-center tabular-nums text-slate-500">
                {item ? i + 1 : " "}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 break-all">{item?.name ?? ""}</td>
              <td className="border border-slate-300 px-1 py-1.5 text-center tabular-nums">
                {item ? formatQty(item.quantity) : ""}
              </td>
              <td className="border border-slate-300 px-1 py-1.5 text-center">{item?.unit ?? ""}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                {item?.unitPrice != null ? formatYen(item.unitPrice) : ""}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                {item ? formatYen(lineAmount(item)) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 小計・消費税・合計 */}
      <div className="mt-2 flex justify-end">
        <table className="w-64 border-collapse text-[10pt]">
          <tbody>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-2 py-1.5">小計(税抜)</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                ¥{formatYen(totals.subtotal)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 bg-slate-50 px-2 py-1.5">
                消費税({data.taxRate}%)
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">
                ¥{formatYen(totals.tax)}
              </td>
            </tr>
            <tr className="font-bold">
              <td className="border border-slate-400 bg-blue-50 px-2 py-1.5">合計(税込)</td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular-nums">
                ¥{formatYen(totals.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 振込先・支払期限(請求書のみ) */}
      {data.type === "invoice" && (data.dueDate || company.bankInfo) && (
        <div className="mt-5 rounded border border-slate-300 bg-slate-50/60 px-4 py-3 text-[9.5pt]">
          {data.dueDate && (
            <p>
              <span className="mr-2 font-semibold">お支払期限:</span>
              {formatDate(data.dueDate)}
            </p>
          )}
          {company.bankInfo && (
            <div className={data.dueDate ? "mt-1.5" : ""}>
              <p className="font-semibold">お振込先:</p>
              <p className="whitespace-pre-wrap break-words">{company.bankInfo}</p>
            </div>
          )}
        </div>
      )}

      {/* 備考 */}
      {data.note && (
        <div className="mt-4 text-[9.5pt]">
          <p className="font-semibold text-slate-600">備考</p>
          <p className="whitespace-pre-wrap break-words border-b border-slate-200 pb-1">
            {data.note}
          </p>
        </div>
      )}
    </div>
  );
}
