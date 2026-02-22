import { NextRequest, NextResponse } from "next/server";
import { sendSmsVerification } from "@/lib/smsAuth";
import * as logger from "@/lib/logger"; 

/**
 * [DEBUG] SMS 認証コード送信 API
 * POST /api/debug/sms/send
 *
 * ⚠️ 一時的なデバッグ用エンドポイント
 * 本番環境では削除予定。正式なログインは Google / Twitter OAuth を使用する。
 *
 * 処理フロー:
 * 1. Request から電話番号を受け取る
 * 2. crypto モジュールで SHA-256 ハッシュ化して phoneHash を生成
 * 3. prisma.verificationToken に identifier を phoneHash として、ランダムな6桁コードと有効期限（10分）を保存
 * 4. 保存に成功したら、lib/sms.ts の sendVerificationCode を呼び出す
 * 5. 開発環境でも DB 保存は実際に実行（一貫性を保証）
 *
 * リクエスト:
 * {
 *   "phone": "09012345678"
 * }
 *
 * レスポンス (成功):
 * {
 *   "success": true,
 *   "phoneHash": "sha256...",
 *   "expiresIn": 600,
 *   "isNewUser": true,
 *   "message": "Verification code sent to your phone"
 * }
 *
 * レスポンス (エラー):
 * {
 *   "error": "Invalid phone number format"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ステップ 1: Request から電話番号を受け取る
    let phone: string;
    try {
      const body = await request.json();
      phone = body.phone;
      logger.info("[Debug SMS Send] Request body parsed", { 
        bodyKeys: Object.keys(body),
        phone: phone ? `${phone.substring(0, 3)}***` : "empty/missing"
      });
    } catch (parseError) {
      logger.error("[Debug SMS Send] JSON parse error", { error: parseError });
      return NextResponse.json(
        { error: "Invalid request body: expected JSON with 'phone' field" },
        { status: 400 }
      );
    }

    // 入力値の検証
    if (!phone || typeof phone !== "string") {
      logger.warn("[Debug SMS Send] Invalid phone input", { 
        phoneExists: !!phone,
        phoneType: typeof phone,
        phoneLength: phone?.length,
        phoneValue: phone ? `${String(phone).substring(0, 3)}***` : "empty/null"
      });
      return NextResponse.json(
        { error: "Valid phone number is required" },
        { status: 400 }
      );
    }

    // 電話番号のフォーマット検証（日本の携帯電話を想定）
    // Examples accepted:
    //   - 09012345678 (10 digits)
    //   - 090-1234-5678 (with hyphens)
    //   - +81901234567 (international format, 11 digits after +81)
    //   - +81 90 1234 5678 (with spaces)
    const cleanedPhone = phone.replace(/[\s\-]/g, "");
    const phoneRegex = /^(0\d{9,10}|\+81\d{9,10})$/;
    if (!phoneRegex.test(cleanedPhone)) {
      logger.warn("[Debug SMS Send] Invalid phone format", { 
        originalPhone: phone ? `${phone.substring(0, 3)}***` : "empty",
        cleanedPhone: cleanedPhone ? `${cleanedPhone.substring(0, 3)}***` : "empty",
        pattern: "expects 0X0XXXXXXXX or +81XXXXXXXXXXX"
      });
      return NextResponse.json(
        { error: "Invalid phone number format (expected: 09012345678 or +81901234567)" },
        { status: 400 }
      );
    }

    logger.info("[Debug SMS Send] Phone validation passed, calling sendSmsVerification", {
      cleanedPhonePrefix: cleanedPhone.substring(0, 3),
      cleanedPhoneLength: cleanedPhone.length
    });

    // Use shared helper to send verification
    let sendResult;
    try {
      sendResult = await sendSmsVerification(phone);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      const status = (err as unknown as { status?: number }).status ?? 429;
      return NextResponse.json({ error: err.message }, { status });
    }

    const { phoneHash, isNewUser, expiresIn, sessionInfo } = sendResult;

    // レスポンス: クライアント側に返す（生の電話番号は含めない！）
    return NextResponse.json(
      {
        success: true,
        phoneHash, // ハッシュ値のみ返す
        expiresIn,
        isNewUser, // 新規ユーザーかどうか
        sessionInfo,
        message: "Verification code sent to your phone",
      },
      { status: 200 }
    );
  } catch (error) {
    // 予期しないエラーをキャッチ
    logger.error("[Debug SMS Send] Unexpected error", { error });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to send verification code",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
