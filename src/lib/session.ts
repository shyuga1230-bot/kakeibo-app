// ログイン状態(セッション)の管理。
// 全社共通パスワードでログインすると、署名付きのトークンを Cookie に保存する。
// 将来ユーザー別アカウントに拡張できるよう、トークンには user 欄を持たせている。
import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  SESSION_COOKIE_NAME,
  SESSION_DAYS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

function cookieSecure(): boolean {
  // 社内ネットワークで http のまま運用する場合は SESSION_COOKIE_SECURE=false にする
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(name?: string): Promise<void> {
  const token = await createSessionToken({ user: "shared", name });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * ログイン済みかどうかを確認する。1回のリクエスト内では結果を使い回す。
 * ページ・サーバー処理・APIすべてで、処理の最初に必ず呼ぶこと
 * (フォーム経由でなくても直接呼び出せてしまうため)。
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  return await verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
});
