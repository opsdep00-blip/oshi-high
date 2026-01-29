import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-8">
          OSHI-HIGH へようこそ
        </h1>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            ログインは Google / Twitter OAuth で実装予定です
          </p>
          
          {/* Debug: SMS 認証ページへのリンク */}
          <div className="border-2 border-dashed border-orange-400 rounded-lg p-6 bg-orange-50 dark:bg-orange-900/20">
            <p className="text-orange-600 dark:text-orange-400 text-xs font-bold mb-3">
              🐛 DEBUG: 一時的なテストツール
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-4">
              本番環境では削除予定。デバッグ用のSMS認証機能です。
            </p>
            <Link
              href="/debug/sms"
              className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold transition-colors"
            >
              SMS認証テスト（デバッグ用）
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
