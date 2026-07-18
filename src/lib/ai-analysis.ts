// AI分析(分析 → AIに聞くタブ)のサーバー側処理。
// 大事な決めごと: 計算はデータベース側で正確に行い、AIには
// 「できあがった集計データ」を渡して解釈と説明だけを任せる。
// (AIに生データの足し算をさせると間違うことがあるため)
// モデルはユーザーの指定で Claude Sonnet 5 を使う。
import "server-only";
import { getPrisma } from "@/lib/db";
import { loadQuotesForSales } from "@/lib/quotes";
import { availableYears, computeYearlyItemRanking, computeYearlySales } from "@/lib/sales";
import { computePairs } from "@/lib/analysis";
import { loadQuoteInvoicePairs } from "@/lib/compare";
import { summarizePairs } from "@/lib/compare-calc";
import { docTotals } from "@/lib/document-calc";
import { toJstDateString } from "@/lib/format";

/** AI分析が使える環境か(AI読み取りと同じAPIキーを使う) */
export function analysisAiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * AIに渡す集計データ一式。件数の上限を決めて、送る量(=料金)を抑える。
 * 数字はすべてデータベースから計算した正確な値。
 */
export async function buildAnalysisPack(): Promise<object> {
  const prisma = getPrisma();
  const today = toJstDateString(new Date());
  const thisYear = Number(today.slice(0, 4));

  const quotes = await loadQuotesForSales();
  const years = availableYears(quotes).slice(0, 2); // 今年と去年のぶんだけ

  // 年ごとの月別売上と商品ランキング
  const salesByYear = years.map((year) => ({
    year,
    monthly: computeYearlySales(quotes, year)
      .filter((m) => m.items.length > 0)
      .map((m) => ({
        month: m.month,
        total: m.total,
        topItems: m.items.slice(0, 8).map((i) => ({
          name: i.itemName,
          amount: i.amount,
          count: i.count,
        })),
      })),
    itemRanking: computeYearlyItemRanking(quotes, year)
      .slice(0, 30)
      .map((i) => ({ name: i.itemName, amount: i.amount, count: i.count })),
  }));

  // 今年の顧客別の受注額(並び順を固定して、送る内容を毎回同じにする=キャッシュを効かせる)
  const customerRows = await prisma.quote.findMany({
    where: { deletedAt: null, quoteDate: { startsWith: `${thisYear}-` } },
    orderBy: { id: "asc" },
    select: { customerName: true, items: { select: { amount: true } } },
  });
  const customerTotals = new Map<string, { total: number; count: number }>();
  for (const row of customerRows) {
    const name = row.customerName ?? "(顧客名なし)";
    const cur = customerTotals.get(name) ?? { total: 0, count: 0 };
    cur.total += row.items.reduce((s, i) => s + (i.amount ?? 0), 0);
    cur.count += 1;
    customerTotals.set(name, cur);
  }
  const customers = [...customerTotals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ja"))
    .slice(0, 30);

  // 一緒に売れやすい組み合わせ
  const quoteItems = quotes.map((q, i) => ({
    quoteId: i,
    itemNames: q.items.map((it) => it.itemName),
    amounts: q.items.map((it) => it.amount),
  }));
  const cosalesPairs = computePairs(quoteItems, 2)
    .slice(0, 15)
    .map((p) => ({ items: [p.itemA, p.itemB], count: p.count }));

  // 見積もり↔請求書の比較
  const { pairs, total: pairsTotal } = await loadQuoteInvoicePairs();
  const compareSummary = summarizePairs(pairs, 10);
  const comparePairs = pairs.slice(0, 40).map((p) => ({
    date: p.quoteDate,
    customer: p.customerName,
    subject: p.memo,
    quoteTotal: p.quoteTotal,
    invoiceTotal: p.invoiceTotal,
    // 見積もり側の金額が未入力(null)の項目は「変わった」とは言えないため入れない
    unknownQuoteAmounts: p.unknownQuoteAmounts,
    addedItems: p.diff.added.map((a) => a.name),
    removedItems: p.diff.removed.map((r) => r.name),
    changedItems: p.diff.common
      .filter((c) => c.quoteAmount != null && c.quoteAmount !== c.invoiceAmount)
      .map((c) => ({ name: c.name, quote: c.quoteAmount, invoice: c.invoiceAmount })),
  }));

  // 今年の請求書の月別合計
  const invoices = await prisma.document.findMany({
    where: { type: "invoice", deletedAt: null, issueDate: { startsWith: `${thisYear}-` } },
    select: {
      issueDate: true,
      taxRate: true,
      items: { select: { quantity: true, unitPrice: true, amount: true } },
    },
  });
  const invoiceMonthly = new Map<string, { subtotal: number; total: number; count: number }>();
  for (const inv of invoices) {
    const month = inv.issueDate.slice(0, 7);
    const t = docTotals(inv.items, inv.taxRate);
    const cur = invoiceMonthly.get(month) ?? { subtotal: 0, total: 0, count: 0 };
    cur.subtotal += t.subtotal;
    cur.total += t.total;
    cur.count += 1;
    invoiceMonthly.set(month, cur);
  }

  return {
    today,
    quoteCount: quotes.length,
    sales: salesByYear,
    customersThisYear: customers,
    frequentlySoldTogether: cosalesPairs,
    quoteVsInvoice: {
      note:
        pairsTotal > pairs.length
          ? `見積もりと、そこから作った請求書(税抜)の比較。全${pairsTotal}件のうち新しい${pairs.length}件だけの集計(全体の合計ではない)`
          : "見積もりと、そこから作った請求書(税抜)の比較",
      summary: {
        count: compareSummary.count,
        totalPairsInDb: pairsTotal,
        quoteSum: compareSummary.quoteSum,
        invoiceSum: compareSummary.invoiceSum,
        increased: compareSummary.increased,
        decreased: compareSummary.decreased,
        unchanged: compareSummary.unchanged,
        notComparable: compareSummary.notComparable,
        oftenAdded: compareSummary.addedRanking,
        oftenRemoved: compareSummary.removedRanking,
      },
      recentPairs: comparePairs,
    },
    invoicesThisYearByMonth: [...invoiceMonthly.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, ...v })),
  };
}

function systemPrompt(pack: object): string {
  return `あなたは建設ICT支援会社「Ark」の社内データ分析アシスタントです。
下の「集計データ」だけを根拠に、日本語で質問に答えてください。

このデータベースの前提(重要):
- 「見積もり」は受注した(成約した)ものだけが登録されている。売上=受注した見積もりの金額。
- 見積もりの金額は税抜。見積もり↔請求書の比較も税抜どうし。
- 諸経費・値引きなどの経費行は、見積もりには登録されない決まり。

答え方のルール:
- 集計データに無いことは推測せず、「このデータからは分かりません」と正直に伝える。
- 金額・件数は集計データの数字を使う(合計・差・割合などの簡単な計算はしてよい)。
- 回答は短い段落と「・」の箇条書きで簡潔に。マークダウンの記号(#、表、太字)は使わない。
- 金額は「1,234,567円」のように3桁区切りで書く。
- 役に立つ場合は最後に1行で、詳しく見られる画面を案内する(例: 分析→見積↔請求タブ、書類ページ)。

集計データ(JSON):
${JSON.stringify(pack)}`;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** 質問(会話の履歴つき)に、集計データを根拠として答える */
export async function answerAnalysisQuestion(
  messages: ChatMessage[],
): Promise<{ text: string } | { error: string }> {
  if (!analysisAiAvailable()) {
    return { error: "AI分析はこの環境では設定されていません。" };
  }

  const pack = await buildAnalysisPack();

  // SDKは使う瞬間に読み込む(通常の画面表示を重くしないため)
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ maxRetries: 1, timeout: 50_000 });

  const model = process.env.ANALYSIS_AI_MODEL || DEFAULT_MODEL;
  // adaptive thinking はClaude 4.6以降の世代だけ。環境変数で古いモデルに
  // 差し替えられてもエラーにならないよう、対応モデルのときだけ指定する
  const supportsAdaptiveThinking = /sonnet-5|fable-5|opus-4-[678]|sonnet-4-6/.test(model);

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      // 集計データ入りの説明は毎回同じなので、キャッシュして2問目以降を安くする
      system: [
        {
          type: "text" as const,
          text: systemPrompt(pack),
          cache_control: { type: "ephemeral" as const },
        },
      ],
      ...(supportsAdaptiveThinking ? { thinking: { type: "adaptive" as const } } : {}),
      messages,
    });
    let text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (text === "") {
      return { error: "AIの答えを受け取れませんでした。もう一度お試しください。" };
    }
    // 長さの上限で答えが途中で切れたときは、切れたことを正直に伝える
    if (response.stop_reason === "max_tokens") {
      text += "\n\n(答えが長くなりすぎたため途中までです。質問を小分けにしてもう一度お試しください)";
    }
    return { text };
  } catch (e) {
    console.error("AI analysis failed:", e);
    return {
      error: "AI分析に失敗しました。少し時間をおいてもう一度お試しください。",
    };
  }
}
