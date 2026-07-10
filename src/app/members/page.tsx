// 社員名簿。ここに登録した名前が、ログイン画面のプルダウンに出る。
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { listMembers } from "@/lib/members";
import MemberManager from "@/components/MemberManager";

export const metadata = { title: "社員名簿 | Ark 見積・案件データベース" };

export default async function MembersPage() {
  if (!(await getSession())) redirect("/login");

  const members = await listMembers();

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5 text-slate-400" aria-hidden />
          社員名簿
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          ここに社員の名前を登録しておくと、ログイン画面の「お名前」が
          <b>プルダウンで選ぶだけ</b>になります。
          「山田」「山田さん」のような表記ゆれを防いで、誰がやったかの記録がきれいに揃います。
        </p>
        <div className="mt-4">
          <MemberManager members={members} />
        </div>
      </section>
    </div>
  );
}
