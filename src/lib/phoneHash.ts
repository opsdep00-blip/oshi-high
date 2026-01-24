import crypto from "crypto";

/**
 * 電話番号をソルト付きでハッシュ化する関数
 * @param phone - 平文の電話番号
 * @param salt - ユーザーごとのユニークなソルト（未指定の場合は新規生成）
 * @returns { hash: string, salt: string } ハッシュ値とソルト
 *
 * ⚠️ 重要: 生の電話番号はDBに保存しないこと！
 */
export function hashPhoneNumber(
  phone: string,
  salt?: string
): { hash: string; salt: string } {
  // ソルトが未指定の場合は、ユーザーごとにユニークなソルトを生成
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");

  // SHA-256 でハッシュ化（phone + salt）
  const hash = crypto
    .createHash("sha256")
    .update(phone + finalSalt)
    .digest("hex");

  return { hash, salt: finalSalt };
}

/**
 * 電話番号とハッシュの検証（ログイン時の照合）
 * @param phone - ユーザーが入力した電話番号
 * @param storedHash - DBに保存されたハッシュ値
 * @param storedSalt - DBに保存されたソルト
 * @returns 一致しているかどうか
 */
export function verifyPhoneNumber(
  phone: string,
  storedHash: string,
  storedSalt: string
): boolean {
  const { hash } = hashPhoneNumber(phone, storedSalt);
  return hash === storedHash;
}

/**
 * 6桁のランダムな数値コードを生成
 * @returns 6桁のコード（例：123456）
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * SMS コード有効期限（分）
 */
export const SMS_CODE_EXPIRY_MINUTES = 10;

/**
 * SMS 認証時の電話番号処理フロー例
 */
export async function processSmsAuthentication(
  phone: string,
  verificationCode: string
) {
  // ステップ 1: SMS コードを検証（外部サービス呼び出し）
  // const isValidCode = await verifySmsCode(phone, verificationCode);
  // if (!isValidCode) {
  //   throw new Error("Invalid or expired verification code");
  // }

  // ステップ 2: 電話番号をハッシュ化
  const { hash, salt } = hashPhoneNumber(phone);

  // ステップ 3: DB に保存する際は hash と salt のみ
  // 生の電話番号は絶対に保存しない！
  return {
    phoneHash: hash,
    phoneSalt: salt,
    // ⚠️ ここに phone を返してはいけない！
  };
}
