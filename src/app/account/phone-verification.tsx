"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function PhoneVerification() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentPhoneHash, setSentPhoneHash] = useState<string | null>(null);
  const router = useRouter();

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSending(true);

    try {
      const res = await fetch("/api/debug/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (process.env.NODE_ENV !== 'production') {
        // Helpful debug info in non-production builds
        // eslint-disable-next-line no-console
        console.debug("[Phone Verification] SMS send response:", { ok: res.ok, status: res.status, data });
      }
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setMessage("Code sent. Check console (mock) or your phone.");
      setSentPhoneHash(data.phoneHash || null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error("[Phone Verification] SMS send error:", e);
      }
      setMessage(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/debug/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, mode: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setMessage("Phone verified successfully.");
      // refresh server data (account page will show verified)
      router.refresh();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setMessage(e.message || "Verification failed");
    }
  }

  return (
    <div className="mt-3">
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09012345678" className="rounded border px-2 py-1" />
        <button disabled={sending} type="submit" className="rounded bg-blue-500 px-3 py-1 text-white">Send Code</button>
      </form>

      {sentPhoneHash && (
        <form onSubmit={handleVerify} className="mt-2 flex gap-2 items-center">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="rounded border px-2 py-1" />
          <button type="submit" className="rounded bg-green-500 px-3 py-1 text-white">Verify</button>
        </form>
      )}

      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
