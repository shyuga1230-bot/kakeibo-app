// 一覧表(クライアント)へ渡す案件データの形と変換。
// 型だけをサーバー側から借りるため、クライアントからも安全にimportできる。
import type { ProjectWithStages } from "@/lib/projects";
import type { ProjectPhase, StageStateMap } from "@/lib/project-stages";

export type BoardProject = {
  id: number;
  clientName: string | null;
  partnerName: string | null;
  projectName: string;
  memo: string | null;
  phase: ProjectPhase;
  progress: { done: number; applicable: number; percent: number };
  stages: StageStateMap;
};

export function toBoardProject(p: ProjectWithStages): BoardProject {
  return {
    id: p.id,
    clientName: p.clientName,
    partnerName: p.partnerName,
    projectName: p.projectName,
    memo: p.memo,
    phase: p.phase,
    progress: p.progress,
    stages: p.stages,
  };
}
