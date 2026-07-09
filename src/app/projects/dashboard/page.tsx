// 案件管理のダッシュボード。件数のサマリー、工程ごとの状況、
// 「いま止まっている工程」、協力会社別・社名別の件数を表示する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";
import { getSession } from "@/lib/session";
import { listProjects, type ProjectWithStages } from "@/lib/projects";
import {
  STAGES,
  STATUSES,
  countByPhase,
  stageState,
  type StageKey,
  type StageStatus,
} from "@/lib/project-stages";
import ProjectsTabs from "@/components/ProjectsTabs";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata = { title: "案件ダッシュボード | Ark 見積・案件データベース" };

/** ラベル+件数の小さなカード */
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/** 会社名ごとの件数表(協力会社別・社名別で共通) */
function CompanyTable({
  title,
  intro,
  rows,
  emptyLabel,
}: {
  title: string;
  intro: string;
  rows: { name: string | null; total: number; inProgress: number; done: number }[];
  emptyLabel: string;
}) {
  const top = rows.slice(0, 10);
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{intro}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 font-medium">会社名</th>
                <th className="py-1 text-right font-medium">案件数</th>
                <th className="py-1 text-right font-medium">進行中</th>
                <th className="py-1 text-right font-medium">完了</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <tr key={row.name ?? "__none__"} className="border-t border-slate-100">
                  <td className="min-w-0 break-words py-1.5">
                    {row.name ?? <span className="text-slate-400">(未設定)</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{row.total}</td>
                  <td className="py-1.5 text-right tabular-nums text-amber-700">
                    {row.inProgress}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-green-700">{row.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && (
            <p className="mt-2 text-xs text-slate-400">件数の多い上位10社を表示しています。</p>
          )}
        </>
      )}
    </section>
  );
}

/** 会社名ごとに件数を集計する(協力会社別・社名別で共通) */
function countByCompany(
  projects: ProjectWithStages[],
  pick: (p: ProjectWithStages) => string | null,
) {
  const map = new Map<string | null, { total: number; inProgress: number; done: number }>();
  for (const p of projects) {
    const name = pick(p);
    const entry = map.get(name) ?? { total: 0, inProgress: 0, done: 0 };
    entry.total += 1;
    if (p.phase === "done") entry.done += 1;
    if (p.phase === "in_progress") entry.inProgress += 1;
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.total - a.total || (a.name ?? "").localeCompare(b.name ?? "", "ja"));
}

export default async function ProjectsDashboardPage() {
  if (!(await getSession())) redirect("/login");

  const projects = await listProjects();

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <AutoRefresh />
        <ProjectsTabs active="dashboard" />
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5">
          <p className="text-slate-600">まだ案件が登録されていません。</p>
          <p className="mt-1 text-sm text-slate-500">
            案件がたまると、ここで工程ごとの状況や止まっている案件を確認できます。
          </p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-blue-600 to-blue-700 shadow-sm shadow-blue-900/20 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800"
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            一覧表で最初の案件を登録する
          </Link>
        </div>
      </div>
    );
  }

  // 件数サマリー
  const phaseCounts = countByPhase(projects);

  // 工程ごとの状態別件数(積み上げバー用)
  const stageCounts = STAGES.map((stage) => {
    const counts: Record<StageStatus, number> = {
      not_started: 0,
      in_progress: 0,
      done: 0,
      not_applicable: 0,
    };
    for (const p of projects) counts[stageState(p.stages, stage.key).status] += 1;
    return { stage, counts };
  });

  // 「いま止まっている工程」= 未完了の案件が現在どの工程にいるか
  const bottleneckMap = new Map<StageKey, number>();
  for (const p of projects) {
    if (p.phase === "done" || !p.currentStage) continue;
    bottleneckMap.set(p.currentStage, (bottleneckMap.get(p.currentStage) ?? 0) + 1);
  }
  const bottleneckCounts = STAGES.map((stage) => ({
    stage,
    count: bottleneckMap.get(stage.key) ?? 0,
  }));
  const maxBottleneck = Math.max(1, ...bottleneckCounts.map((b) => b.count));

  const total = projects.length;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <ProjectsTabs active="dashboard" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="案件数(全体)" value={`${total}件`} />
        <StatTile label="未着手" value={`${phaseCounts.not_started}件`} />
        <StatTile label="進行中" value={`${phaseCounts.in_progress}件`} />
        <StatTile
          label="完了"
          value={`${phaseCounts.done}件`}
          sub={`完了率 ${Math.round((phaseCounts.done / total) * 100)}%`}
        />
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">いま止まっている工程</h2>
        <p className="mt-1 text-sm text-slate-600">
          未完了の案件が、いまどの工程で止まっているかの件数です。棒が長い工程に仕事がたまっています。
        </p>
        <div className="mt-4 space-y-1.5">
          {bottleneckCounts.map(({ stage, count }) => (
            <div key={stage.key} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-right text-xs text-slate-600">
                {stage.label}
              </span>
              <div className="h-4 flex-1 rounded bg-slate-50">
                <div
                  className="h-full rounded bg-gradient-to-r from-blue-500 to-indigo-600"
                  style={{ width: `${(count / maxBottleneck) * 100}%` }}
                  role="img"
                  aria-label={`${stage.label}で止まっている案件 ${count}件`}
                />
              </div>
              <span
                className={`w-10 shrink-0 text-right text-xs tabular-nums ${
                  count === 0 ? "text-slate-300" : "text-slate-700"
                }`}
              >
                {count}件
              </span>
            </div>
          ))}
          <p className="pt-1 text-xs text-slate-400">
            すべての工程が完了した案件: {phaseCounts.done}件
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="text-lg font-bold">工程別の状況</h2>
        <p className="mt-1 text-sm text-slate-600">
          全{total}件の案件が、工程ごとにどの状態かの内訳です。
        </p>
        {/* 色の凡例 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {STATUSES.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.barClass}`} aria-hidden />
              {s.label}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {stageCounts.map(({ stage, counts }) => {
            const breakdown = STATUSES.map((s) => `${s.label}${counts[s.key]}件`).join("・");
            return (
              <div key={stage.key} className="flex items-center gap-2" title={breakdown}>
                <span className="w-28 shrink-0 text-right text-xs text-slate-600">
                  {stage.label}
                </span>
                <div
                  className="flex h-4 flex-1 gap-0.5"
                  role="img"
                  aria-label={`${stage.label}: ${breakdown}`}
                >
                  {STATUSES.map((s) => {
                    const count = counts[s.key];
                    if (count === 0) return null;
                    const percent = (count / total) * 100;
                    return (
                      <div
                        key={s.key}
                        className={`flex h-full items-center justify-center rounded-sm ${s.barClass}`}
                        style={{ width: `${percent}%` }}
                      >
                        {percent >= 12 && (
                          <span
                            className={`text-[10px] tabular-nums ${
                              s.key === "done"
                                ? "text-white"
                                : s.key === "in_progress"
                                  ? "text-amber-950"
                                  : s.key === "not_applicable"
                                    ? "text-slate-800"
                                    : "text-slate-500"
                            }`}
                            aria-hidden
                          >
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompanyTable
          title="協力会社別の案件数"
          intro="Arkが業務を依頼している外注先ごとの件数です。"
          rows={countByCompany(projects, (p) => p.partnerName)}
          emptyLabel="協力会社が入力された案件はまだありません。"
        />
        <CompanyTable
          title="社名(顧客)別の案件数"
          intro="顧客(施工会社)ごとの件数です。"
          rows={countByCompany(projects, (p) => p.clientName)}
          emptyLabel="社名が入力された案件はまだありません。"
        />
      </div>
    </div>
  );
}
