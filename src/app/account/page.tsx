import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";
import PhoneVerification from "./phone-verification";

export default async function AccountPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    // If user is not signed in, redirect to canonical login page.
    redirect('/login');
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { accounts: true } });

  const hasSms = !!user?.accounts?.some((a) => a.provider === "sms");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">My Account</h1>
      <div className="mt-4">
        <p><strong>Name:</strong> {user?.name ?? "-"}</p>
        <p><strong>Email:</strong> {user?.email ?? "-"}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Phone verified:</strong> <span className={hasSms ? "text-green-600" : "text-red-600"}>{hasSms ? "Yes" : "No"}</span></p>
      </div>

      <section className="mt-6">
        <h2 className="font-semibold">Phone Verification</h2>
        <p className="text-sm text-gray-500">Manage your phone number and verify by SMS.</p>
        <PhoneVerification />
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">Sign Out</h2>
        <SignOutButton />
      </section>
    </main>
  );
}
