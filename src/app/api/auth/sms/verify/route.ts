import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getFirebaseAccessToken } from "@/lib/firebaseAdmin";

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
      console.error("[SMS Verify] JSON parse error:", parseError);
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

    // Firebase の OTP 検証を実施
    let phoneNumber: string | undefined;
    try {
      const accessToken = await getFirebaseAccessToken();
      const response = await fetch(
        "https://identitytoolkit.googleapis.com/v2/accounts:signInWithPhoneNumber",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionInfo, code }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("[SMS Verify] Firebase verify error", {
          status: response.status,
          statusText: response.statusText,
          responseBody: text?.slice(0, 500),
        });
        return NextResponse.json(
          { error: "Verification failed" },
          { status: 400 }
        );
      }

      const result = await response.json();
      phoneNumber = result?.phoneNumber;
    } catch (firebaseError) {
      console.error("[SMS Verify] Firebase verification exception", firebaseError);
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number not returned by provider" },
        { status: 400 }
      );
    }

    const phoneHash = crypto.createHash("sha256").update(phoneNumber).digest("hex");

    // ステップ 2: 既存ユーザーをチェック
    let user;
    let isNewUser = false;

    try {
      user = await prisma.user.findUnique({
        where: { phoneHash },
        include: { accounts: true },
      });

      isNewUser = !user;

      if (!user) {
        // 新規ユーザー: User と Account を作成
        user = await prisma.user.create({
          data: {
            phoneHash,
            // phoneSalt は既存ユーザーのみ。新規ユーザーの場合は別途設定
            role: "FAN",
            accounts: {
              create: {
                type: "credentials",
                provider: "sms",
                providerAccountId: phoneHash,
              },
            },
          },
          include: { accounts: true },
        });

        console.log(`[SMS Auth] New user created: ${user.id}`);
      } else {
        console.log(`[SMS Auth] Existing user authenticated: ${user.id}`);
      }
    } catch (userError) {
      console.error("[SMS Verify] User creation/lookup error:", userError);
      return NextResponse.json(
        { error: "Failed to create or retrieve user" },
        { status: 500 }
      );
    }

    // Firebase 側で検証済みなので VerificationToken の削除は不要

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        isNewUser,
        message: isNewUser
          ? "Account created successfully"
          : "Logged in successfully",
        redirectUrl: "/dashboard",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[SMS Verify] Unexpected error:", error);
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
