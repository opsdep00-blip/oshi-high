"use client";

import Link from "next/link";

export default function LoginSuccessPage() {
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
        <div className="mb-8 border-b-2 border-green-400 pb-6">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
            ログイン成功！
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ログインが正常に完了しました。ダッシュボードに進むことができます。
          </p>
        </div>

        {/* ダッシュボードリンク */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="block w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-center rounded font-semibold transition-colors"
          >
            ダッシュボードに進む
          </Link>
        </div>
      </div>
    </main>
  );
}