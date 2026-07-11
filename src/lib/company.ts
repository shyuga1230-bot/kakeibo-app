// 自社情報(納品書・請求書に印字する会社名・住所・振込先など)のデータ層。
// 1行だけ(id=1)を使い回すシンプルな作り。
import "server-only";
import { getPrisma } from "@/lib/db";

export type CompanyInfo = {
  name: string;
  postal: string | null;
  address: string | null;
  tel: string | null;
  fax: string | null;
  email: string | null;
  invoiceRegNo: string | null;
  bankInfo: string | null;
};

export const EMPTY_COMPANY: CompanyInfo = {
  name: "",
  postal: null,
  address: null,
  tel: null,
  fax: null,
  email: null,
  invoiceRegNo: null,
  bankInfo: null,
};

/** 自社情報。まだ設定されていなければ空の内容を返す */
export async function getCompany(): Promise<CompanyInfo> {
  const row = await getPrisma().companySetting.findUnique({ where: { id: 1 } });
  if (!row) return EMPTY_COMPANY;
  return {
    name: row.name,
    postal: row.postal,
    address: row.address,
    tel: row.tel,
    fax: row.fax,
    email: row.email,
    invoiceRegNo: row.invoiceRegNo,
    bankInfo: row.bankInfo,
  };
}

/** 自社情報を保存する(初回は作成、2回目からは上書き) */
export async function saveCompany(info: CompanyInfo): Promise<void> {
  await getPrisma().companySetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...info },
    update: info,
  });
}
