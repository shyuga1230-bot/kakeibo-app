// 動作確認用のサンプルデータ(架空の見積もり20件と案件8件)を投入するスクリプト。
// 実行方法: npm run db:seed
// すでにデータがある場合は追加せずに終了する(--force を付けると追加する)。
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeItemName } from "../src/lib/normalize";
import type { StageKey, StageStatus } from "../src/lib/project-stages";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "環境変数 DATABASE_URL が設定されていません。.env ファイルを確認してください。",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type Seed = {
  date: string;
  customer: string | null;
  memo?: string;
  items: [string, number | null][];
};

// 架空の案件20件(建設ICT商材の想定)
const SEEDS: Seed[] = [
  { date: "2026-04-02", customer: "山田建設", items: [["3D起工測量", 480000], ["ICT建機レンタル", 1200000], ["操作講習", 80000]] },
  { date: "2026-04-05", customer: "佐藤工務店", items: [["3D起工測量", 450000], ["ICT建機レンタル", 980000]] },
  { date: "2026-04-09", customer: null, items: [["操作講習", 80000]] },
  { date: "2026-04-12", customer: "高橋土木", memo: "河川改修の現場", items: [["3D起工測量", 520000], ["出来形管理ソフト", 300000]] },
  { date: "2026-04-16", customer: "伊藤組", items: [["ICT建機レンタル", 1500000], ["操作講習", 120000]] },
  { date: "2026-04-21", customer: "渡辺建設", items: [["3D起工測量", 460000], ["ICT建機レンタル", 1100000], ["出来形管理ソフト", 280000]] },
  { date: "2026-04-25", customer: null, items: [["ドローン空撮", 150000]] },
  { date: "2026-05-01", customer: "中村工業", items: [["3D起工測量", 500000], ["ドローン空撮", 180000]] },
  { date: "2026-05-07", customer: "小林建設", items: [["ICT建機レンタル", 2100000], ["操作講習", 90000], ["出来形管理ソフト", 310000]] },
  { date: "2026-05-10", customer: "加藤組", items: [["3D起工測量", 470000], ["ICT建機レンタル", 1250000], ["操作講習", 85000]] },
  { date: "2026-05-14", customer: null, memo: "リピート案件", items: [["出来形管理ソフト", 290000]] },
  { date: "2026-05-19", customer: "吉田土建", items: [["3D起工測量", 510000], ["ICT建機レンタル", null]] },
  { date: "2026-05-23", customer: "山本開発", items: [["ドローン空撮", 160000], ["3D起工測量", 490000]] },
  { date: "2026-05-28", customer: "松本建設", items: [["ICT建機レンタル", 1350000], ["出来形管理ソフト", 300000]] },
  { date: "2026-06-02", customer: "井上工務店", items: [["3D起工測量", 455000], ["ICT建機レンタル", 1180000], ["操作講習", 80000], ["出来形管理ソフト", 295000]] },
  { date: "2026-06-06", customer: null, items: [["操作講習", 75000], ["出来形管理ソフト", null]] },
  { date: "2026-06-11", customer: "木村土木", memo: "見積のみ→受注", items: [["3D起工測量", 530000], ["ドローン空撮", 170000], ["ICT建機レンタル", 1400000]] },
  { date: "2026-06-15", customer: "林建設", items: [["ICT建機レンタル", 990000], ["操作講習", 88000]] },
  { date: "2026-06-20", customer: "清水組", items: [["3D起工測量", 475000], ["ICT建機レンタル", 1220000], ["操作講習", 82000]] },
  { date: "2026-06-24", customer: "森田興業", items: [["出来形管理ソフト", 305000], ["操作講習", 78000]] },
];

// 架空の案件8件(案件管理表の動作確認用)。
// stages は「工程キー: [状態, 日付]」。書いていない工程は未着手のまま。
type ProjectSeed = {
  client: string | null;
  partner: string | null;
  name: string;
  memo?: string;
  stages: Partial<Record<StageKey, [StageStatus, string | null]>>;
};

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    client: "山田建設",
    partner: "青空測量",
    name: "国道○号 道路改良工事",
    memo: "起工測量の成果待ち。6月末までにICONファイル納品予定。",
    stages: {
      contractor_data: ["done", "2026-05-10"],
      ark_estimate: ["done", "2026-05-14"],
      estimate_proposal: ["done", "2026-05-20"],
      utilization_plan: ["done", "2026-05-28"],
      engineer_meeting: ["done", "2026-06-03"],
      government_estimate: ["not_applicable", null],
      construction_plan: ["done", "2026-06-10"],
      groundbreaking_survey: ["done", "2026-06-18"],
      survey_deliverable: ["in_progress", "2026-06-24"],
    },
  },
  {
    client: "佐藤工務店",
    partner: null,
    name: "△△川 河川改修工事",
    stages: {
      contractor_data: ["done", "2026-06-01"],
      ark_estimate: ["done", "2026-06-05"],
      estimate_proposal: ["in_progress", "2026-06-09"],
    },
  },
  {
    client: "高橋土木",
    partner: "青空測量",
    name: "□□団地 造成工事",
    memo: "技術者打合せは現場事務所で実施予定。",
    stages: {
      contractor_data: ["done", "2026-05-22"],
      ark_estimate: ["done", "2026-05-26"],
      estimate_proposal: ["done", "2026-06-02"],
      utilization_plan: ["in_progress", "2026-06-16"],
      engineer_meeting: ["in_progress", "2026-06-20"],
    },
  },
  {
    client: "伊藤組",
    partner: "ひかりドローンサービス",
    name: "市道◇◇線 舗装補修工事",
    stages: {
      contractor_data: ["in_progress", "2026-06-25"],
    },
  },
  {
    client: "渡辺建設",
    partner: null,
    name: "○○排水路 整備工事",
    memo: "全工程完了。竣工後の追加提案を検討中。",
    stages: {
      contractor_data: ["done", "2026-04-03"],
      ark_estimate: ["done", "2026-04-08"],
      estimate_proposal: ["done", "2026-04-15"],
      utilization_plan: ["done", "2026-04-22"],
      engineer_meeting: ["done", "2026-04-30"],
      government_estimate: ["done", "2026-05-08"],
      construction_plan: ["done", "2026-05-15"],
      groundbreaking_survey: ["done", "2026-05-22"],
      survey_deliverable: ["done", "2026-05-29"],
      construction_data: ["done", "2026-06-05"],
      asbuilt_survey: ["done", "2026-06-12"],
      icon_file: ["done", "2026-06-19"],
      after_follow: ["done", "2026-06-26"],
    },
  },
  {
    client: "中村工業",
    partner: "青空測量",
    name: "△△地区 圃場整備工事",
    stages: {
      contractor_data: ["done", "2026-06-12"],
      ark_estimate: ["in_progress", "2026-06-18"],
    },
  },
  {
    client: "小林建設",
    partner: null,
    name: "◇◇トンネル 取付道路工事",
    memo: "役所見積の回答待ち。",
    stages: {
      contractor_data: ["done", "2026-05-30"],
      ark_estimate: ["done", "2026-06-04"],
      estimate_proposal: ["done", "2026-06-11"],
      utilization_plan: ["done", "2026-06-17"],
      engineer_meeting: ["done", "2026-06-20"],
      government_estimate: ["in_progress", "2026-06-24"],
    },
  },
  {
    client: null,
    partner: null,
    name: "(仮)○○地区 宅地造成",
    memo: "受注前の相談段階。社名は確定後に入力する。",
    stages: {},
  },
];

async function seedProjects(force: boolean): Promise<void> {
  // 見積もりだけ運用中のデータベースに、案件のサンプルが紛れ込まないように
  // 「どちらかにデータがあればスキップ」とする
  const [existingProjects, existingQuotes] = await Promise.all([
    prisma.project.count(),
    prisma.quote.count(),
  ]);
  if ((existingProjects > 0 || existingQuotes > 0) && !force) {
    console.log(
      "すでにデータが登録されているため、案件のサンプルは追加しませんでした。",
    );
    return;
  }
  // 協力会社マスタ(振分け先の候補。担当ゼロの会社も1社入れておく)
  await prisma.partner.createMany({
    data: [
      { name: "青空測量" },
      { name: "ひかりドローンサービス" },
      { name: "大地ICTサポート" },
    ],
    skipDuplicates: true,
  });

  for (const seed of PROJECT_SEEDS) {
    await prisma.project.create({
      data: {
        clientName: seed.client,
        partnerName: seed.partner,
        projectName: seed.name,
        memo: seed.memo ?? null,
        stages: {
          create: Object.entries(seed.stages).map(([stageKey, [status, date]]) => ({
            stageKey,
            status,
            date,
          })),
        },
        logs: { create: { action: "案件を登録しました(サンプルデータ)" } },
      },
    });
  }
  console.log(`案件のサンプルデータ ${PROJECT_SEEDS.length} 件を登録しました。`);
}

async function main() {
  const force = process.argv.includes("--force");
  await seedProjects(force);
  const existing = await prisma.quote.count();
  if (existing > 0 && !force) {
    console.log(
      `すでに ${existing} 件の見積もりが登録されているため、サンプルデータは追加しませんでした。`,
    );
    console.log("それでも追加したい場合: npx tsx scripts/seed.ts --force");
    return;
  }

  // 商品マスタにも代表的な商品を登録しておく(標準金額付き)
  const masterItems: [string, number | null][] = [
    ["3D起工測量", 480000],
    ["ICT建機レンタル", 1200000],
    ["操作講習", 80000],
    ["出来形管理ソフト", 300000],
    ["ドローン空撮", 160000],
  ];
  await prisma.item.createMany({
    data: masterItems.map(([name, defaultAmount]) => ({ name, defaultAmount })),
    skipDuplicates: true,
  });

  for (const seed of SEEDS) {
    await prisma.quote.create({
      data: {
        quoteDate: seed.date,
        customerName: seed.customer,
        memo: seed.memo ?? null,
        items: {
          create: seed.items.map(([name, amount]) => ({
            itemName: normalizeItemName(name),
            amount,
          })),
        },
      },
    });
  }
  console.log(`サンプルデータ ${SEEDS.length} 件と商品マスタを登録しました。`);
}

main()
  .catch((e) => {
    console.error("サンプルデータの投入に失敗しました:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
