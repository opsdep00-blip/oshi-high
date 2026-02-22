# Deprecations & Migration Plans

This document tracks fields or features that are deprecated and outlines plans for safe migration/backfill.

## `phoneSalt` (User.phoneSalt) — DEPRECATED
- **Current state**: The `User` model contains a `phoneSalt` field. The application currently uses a global `PHONE_HASH_SECRET` and deterministic HMAC-SHA256 of normalized phone numbers (`phoneToHash`) for identity. `phoneSalt` is not used by current hashing logic.
- **Risk if removed immediately**: Existing `phoneHash` entries in DB were generated without per-user salt; changing the hashing scheme without backfill will break lookups and sign-in flows.

### Recommended migration plan
1. **Backfill phase** (read-only safe)
   - Add a script `scripts/backfill-phoneSalt.ts` that:
     - Iterates over all users with `phoneHash` set.
     - Generates a random salt for each user and stores it in `phoneSalt`.
     - Recomputes a new `phoneHash_v2` (HMAC(global_secret, normalize(phone) + salt)) and stores it in a temporary column `phoneHashV2` or in a mapping table.
   - Deploy this script and run it once on staging/production with monitoring.
2. **Switch read path**
   - Update `phoneToHash` to support both legacy (global-only) and v2 (global+salt) verification (try both mechanisms), and log mismatches.
3. **Full migration**
   - Once all traffic uses the v2 matching and logs show no legacy hits, migrate `phoneHash` to the v2 values and drop compatibility code.
4. **Schema cleanup**
   - Remove `phoneSalt` and any temporary columns after confirmation.

### Note
- Because this is a production-impacting migration you must coordinate with the team and run in controlled windows. See `docs/IMPLEMENTATION_STATUS.md` for tracking progress.
