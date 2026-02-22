"use client";

import React, { useState } from "react";

export default function ResetDbButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const enabled = (process.env.NEXT_PUBLIC_ENABLE_DB_RESET || "false") === "true";
  if (!enabled) return null;

  async function handleReset() {
    const ok = window.confirm("開発用: データベースを初期状態に戻します。本当に実行しますか？\nこの操作は元に戻せません。");
    if (!ok) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/debug/reset-db", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setMessage(`Success: deleted ${JSON.stringify(data.deleted)}`);
      // reload to reflect empty DB
      window.location.reload();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setMessage(e.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border border-red-200 rounded p-4 bg-red-50 dark:bg-red-900/10">
      <p className="text-sm text-red-600 font-semibold">⚠️ Development tool: Reset Database</p>
      <p className="text-xs text-gray-600 mt-1">This will delete most domain data (users, idols, ads, transactions). Only enable in development.</p>
      <div className="mt-3">
        <button onClick={handleReset} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          {loading ? "Resetting..." : "Reset DB (dev only)"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
