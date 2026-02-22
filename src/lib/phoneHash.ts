import crypto from "crypto";
import * as logger from "./logger";

/**
 * 電話番号の正規化
 * - ハイフン・スペースを削除
 * - 日本国内表記 (090...) は国際表記(+81...) に変換
 * - E.164 に近い形式を返す
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) {
    // 0xxxx -> +81xxxx
    return "+81" + digits.slice(1);
  }
  return digits;
}

/**
 * HMAC-SHA256 を使って決定的に phoneHash を生成する
 * - PHONE_HASH_SECRET が必須
 * - 検索可能（決定的）かつ secret による保護あり
 */
export function phoneToHash(phone: string): string {
  let secret = process.env.PHONE_HASH_SECRET;
  if (!secret) {
    // 開発環境向けのフェールバック: ENABLE_SMS_MOCK=true のときはデバッグ用シークレットを使う
    if (process.env.ENABLE_SMS_MOCK === "true") {
      secret = "debug-phone-hash-secret";
      logger.warn("[phoneToHash] PHONE_HASH_SECRET missing — using debug fallback (ENABLE_SMS_MOCK=true). Set PHONE_HASH_SECRET for production.");
    } else {
      throw new Error("Missing PHONE_HASH_SECRET environment variable");
    }
  }

  const normalized = normalizePhone(phone);
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
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
export const SMS_CODE_EXPIRY_MINUTES = 5;

/**
 * SMS 認証時の電話番号処理フロー例
 */
export async function processSmsAuthentication(
  phone: string
) {
  // ステップ 1: SMS コードを検証（外部サービス呼び出し）
  // const isValidCode = await verifySmsCode(phone, verificationCode);
  // if (!isValidCode) {
  //   throw new Error("Invalid or expired verification code");
  // }

  // ステップ 2: 電話番号をハッシュ化
  const hash = phoneToHash(phone);

  // ステップ 3: DB に保存する際は hash のみ
  // 生の電話番号は絶対に保存しない！
  return {
    phoneHash: hash,
  };
}
