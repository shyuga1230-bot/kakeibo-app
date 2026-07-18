// AI分析(分析 → AIに聞くタブ)。日本語の質問に、集計データを根拠にAIが答える。
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { analysisAiAvailable } from "@/lib/ai-analysis";
import AnalysisTabs from "@/components/AnalysisTabs";
import AnalysisChat from "@/components/AnalysisChat";

export const metadata = { title: "AIに聞く | Ark 見積・案件データベース" };

export default async function AiAnalysisPage() {
  if (!(await getSession())) redirect("/login");

  if (!analysisAiAvailable()) {
    return (
      <div className="space-y-4">
        <AnalysisTabs active="ai" />
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5">
          <p className="flex items-center gap-2 font-medium text-amber-800">
            <TriangleAlert className="h-5 w-5" aria-hidden />
            AI分析は、いまは未設定のため使えません
          </p>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Vercelの環境変数に <code className="font-mono">ANTHROPIC_API_KEY</code>{" "}
            を設定して再デプロイすると、ここで売上や見積もり↔請求の比較について
            日本語で質問できるようになります(見積書のAI読み取りと同じキーを使います)。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnalysisTabs active="ai" />
      <AnalysisChat />
    </div>
  );
}
