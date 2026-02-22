"use client";

import Link from "next/link";

export default function LoginErrorPage() {
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
        <div className="mb-8 border-b-2 border-red-400 pb-6">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
            ログイン失敗
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ログイン中にエラーが発生しました。再試行してください。
          </p>
        </div>

        {/* 再試行リンク */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-center rounded font-semibold transition-colors"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}