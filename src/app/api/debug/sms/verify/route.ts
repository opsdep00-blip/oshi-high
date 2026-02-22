import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { phoneToHash } from "@/lib/phoneHash";

/**
 * [DEBUG] SMS 認証コード検証 API
 * POST /api/debug/sms/verify
 *
 * ⚠️ 一時的なデバッグ用エンドポイント
 * 本番環境では削除予定。正式なログインは Google / Twitter OAuth を使用する。
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
  logger.debug("[Debug SMS Verify] Request received");
  try {
    let sessionInfo: string | undefined;
    let code: string;
    let phone: string | undefined;

    // JSON パース
    let mode: "signin" | "signup" | undefined;
    try {
      const body = await request.json();
      sessionInfo = body.sessionInfo;
      code = body.code;
      phone = body.phone;
      mode = body?.mode;
      logger.debug("[Debug SMS Verify] Parsed body", { sessionInfo: !!sessionInfo, code: !!code, phone: !!phone, mode });
    } catch (parseError) {
      logger.error("[Debug SMS Verify] JSON parse error", { error: parseError });
      return NextResponse.json(
        {
          error: "Invalid request body: expected JSON with 'sessionInfo' and 'code'",
        },
        { status: 400 }
      );
    }

    // 入力値の検証
    const isMock = process.env.ENABLE_SMS_MOCK === "true";
    if (!isMock && !sessionInfo) {
      return NextResponse.json(
        { error: "sessionInfo is required when not in mock mode" },
        { status: 400 }
      );
    }
    if (!code) {
      return NextResponse.json(
        { error: "verification code is required" },
        { status: 400 }
      );
    }

    // phoneHash の生成（モックモード用）
    let phoneHash: string | undefined;
    if (isMock && phone) {
      try {
        phoneHash = phoneToHash(phone);
        logger.debug("[Debug SMS Verify] Generated phoneHash", { phoneHash });
      } catch (hashError) {
        logger.error("[Debug SMS Verify] Hashing error", { error: hashError });
        return NextResponse.json(
          { error: "Failed to hash phone number" },
          { status: 500 }
        );
      }
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Delegate to shared verifier: mock mode uses phone, production uses sessionInfo
    try {
      const modeArg: import("@/lib/smsAuth").VerifyMode = mode === "signin" ? "signin" : "signup";
      const verifyArg = isMock ? { phone } : { sessionInfo };

      // If user is signed in, prefer linking the verified phone to current user
      let currentUserId: string | undefined;
      try {
        const { auth } = await import("@/auth");
        const session = await auth();
        currentUserId = session?.user?.id as string | undefined;
      } catch {
        // ignore - if auth is unavailable, fallback to normal behaviour
      }

      const { user, isNewUser } = await (await import("@/lib/smsAuth")).verifySmsCode(verifyArg, code, modeArg, currentUserId);

      return NextResponse.json(
        {
          success: true,
          userId: user.id,
          isNewUser,
          message: isNewUser ? "Account created successfully" : "Logged in successfully",
          redirectUrl: `/debug/sms/success?userId=${user.id}&isNewUser=${isNewUser}`,
        },
        { status: 200 }
      );
    } catch (e) {
      const err = e as Error & { status?: number };
      const status = err.status ?? 500;
      logger.error("[Debug SMS Verify] verifySmsCode error", { error: err });
      return NextResponse.json({ error: err.message }, { status });
    }


  } catch (error) {
    logger.error("[Debug SMS Verify] Unexpected error", { error });
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
