Firebase (recommended)

- Environment variables / Secrets:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (use GitHub Secrets / Secret Manager, keep this secret)

- Quick test:
  1. Enable **Phone Authentication** in the Firebase Console for your project.
  2. Add the Firebase service account credentials to GitHub Secrets / Secret Manager and inject into Cloud Run.
  3. Deploy to staging and call the debug endpoint:
     ```bash
     curl -X POST "https://staging-oshi-high.run.app/api/debug/sms/send" \
       -H "Content-Type: application/json" \
       -d '{"phone":"+8190xxxxxxx"}'
     ```
  4. Check Cloud Run logs for `accounts:sendVerificationCode` request/response and `sessionInfo` handling.

Notes:
- The app uses Firebase REST API (`accounts:sendVerificationCode`) to obtain `sessionInfo`; client-side verification follows Firebase Phone Auth flows.
- Keep service account credentials secret; use Secret Manager → Cloud Run for production.

