import React, { Suspense } from "react";
import ResolveClient from "./ResolveClient.tsx";

export default function ResolvePage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token;

  if (!token) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Resolve Account</h1>
        <p className="mt-4">Missing token.</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Account conflict detected</h1>
      <p className="mt-4">We detected an existing account with the same email. Choose how to proceed:</p>

      <div className="mt-6">
        <Suspense fallback={<div className="mt-4">Loading action...</div>}>
          <ResolveClient token={token} />
        </Suspense>
      </div>
    </main>
  );
}
