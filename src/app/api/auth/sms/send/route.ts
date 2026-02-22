import { NextRequest, NextResponse } from "next/server";
import { sendSmsVerification } from "@/lib/smsAuth";
import * as logger from "@/lib/logger";

/**
 * SMS 認証コード送信 API
 * POST /api/auth/sms/send
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
    } catch (parseError) {
      logger.error("[SMS Send] JSON parse error", { error: parseError });
      return NextResponse.json(
        { error: "Invalid request body: expected JSON with 'phone' field" },
        { status: 400 }
      );
    }

    // 入力値の検証
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Valid phone number is required" },
        { status: 400 }
      );
    }

    // 電話番号のフォーマット検証（日本の携帯電話を想定）
    const phoneRegex = /^(0\d{9,10}|(\+81)?[\d\-]{10,11})$/;
    if (!phoneRegex.test(phone.replace(/-/g, ""))) {
      return NextResponse.json(
        { error: "Invalid phone number format (expected: 09012345678)" },
        { status: 400 }
      );
    }

    // ステップ 2: SHA-256 でハッシュ化
    // 注: VerificationToken には salt なしの単純なハッシュを使用
    // （毎回同じハッシュを生成する必要があるため）
    // Delegate sending logic to shared helper
    let sendResult;
    try {
      sendResult = await sendSmsVerification(phone);
    } catch (e) {
      const err = e as Error & { status?: number };
      return NextResponse.json({ error: err.message }, { status: err.status ?? 429 });
    }

    const { phoneHash, isNewUser, expiresIn, sessionInfo } = sendResult;

    // レスポンス: クライアント側に返す（生の電話番号は含めない！）
    return NextResponse.json(
      {
        success: true,
        phoneHash, // ハッシュ値のみ返す
        expiresIn,
        isNewUser,
        sessionInfo,
        message: "Verification code sent to your phone",
      },
      { status: 200 }
    );
  } catch (error) {
    // 予期しないエラーをキャッチ
    logger.error("[SMS Send] Unexpected error", { error });
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
