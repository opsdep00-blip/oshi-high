import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SMS_CODE_EXPIRY_MINUTES, generateVerificationCode } from "@/lib/phoneHash";
import { sendVerificationCode } from "@/lib/sms";

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
      console.error("[SMS Send] JSON parse error:", parseError);
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
    let phoneHash: string;
    try {
      phoneHash = crypto.createHash("sha256").update(phone).digest("hex");
      console.log("=== [Send] phoneHash ===", phoneHash);
    } catch (hashError) {
      console.error("[SMS Send] Hashing error:", hashError);
      return NextResponse.json(
        { error: "Failed to hash phone number" },
        { status: 500 }
      );
    }

    // 既存ユーザーをチェック（新規判定用）
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { phoneHash },
      });
    } catch (dbError) {
      console.error("[SMS Send] Database lookup error:", dbError);
      return NextResponse.json(
        { error: "Database error while checking user" },
        { status: 500 }
      );
    }

    const provider = (process.env.SMS_PROVIDER || "twilio").toLowerCase();
    const isMock = process.env.ENABLE_SMS_MOCK === "true";
    const useFirebase = !isMock && provider === "firebase";

    // Firebase の場合は Firebase 側が OTP を生成するのでコード生成・DB保存はスキップ
    // Twilio など自前 OTP 送信時のみコード生成＋VerificationToken 保存
    let verificationCode: string | undefined;
    if (!useFirebase) {
      try {
        verificationCode = generateVerificationCode();
      } catch (codeError) {
        console.error("[SMS Send] Code generation error:", codeError);
        return NextResponse.json(
          { error: "Failed to generate verification code" },
          { status: 500 }
        );
      }

      const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRY_MINUTES * 60 * 1000);

      try {
        await prisma.verificationToken.upsert({
          where: {
            identifier_token: {
              identifier: phoneHash,
              token: verificationCode,
            },
          },
          update: {
            expires: expiresAt,
          },
          create: {
            identifier: phoneHash,
            token: verificationCode,
            type: "sms",
            expires: expiresAt,
          },
        });
      } catch (dbCreateError) {
        console.error("[SMS Send] Database create/update error:", dbCreateError);
        return NextResponse.json(
          { error: "Failed to save verification token to database" },
          { status: 500 }
        );
      }
    }

    // ステップ 4: lib/sms.ts の sendVerificationCode を呼び出す
    // 開発時: コンソールに出力（ENABLE_SMS_MOCK=true）
    // 本番時: 実際の SMS プロバイダーで送信
    let smsResult: { sessionInfo?: string } | undefined;
    try {
      smsResult = await sendVerificationCode({ phoneHash, phone, code: verificationCode ?? "" });
    } catch (smsError) {
      console.error("[SMS Send] SMS sending error:", smsError);
      // SMS送信に失敗しても、トークンは保存されているので続ける
      // ただし、本番環境では重要なエラーなので記録
      if (process.env.ENABLE_SMS_MOCK !== "true") {
        return NextResponse.json(
          { error: "Failed to send SMS verification code" },
          { status: 500 }
        );
      }
      // 開発環境ではモック失敗を許容
    }

    // レスポンス: クライアント側に返す（生の電話番号は含めない！）
    return NextResponse.json(
      {
        success: true,
        phoneHash, // ハッシュ値のみ返す
        expiresIn: SMS_CODE_EXPIRY_MINUTES * 60, // 秒単位
        isNewUser: !existingUser, // 新規ユーザーかどうか
        sessionInfo: smsResult?.sessionInfo,
        message: "Verification code sent to your phone",
      },
      { status: 200 }
    );
  } catch (error) {
    // 予期しないエラーをキャッチ
    console.error("[SMS Send] Unexpected error:", error);
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
