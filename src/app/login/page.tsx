"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize RecaptchaVerifier
    if (!window.recaptchaVerifier) {
      // Note: constructor signature is (containerOrId, parameters?, app?)
      window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          setError("reCAPTCHA expired. Please try again.");
        }
      }, auth);
    }
  }, []);

  const handleSendSms = async () => {
    setError(null);
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        setError('reCAPTCHA の初期化に失敗しました。ページを再読み込みしてください。');
        setLoading(false);
        return;
      }
      // Ensure phone number is in E.164 format (e.g., +819012345678)
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep("code");
    } catch (err: any) {
      console.error("SMS Send Error:", err);
      setError(err.message || "SMSの送信に失敗しました。");
      // Reset recaptcha on error so user can try again
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult) return;
    setError(null);
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      const idToken = await user.getIdToken();

      // Send ID token to server via NextAuth credentials provider
      const res = await signIn("credentials", {
        idToken,
        callbackUrl: "/account",
        redirect: false, // handle redirect client-side to satisfy TypeScript
      });

      if (res?.ok) {
        // credentials provider returns a url when successful
        window.location.href = (res.url as string) || '/account';
        return;
      }

      setError(res?.error || "認証に失敗しました。");
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError("確認コードが正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-80">
          {error}
        </div>
      )}

      {/* Social Login Buttons */}
      <button
        onClick={async () => {
          if (process.env.NEXT_PUBLIC_ENABLE_OAUTH_MOCK === 'true') {
            await signIn('mock', { provider: 'google', callbackUrl: '/account' });
          } else {
            await signIn('google', { callbackUrl: '/account' });
          }
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-2"
      >
        Googleでログイン
      </button>
      <button
        onClick={async () => {
          if (process.env.NEXT_PUBLIC_ENABLE_OAUTH_MOCK === 'true') {
            await signIn('mock', { provider: 'twitter', callbackUrl: '/account' });
          } else {
            await signIn('twitter', { callbackUrl: '/account' });
          }
        }}
        className="bg-blue-400 text-white px-4 py-2 rounded"
      >
        Twitterでログイン
      </button>

      <div className="my-6 border-t border-gray-300 w-64"></div>

      {/* SMS Login Section */}
      <div className="w-80 bg-white p-6 rounded shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-center">電話番号でログイン</h2>
        
        {step === "phone" ? (
          <>
            <input
              type="tel"
              placeholder="+819012345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            />
            <div id="recaptcha-container" className="mb-4 flex justify-center"></div>
            <button
              onClick={handleSendSms}
              disabled={loading || !phoneNumber}
              className="w-full bg-green-500 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? "送信中..." : "SMSを送信"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">
              {phoneNumber} に送信されたコードを入力してください
            </p>
            <input
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full border p-2 rounded mb-4 text-center tracking-widest"
            />
            <button
              onClick={handleVerifyCode}
              disabled={loading || !verificationCode}
              className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? "認証中..." : "認証する"}
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full mt-2 text-sm text-gray-500 hover:underline"
            >
              電話番号を変更
            </button>
          </>
        )}
      </div>

      <Link href="/" className="mt-6 text-sm text-gray-600 hover:underline">
        ← ホームに戻る
      </Link>
    </div>
  );
}

// Add types for window object to support reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}
