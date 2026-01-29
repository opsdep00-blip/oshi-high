"use client";

import { useState } from "react";
import Link from "next/link";

export default function DebugSmsPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);

  // ステップ 1: 電話番号を送信
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/debug/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "コード送信に失敗しました");
      }

      setSessionInfo(data.sessionInfo);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // ステップ 2: コードを検証
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/debug/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionInfo, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "コード検証に失敗しました");
      }

      // 成功
      alert(`✓ 認証成功！\nユーザーID: ${data.userId}\n新規ユーザー: ${data.isNewUser ? "はい" : "いいえ"}`);
      // 実装後は本来リダイレクトする
      // window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black p-4">
      <div className="max-w-md mx-auto py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-600 text-sm">
            ← ホームに戻る
          </Link>
        </div>

        {/* タイトル */}
        <div className="mb-8 border-b-2 border-orange-400 pb-6">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
            🐛 SMS認証テスト
          </h1>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <p>
              <strong>用途:</strong> デバッグ・テスト用エンドポイント
            </p>
            <p>
              <strong>本番化:</strong> 削除予定。正式ログインはGoogle / Twitter OAuthを使用
            </p>
            <p>
              <strong>背景:</strong> SNS認証はログイン機能ではなく、推し本人の「Claim」機能に使用
            </p>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ステップ 1: 電話番号入力 */}
        {step === "phone" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                電話番号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09012345678"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded font-semibold transition-colors"
            >
              {loading ? "送信中..." : "認証コード送信"}
            </button>
          </form>
        )}

        {/* ステップ 2: コード検証 */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-400">
              コンソールまたは SMS で送信されたコード（6桁）を入力してください
            </div>
            <div>
              <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                認証コード
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white text-center text-xl tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-black dark:text-white rounded font-semibold transition-colors"
              >
                戻る
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded font-semibold transition-colors"
              >
                {loading ? "検証中..." : "認証"}
              </button>
            </div>
          </form>
        )}

        {/* 情報ボックス */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>開発環境での動作:</strong>
            <br />
            コンソール（DevTools / Server Log）に検証コードが出力されます
          </p>
          <p>
            <strong>実装予定の本物のログイン:</strong>
            <br />
            「Google / Twitter でログイン」（OAuth 2.0）
          </p>
        </div>
      </div>
    </main>
  );
}
