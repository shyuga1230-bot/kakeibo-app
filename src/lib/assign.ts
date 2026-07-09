// 協力会社への振分けの計算(純粋ロジック)。
// 「担当件数」は完了していない案件(未着手・進行中)の数を数える。
import type { ProjectPhase } from "@/lib/project-stages";
import type { Partner } from "@/lib/partners";

export type AssignableProject = {
  partnerName: string | null;
  phase: ProjectPhase;
};

/** 協力会社名ごとの担当件数(完了していない案件の数)。null は未割り当て分 */
export function activeCountByPartner(
  projects: readonly AssignableProject[],
): Map<string | null, number> {
  const counts = new Map<string | null, number>();
  for (const p of projects) {
    if (p.phase === "done") continue;
    const key = p.partnerName ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** 担当件数が少ない順(同数なら名前順)に並べた協力会社一覧 */
export function sortPartnersByLoad(
  partners: readonly Partner[],
  counts: Map<string | null, number>,
): Partner[] {
  return [...partners].sort((a, b) => {
    const diff = (counts.get(a.name) ?? 0) - (counts.get(b.name) ?? 0);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "ja");
  });
}

/** いちばん担当件数が少ない協力会社(振分けの推奨先)。マスタが空なら null */
export function leastLoadedPartner(
  partners: readonly Partner[],
  counts: Map<string | null, number>,
): Partner | null {
  return sortPartnersByLoad(partners, counts)[0] ?? null;
}
