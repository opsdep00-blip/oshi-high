"use client";



export default function PhoneRegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">電話番号登録 (廃止)</h1>
      <p className="mb-4 text-gray-700">このページは廃止されました。電話番号は認証フローで同時に登録されます。</p>
      <a href="/debug/sms" className="bg-blue-500 text-white px-4 py-2 rounded">SMS 認証テストに移動</a>
    </div>
  );
}