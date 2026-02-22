import { NextRequest, NextResponse } from "next/server";
import * as logger from "@/lib/logger";

/**
 * SMS 認証コード検証 API
 * POST /api/auth/sms/verify
 *
 * リクエスト:
 * {
 *   "sessionInfo": "firebase-session-info",
 *   "code": "123456"
 * }
 *
 * レスポンス:
 * {
 *   "success": true,
 *   "userId": "user_id",
 *   "isNewUser": true,
 *   "redirectUrl": "/dashboard"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    let sessionInfo: string;
    let code: string;

    // JSON パース
    try {
      const body = await request.json();
      sessionInfo = body.sessionInfo;
      code = body.code;
    } catch (parseError) {
      logger.error("[SMS Verify] JSON parse error", { error: parseError });
      return NextResponse.json(
        {
          error: "Invalid request body: expected JSON with 'phoneHash' and 'code'",
        },
        { status: 400 }
      );
    }

    // 入力値の検証
    if (!sessionInfo || !code) {
      return NextResponse.json(
        { error: "sessionInfo and verification code are required" },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Delegate to shared verifier
    try {
      const body = await request.json();
      const mode: import("@/lib/smsAuth").VerifyMode = body?.mode === "signin" ? "signin" : "signup";
      const { user, isNewUser } = await (await import("@/lib/smsAuth")).verifySmsCode({ sessionInfo }, code, mode);

      return NextResponse.json(
        {
          success: true,
          userId: user.id,
          isNewUser,
          message: isNewUser ? "Account created successfully" : "Logged in successfully",
          redirectUrl: "/dashboard",
        },
        { status: 200 }
      );
    } catch (e) {
      const err = e as Error & { status?: number };
      const status = err.status ?? 500;
      logger.error("[SMS Verify] verifySmsCode error", { error: err });
      return NextResponse.json({ error: err.message }, { status });
    }
  } catch (error) {
    logger.error("[SMS Verify] Unexpected error", { error });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to verify code",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
