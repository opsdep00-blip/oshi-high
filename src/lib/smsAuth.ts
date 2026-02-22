import { prisma } from "@/lib/prisma";
import { getFirebaseAccessToken, getFirebaseAuth } from "@/lib/firebaseAdmin";
import { phoneToHash, SMS_CODE_EXPIRY_MINUTES, generateVerificationCode } from "@/lib/phoneHash";
import { sendVerificationCode } from "@/lib/sms";
import * as logger from "@/lib/logger";
import { allowRequest } from "@/lib/rateLimiter";

export type VerifyMode = "signin" | "signup";

export async function sendSmsVerification(phone: string) {
  const isMock = process.env.ENABLE_SMS_MOCK === "true";
  const useFirebase = !isMock && (process.env.SMS_PROVIDER || "firebase") === "firebase";

  const phoneHash = phoneToHash(phone);

  // rate limit: phoneHash (per phone) and IP (per minute)
  const sendLimitPerHour = Number(process.env.SMS_SEND_LIMIT_PER_HOUR || "5");
  const sendWindowMs = 60 * 60 * 1000; // 1 hour
  const rlPhoneKey = `sms:send:phone:${phoneHash}`;
  const rlPhone = await allowRequest(rlPhoneKey, sendLimitPerHour, sendWindowMs);
  if (!rlPhone.allowed) {
    const err = new Error(`Rate limit exceeded (phone). Try again in ${rlPhone.retryAfter}s`) as Error & { status?: number };
    err.status = 429;
    logger.warn("[sendSmsVerification] rate limit phone exceeded", { phoneHash, limit: sendLimitPerHour });
    throw err;
  }

  // check existing user
  let existingUser = null;
  try {
    existingUser = await prisma.user.findUnique({ where: { phoneHash } });
  } catch (e) {
    logger.error("[sendSmsVerification] DB lookup error:", e);
    throw e;
  }

  let verificationCode: string | undefined;
  let sessionInfo: string | undefined;

  if (!useFirebase) {
    verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRY_MINUTES * 60 * 1000);

    try {
      await prisma.verificationToken.upsert({
        where: {
          identifier_token: {
            identifier: phoneHash,
            token: verificationCode,
          },
        },
        update: { expires: expiresAt },
        create: {
          identifier: phoneHash,
          token: verificationCode,
          type: "sms",
          expires: expiresAt,
        },
      });
    } catch (e) {
      logger.error("[sendSmsVerification] Token upsert error:", e);
      throw e;
    }
  }
  // send via provider (mock prints to console)
  try {
    const res = await sendVerificationCode({ phoneHash, phone, code: verificationCode ?? "" });
    sessionInfo = res.sessionInfo;
  } catch (e) {
    logger.error("[sendSmsVerification] SMS send error:", e);
    if (!isMock) throw e;
  }

  return {
    phoneHash,
    isNewUser: !existingUser,
    expiresIn: SMS_CODE_EXPIRY_MINUTES * 60,
    sessionInfo,
  };
}

export async function verifySmsCode(phoneOrSession: { phone?: string; sessionInfo?: string; idToken?: string }, code: string, mode: VerifyMode = "signup", currentUserId?: string) {
  const isMock = process.env.ENABLE_SMS_MOCK === "true";

  let phoneNumber: string | undefined;

  // IDトークンによる検証 (クライアントサイド認証後のフロー)
  if (phoneOrSession.idToken) {
    try {
      const auth = getFirebaseAuth();
      const decodedToken = await auth.verifyIdToken(phoneOrSession.idToken);
      phoneNumber = decodedToken.phone_number;
    } catch (e) {
      logger.error("[verifySmsCode] ID Token verification failed:", e);
      const err = new Error("Invalid ID Token") as Error & { status?: number };
      err.status = 401;
      throw err;
    }
  }
  else if (isMock) {
    if (!phoneOrSession?.phone) throw new Error("phone is required in mock mode");
    const phone = phoneOrSession.phone;
    const phoneHash = phoneToHash(phone);

    try {
      const token = await prisma.verificationToken.findUnique({
        where: { identifier_token: { identifier: phoneHash, token: code } },
      });
      if (!token || token.expires < new Date()) {
        const err = new Error("Invalid or expired verification code") as Error & { status?: number };
        err.status = 400;
        throw err;
      }

      await prisma.verificationToken.delete({ where: { identifier_token: { identifier: phoneHash, token: code } } });
      phoneNumber = phone;
    } catch (e) {
      throw e;
    }
  } else {
    // Use Firebase to verify and get phone number
    try {
      const accessToken = await getFirebaseAccessToken();
      const response = await fetch(
        "https://identitytoolkit.googleapis.com/v2/accounts:signInWithPhoneNumber",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ sessionInfo: phoneOrSession.sessionInfo, code }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        const err = new Error("Verification failed: " + text.slice(0, 500)) as Error & { status?: number };
        err.status = 400;
        throw err;
      }

      const result = await response.json();
      phoneNumber = result?.phoneNumber;
    } catch (e) {
      throw e;
    }
  }

  if (!phoneNumber) {
    const err = new Error("Phone number not returned by provider") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const phoneHash = phoneToHash(phoneNumber);

  // find or create user depending on mode, and optionally attach to currentUserId when provided
  try {
    let user = await prisma.user.findUnique({ where: { phoneHash }, include: { accounts: true } });

    // If there is a signed-in user, link the phone to that user (preferred)
    if (currentUserId) {
      // if phone already belongs to another user, prevent linking
      if (user && String(user.id) !== String(currentUserId)) {
        const err = new Error("This phone number is already associated with another account") as Error & { status?: number };
        err.status = 409;
        throw err;
      }

      // ensure target user exists
      const targetUser = await prisma.user.findUnique({ where: { id: currentUserId }, include: { accounts: true } });
      if (!targetUser) {
        const err = new Error("Current user not found") as Error & { status?: number };
        err.status = 404;
        throw err;
      }

      // attach sms account if not exists
      const hasSms = targetUser.accounts.some((a) => a.provider === "sms");
      if (!hasSms) {
        await prisma.account.create({ data: { userId: targetUser.id, type: "credentials", provider: "sms", providerAccountId: phoneHash } });
        // Mark phone verified for the target user
        await prisma.user.update({ where: { id: targetUser.id }, data: { phoneVerified: true } });
      }

      return { user: targetUser, isNewUser: false };
    }

    if (!user) {
      if (mode === "signin") {
        const err = new Error("This phone number is not registered") as Error & { status?: number };
        err.status = 404;
        throw err;
      }

      // signup: create user
      user = await prisma.user.create({
        data: {
          phoneHash,
          role: "FAN",
          phoneVerified: true, // mark verified on signup via SMS
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

      return { user, isNewUser: true };
    }

    // existing user: ensure sms account exists
    const hasSmsAccount = user.accounts.some((a) => a.provider === "sms");
    if (!hasSmsAccount) {
      await prisma.account.create({ data: { userId: user.id, type: "credentials", provider: "sms", providerAccountId: phoneHash } });
      // Mark phone verified
      await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
    }

    return { user, isNewUser: false };
  } catch (e) {
    throw e;
  }
}
