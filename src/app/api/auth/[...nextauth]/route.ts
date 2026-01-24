import { handlers } from "@/auth";

/**
 * NextAuth API Route Handler
 * 
 * このファイルは NextAuth.js 統合ポイントとして機能します。
 * すべての認証リクエスト (`/api/auth/*`) はこのハンドラーを通ります。
 * 
 * 処理フロー:
 * 1. `/api/auth/signin` - ログインフォーム表示（カスタム UI は /login/page.tsx で実装）
 * 2. `/api/auth/callback/credentials` - SMS CredentialsProvider で認証
 *    - src/auth.ts の CredentialsProvider.authorize() が呼ばれる
 *    - phoneHash + code を検証
 *    - VerificationToken を確認して有効期限をチェック
 *    - User を取得または新規作成
 *    - VerificationToken を削除
 * 3. `/api/auth/session` - セッション情報取得
 * 4. `/api/auth/callback/twitter` - Twitter OAuth コールバック
 * 5. `/api/auth/signout` - ログアウト
 * 
 * 認証プロバイダー:
 * - SMS (CredentialsProvider): phoneHash + code で認証 (開発・本番両対応)
 * - Twitter (OAuth): Idol claim 用 (本番のみ)
 * 
 * @see src/auth.ts - NextAuth 設定と CredentialsProvider 実装
 * @see src/app/login/page.tsx - カスタムログイン UI
 * @see src/app/api/auth/sms/send/route.ts - コード送信 API
 * @see src/app/api/auth/sms/verify/route.ts - コード検証 API (参考用、現在は使用していない)
 */

export const { GET, POST } = handlers;
