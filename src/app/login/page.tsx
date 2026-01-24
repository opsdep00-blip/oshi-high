"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sessionInfo, setSessionInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // ステップ 1: 電話番号送信
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        setError(
          "Invalid response from server. Check browser console and server logs."
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMsg =
          data.error ||
          data.details ||
          `HTTP ${response.status}: Failed to send verification code`;
        throw new Error(errorMsg);
      }

      // レスポンスから sessionInfo と isNewUser を取得
      setSessionInfo(data.sessionInfo || "");
      setIsNewUser(data.isNewUser);
      setStep("code");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unknown error occurred";
      console.error("[Login Error]", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ステップ 2: コード検証 & ログイン
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Firebase フロー: sessionInfo + code を送信
      const response = await fetch("/api/auth/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionInfo, code }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        setError(
          "Invalid response from server. Check browser console and server logs."
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMsg =
          data.error ||
          data.details ||
          `HTTP ${response.status}: Failed to verify code`;
        throw new Error(errorMsg);
      }

      // 検証成功: NextAuth セッション作成のため signIn を呼ぶ
      // (verify API からの userId を使って NextAuth セッションを確立)
      const signInResult = await signIn("sms", {
        phone,
        code,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (signInResult?.ok) {
        console.log("[Login] Authentication successful, redirecting to dashboard");
        router.push("/dashboard");
      } else {
        throw new Error(signInResult?.error || "Failed to create session");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unknown error occurred";
      console.error("[Verify Error]", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setCode("");
    setError("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
            OSHI-HIGH
          </h1>
          <p className="mt-2 text-sm font-bold text-gray-700">
            {isNewUser && step === "code" ? "アカウント作成" : "ログイン"}
          </p>
        </div>

        {/* メインカード */}
        <div className="space-y-6 rounded-lg border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* エラーメッセージ */}
          {error && (
            <div className="rounded-lg border-2 border-red-500 bg-red-100 p-4">
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          {/* ステップ 1: 電話番号入力 */}
          {step === "phone" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-black">
                  電話番号
                </label>
                <input
                  type="tel"
                  placeholder="09012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full border-4 border-black bg-white p-3 font-bold text-black placeholder-gray-400 outline-none focus:shadow-[inset_0px_0px_0px_2px_rgba(0,0,0,0.5)] disabled:opacity-50"
                />
                <p className="mt-1 text-xs font-bold text-gray-600">
                  日本の携帯電話番号を入力してください
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full border-4 border-black bg-blue-400 py-3 font-black text-black transition-all hover:bg-blue-500 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {loading ? "送信中..." : "確認コードを送信"}
              </button>
            </form>
          )}

          {/* ステップ 2: コード入力 */}
          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-black">
                  確認コード
                </label>
                <p className="mb-3 text-xs font-bold text-gray-600">
                  SMSで受け取った6桁のコードを入力してください
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  className="w-full border-4 border-black bg-white p-3 font-black text-center text-2xl tracking-widest text-black outline-none focus:shadow-[inset_0px_0px_0px_2px_rgba(0,0,0,0.5)] disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full border-4 border-black bg-green-400 py-3 font-black text-black transition-all hover:bg-green-500 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {loading ? "確認中..." : "ログイン"}
              </button>

              <button
                type="button"
                onClick={handleBackToPhone}
                disabled={loading}
                className="w-full border-4 border-gray-400 bg-gray-200 py-2 font-bold text-black transition-all hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] disabled:opacity-50"
              >
                戻る
              </button>
            </form>
          )}

          {/* 進捗インジケータ */}
          <div className="flex items-center justify-center gap-2 border-t-4 border-black pt-6">
            <div
              className={`h-3 w-3 border-2 border-black ${
                step === "phone" ? "bg-black" : "bg-white"
              }`}
            />
            <div className="h-1 w-8 border-t-2 border-black" />
            <div
              className={`h-3 w-3 border-2 border-black ${
                step === "code" ? "bg-black" : "bg-white"
              }`}
            />
          </div>
        </div>

        {/* フッター情報 */}
        <div className="mt-6 rounded-lg border-2 border-gray-300 bg-gray-50 p-4 text-center">
          <p className="text-xs font-bold text-gray-600">
            © 2026 OSHI-HIGH. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
