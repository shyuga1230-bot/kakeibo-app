// セッショントークン(署名付き)の作成・検証。
// proxy.ts(認証ゲート)とサーバー処理の両方から使うため、
// Cookie の読み書きはここでは行わない。
import { scryptSync } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DAYS = 30;

export type SessionPayload = {
  // 現在は全員共通の "shared"。ユーザー別アカウント化するときはここにIDを入れる
  user: string;
};

// 鍵の計算(scrypt)は重い処理なので、一度計算したら使い回す
let cachedKey: { source: string; key: Uint8Array } | null = null;

function getSecretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    return new TextEncoder().encode(`quote-cosales-session:${secret}`);
  }
  // SESSION_SECRET が未設定の場合は APP_PASSWORD から鍵を作る。
  // パスワードの生値をそのまま鍵にすると、漏れたCookieからパスワードを
  // 総当たりで割り出せてしまうため、scrypt(時間のかかる計算)で導出する。
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  if (cachedKey?.source !== password) {
    cachedKey = {
      source: password,
      key: new Uint8Array(scryptSync(password, "quote-cosales-session-v1", 32)),
    };
  }
  return cachedKey.key;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const key = getSecretKey();
  if (!key) {
    throw new Error(
      "環境変数 APP_PASSWORD が設定されていません。.env ファイルを確認してください(README「初期設定」参照)。",
    );
  }
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  const key = getSecretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.user !== "string") return null;
    return { user: payload.user };
  } catch {
    return null;
  }
}
