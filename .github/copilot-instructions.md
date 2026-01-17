# GitHub Copilot Instructions

These rules guide GitHub Copilot Chat and inline suggestions for this repository.

## Scope
- Applies to VS Code Copilot Chat, inline completions, and PR review suggestions in this repo.
- Favor small, focused diffs that are easy to review.

## Communication Language
- All interactions via Copilot Chat should be in Japanese (日本語).
- Code comments and commits may be in either Japanese or English; follow the existing code style.

## Project Overview: OSHI-HIGH (推し-廃)
**Mission**: 「推し活廃人」の熱狂を可視化し、推しの収益とコミュニティの発展に還元するプラットフォーム。

**Core Value**: ファンが広告（エール素材）を消費することで、推しへの直接的な活動支援金が発生し、ファン自身の「活動実績（Activity）」が蓄積される。

**Primary Target**: 特定のアイドル・クリエイターに人生を捧げている熱狂的なファン層。

### Key Business Features
1. **Activity & Rank System**: 
   - All fan actions generate "Activity" points.
   - High activity levels unlock "Self-governance rights" (e.g., editing the shared Fan Calendar).

2. **Ad-Support Loop**:
   - Sponsors provide "Yell Materials" (32x32 pixel art items).
   - Fans use these items to support Idols; this action triggers revenue distribution to the Idol's account.

3. **Idol Management**:
   - Idols are initially "unclaimed" (fan-created).
   - Official owners can "Claim" the account via SNS OAuth to receive accumulated revenue.

4. **Visual Style (The "Pixel Art" layer)**:
   - All UI elements, stickers, and ad-items are 32x32 pixel art.
   - Pixel data is stored as JSON (color index arrays) for lightweight storage and dynamic re-coloring.
   - Use `image-rendering: pixelated` for CSS scaling of 32x32 assets.

## Tech Stack
- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Cloud SQL)
- **ORM**: Prisma
  - Prioritize schema design that tracks the relationship between `User`, `Idol`, and `SupportTransaction`.
- **Auth**: Auth.js (NextAuth) - Critical for "Idol Claim" (SNS Verification)
- **Cloud Infrastructure**: Google Cloud Platform (GCP)
  - Cloud Run (deployments)
  - Cloud SQL (PostgreSQL)
  - Cloud Storage (file storage)
  - Cloud Vision API (image processing)
- **CI/CD**: GitHub Actions
- **Local Development**: Docker Compose

## Environment Setup
- **Development**: Docker Compose orchestrates local services (Node.js, PostgreSQL, etc.)
- **Production**: Cloud Run, Cloud SQL, Cloud Storage, Cloud Vision API on GCP
- **Environment Variables**: Managed via `.env.local` (git-ignored)
  - Never commit `.env.local`, `*.json` GCP service account keys, or private credentials
  - See `.gitignore` for exclusion patterns
- **Service Account Keys**: Store JSON files locally; load via `process.env.GOOGLE_APPLICATION_CREDENTIALS`
  - Keep these files out of version control at all times

## Development Strategy
- **Step 1**: Foundation (DB Schema & Auth). Focus on User-Idol contribution logic.
- **Step 2**: Core Loop (Ad/Energy -> Support Point -> Activity up).
- **Step 3**: Community Features (Fan Calendar, Lobby).
- **Step 4**: Visual Polish (Pixel Art Editor & Rendering).

## Prompting checklist
- Always mention target files and (if known) line ranges.
- State intent and constraints: behavior, performance, security, compatibility, style.
- Prefer stepwise changes: request a patch, then review, then iterate.
- Ask for minimal new dependencies; avoid adding tools without explicit approval.

## Editing rules Copilot should follow
- Keep edits ASCII unless the file already uses other characters.
- Preserve existing style: formatting, naming, logging, error handling patterns.
- Add concise comments only when code is non-obvious; avoid noisy narration.
- Do not remove user-authored content unless explicitly told to replace it.
- Surface risks first: breaking changes, security concerns, missing tests.

## Chat command patterns (examples)
- "Edit src/path/to/file.ext: change X to Y because Z; keep other code as-is."
- "Explain what this function does and its edge cases: src/path/to/file.ext#L40-L85."
- "Propose tests for feature Q and add only the test cases, no refactors."
- "Review this diff for risks and missing coverage: ..." (paste snippet).

## Quick VS Code Copilot shortcuts
- `/fix` generate a possible fix for the selected code.
- `/tests` suggest or add tests for the selection.
- `/explain` describe selected code.
- `/doc` add doc comments for the selection.

## If requirements are unclear
- Ask one clarifying question and propose a conservative default.
- Prefer no change over an unsafe guess.
