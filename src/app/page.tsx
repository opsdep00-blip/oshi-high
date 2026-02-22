import Link from "next/link";
import ResetDbButton from "./reset-db-button";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

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


          {/* If logged in, show account info */}
          {session ? (
            <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900/20">
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">Signed in as <strong>{session.user?.email}</strong></p>
              <div className="flex gap-3 justify-center">
                {session.user?.id ? (
                  <Link href="/login?callbackUrl=/account" className="px-4 py-2 bg-blue-500 text-white rounded">Go to My Account</Link>
                ) : (
                  <Link href="/login" className="px-4 py-2 bg-yellow-500 text-white rounded">Complete sign in</Link>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-blue-400 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-blue-600 dark:text-blue-400 text-xs font-bold mb-3">
                🔑 ログインはこちら
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-4">
                Google または Twitter を使用してログインできます。
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold transition-colors"
              >
                ログインページへ
              </Link>
            </div>
          )}

          {/* Debug: Reset DB (dev only) */}
          <div className="mt-4">
            {/* client component is hidden when NEXT_PUBLIC_ENABLE_DB_RESET is not true */}
            <ResetDbButton />
          </div>

        </div>
      </div>
    </main>
  );
}
