// 認証ゲート(このNext.jsでは middleware ではなく proxy という名前)。
// ログインしていない人がページを開いたらログイン画面へ案内する。
// ここでの確認は「入口での簡易チェック」であり、
// 本当の確認は各ページ・各サーバー処理の中でも行っている。
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  const isLoginPage = pathname === "/login";

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // 静的ファイルと API には適用しない(API は各処理の中で自らチェックする)
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|sw\\.js|robots\\.txt).*)"],
};
