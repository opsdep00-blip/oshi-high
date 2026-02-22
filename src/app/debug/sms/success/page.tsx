import Link from "next/link";

export default function SmsSuccessPage({ searchParams }: { searchParams?: { userId?: string; isNewUser?: string } }) {
  const userId = searchParams?.userId;
  const isNewUser = searchParams?.isNewUser === "true";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 space-y-6">
        {/* 成功アイコン */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* メッセージ */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ✅ 認証成功！
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isNewUser ? "新規アカウントが作成されました" : "ログインしました"}
          </p>
        </div>

        {/* ユーザー情報 */}
        {userId && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
              ユーザー情報
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ユーザーID:
                </span>
                <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200 font-mono">
                  {userId}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ステータス:
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded font-semibold">
                  {isNewUser ? "新規登録" : "既存ユーザー"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* デバッグ情報 */}
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-orange-600 dark:text-orange-400 text-xl">
              🐛
            </span>
            <div className="flex-1 space-y-1">
              <div className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                デバッグモード
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-400">
                これはテスト用の認証フローです。本番環境では Google / Twitter
                OAuth を使用します。
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-3 pt-4">
          <Link
            href="/debug/sms"
            className="block w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white text-center rounded-lg font-semibold transition-colors"
          >
            もう一度テストする
          </Link>
          <Link
            href="/"
            className="block w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-center rounded-lg font-semibold transition-colors"
          >
            ホームに戻る
          </Link>
        </div>

        {/* フッター情報 */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p>
              <strong>次のステップ:</strong>
            </p>
            <p>
              推しの活動を支援するために、推しアカウントを検索して「エール」を送りましょう！
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
