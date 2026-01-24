import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 dark:bg-black">
      <h1 className="text-2xl font-bold text-black dark:text-white">
        Welcome, {session.user?.name}!
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Email: {session.user?.email}
      </p>
      <form
        action={async () => {
          "use server";
          const { signOut } = await import("@/auth");
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Sign Out
        </button>
      </form>
    </main>
  );
}
