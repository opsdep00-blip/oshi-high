import { auth } from "@/auth";
import Link from "next/link";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white dark:bg-black">
        <p className="text-gray-600 dark:text-gray-400">
          Already signed in as {session.user?.email}
        </p>
        <Link
          href="/dashboard"
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white dark:bg-black">
      <h1 className="text-3xl font-bold text-black dark:text-white">
        Sign In
      </h1>
      <div className="space-y-4">
        <form
          action={async () => {
            "use server";
            const { signIn } = await import("@/auth");
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="rounded bg-gray-900 px-6 py-2 text-white hover:bg-gray-800"
          >
            Sign in with GitHub
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            const { signIn } = await import("@/auth");
            await signIn("twitter", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="rounded bg-blue-400 px-6 py-2 text-white hover:bg-blue-500"
          >
            Sign in with Twitter
          </button>
        </form>
      </div>
    </main>
  );
}
