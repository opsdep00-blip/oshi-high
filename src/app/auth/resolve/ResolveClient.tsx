"use client";

import React, { useState } from "react";

export default function ResolveClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLink() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to link");
      setMessage("Linked successfully. You can now access your account.");
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setMessage(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h3 className="font-semibold">Link to existing account</h3>
        <p className="text-sm text-gray-500">Sign in with the existing account first, then press the button below to link this login method to your account.</p>
        <button disabled={loading} className="mt-2 btn" onClick={handleLink}>{loading ? "Linking..." : "Link my account"}</button>
      </div>

      <div>
        <h3 className="font-semibold">Create separate account</h3>
        <p className="text-sm text-gray-500">If you prefer to create a separate account, sign out and sign up using a different email.</p>
      </div>

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
