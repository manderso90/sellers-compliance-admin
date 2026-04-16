# Plan: Bypass RLS on Internal Profile Authorization Lookups

**Created:** 2026-04-15
**Status:** Implemented
**Request:** Fix false `access_denied` redirects caused by RLS timing issues during Supabase token refresh by using a service-role client for profile authorization lookups.

---

## Overview

### What This Plan Accomplishes

Replaces the user-scoped Supabase client with a service-role admin client for all `team_members` profile SELECT queries used in authorization checks. This eliminates a race condition where RLS denies a valid user's profile lookup during the brief window when their JWT is being refreshed.

### Why This Matters

Active users (primarily Christian) are being falsely redirected to `/login?error=access_denied` mid-session. This disrupts workflow and undermines trust in the system. The auth identity check (`supabase.auth.getUser()`) correctly identifies the user, but the subsequent RLS-gated profile lookup fails during token refresh windows. Since these profile lookups are purely internal authorization checks (not user-facing data access), bypassing RLS with a service-role client is the correct fix.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/proxy.ts` | Next.js middleware — protects `/admin/*` and `/login` routes with auth + profile checks |
| `src/app/admin/layout.tsx` | Server component — second layer of auth + profile check, passes profile to UI |
| `src/lib/supabase/server.ts` | SSR Supabase client factory (cookie-based) |

### Gaps or Problems Being Addressed

- **RLS timing race**: When a user's JWT expires and Supabase refreshes it, there's a brief window where the SSR client's token is stale. `supabase.auth.getUser()` succeeds (it forces a refresh), but subsequent queries using the same client instance may still use the old token, causing RLS to reject the `team_members` SELECT.
- **False access_denied redirects**: Users see the login page with `?error=access_denied` even though they have valid sessions and active profiles.

---

## Proposed Changes

### Summary of Changes

- Add `createClient` import from `@supabase/supabase-js` (aliased as `createAdminClient`) to `src/proxy.ts` and `src/app/admin/layout.tsx`
- Replace all `team_members` profile SELECTs with a service-role admin client that bypasses RLS
- Leave `supabase.auth.getUser()` on the existing SSR client (it needs cookie context)
- Leave all downstream logic (is_active checks, role checks, redirects) unchanged

### New Files to Create

None.

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/proxy.ts` | Add `createAdminClient` import; replace 2 profile SELECTs (in `/admin/*` and `/login` branches) with service-role client |
| `src/app/admin/layout.tsx` | Add `createAdminClient` import; replace 1 profile SELECT with service-role client |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Service-role client scoped to profile lookups only**: The admin client is used exclusively for the `team_members` authorization query. All other queries (e.g., the `jobs` count in layout.tsx) remain on the user-scoped SSR client. This minimizes the surface area of privilege escalation.

2. **Inline client creation, not a shared factory**: Each call site creates its own `createAdminClient(...)` instance. This keeps the change minimal and avoids introducing a new shared module for what is a simple two-line pattern. If more service-role usage emerges later, a factory can be extracted then.

3. **Both proxy.ts profile lookups get the fix**: The `/admin/*` branch AND the `/login` redirect-away branch both query `team_members`. Both are subject to the same RLS race. Both get the service-role treatment.

4. **`supabase.auth.getUser()` stays on SSR client**: This call needs cookie context to read/refresh the session. The service-role client has no cookie awareness and cannot perform user auth checks.

### Alternatives Considered

- **Retry with backoff on profile lookup failure**: Would add latency and complexity. The root cause is RLS, not a transient network issue — retrying with the same stale token wouldn't help.
- **Disable RLS on `team_members`**: Too broad. RLS should remain for general queries; only internal authorization lookups should bypass it.

### Open Questions

None — the request is fully specified.

---

## Step-by-Step Tasks

### Step 1: Modify `src/proxy.ts` — Add import and replace profile SELECTs

**Actions:**

- Add import at top of file:
  ```ts
  import { createClient as createAdminClient } from '@supabase/supabase-js'
  ```

- In the `/admin/*` branch (around line 43), replace:
  ```ts
  const { data: rawProfile } = await supabase
    .from('team_members')
    .select('is_active')
    .eq('id', user.id)
    .single()
  ```
  with:
  ```ts
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: rawProfile } = await adminClient
    .from('team_members')
    .select('is_active')
    .eq('id', user.id)
    .single()
  ```

- In the `/login` branch (around line 61), replace the same pattern:
  ```ts
  const { data: rawProfile } = await supabase
    .from('team_members')
    .select('is_active')
    .eq('id', user.id)
    .single()
  ```
  with:
  ```ts
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: rawProfile } = await adminClient
    .from('team_members')
    .select('is_active')
    .eq('id', user.id)
    .single()
  ```

- Do NOT touch `supabase.auth.getUser()`, the SSR client creation, or any redirect/check logic.

**Files affected:**
- `src/proxy.ts`

---

### Step 2: Modify `src/app/admin/layout.tsx` — Add import and replace profile SELECT

**Actions:**

- Add import at top of file:
  ```ts
  import { createClient as createAdminClient } from '@supabase/supabase-js'
  ```

- Replace the profile SELECT (around line 18):
  ```ts
  const { data: rawProfile } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', user.id)
    .single()
  ```
  with:
  ```ts
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: rawProfile } = await adminClient
    .from('team_members')
    .select('*')
    .eq('id', user.id)
    .single()
  ```

- Do NOT touch `supabase.auth.getUser()`, the SSR client creation, or any redirect/check/UI logic.

**Files affected:**
- `src/app/admin/layout.tsx`

---

### Step 3: Verify changes

**Actions:**

- Run: `grep -n "SUPABASE_SERVICE_ROLE_KEY" src/proxy.ts src/app/admin/layout.tsx`
- Expected output: 3 matches total — 2 in proxy.ts (lines in /admin and /login branches), 1 in layout.tsx

**Files affected:**
- None (read-only verification)

---

### Step 4: Commit and push

**Actions:**

- Stage both files: `git add src/proxy.ts src/app/admin/layout.tsx`
- Commit with message: `fix(auth): bypass RLS on internal profile authorization lookup`
- Push to `origin main`

**Files affected:**
- `src/proxy.ts`
- `src/app/admin/layout.tsx`

---

## Connections & Dependencies

### Files That Reference This Area

- `.env.local` — must contain `SUPABASE_SERVICE_ROLE_KEY`. This is a server-side-only env var (no `NEXT_PUBLIC_` prefix), so it is never exposed to the browser.
- Vercel environment variables — `SUPABASE_SERVICE_ROLE_KEY` must be set in the Vercel project settings for production.

### Updates Needed for Consistency

- None — this is a targeted fix. No AIOS docs, types, or other files need updating.

### Impact on Existing Workflows

- No behavioral change for users — the same authorization checks run, same redirects fire. The only difference is that profile lookups no longer fail during token refresh windows.

---

## Validation Checklist

- [ ] `grep -n "SUPABASE_SERVICE_ROLE_KEY" src/proxy.ts src/app/admin/layout.tsx` shows 3 matches
- [ ] `supabase.auth.getUser()` calls are unchanged in both files (still on SSR client)
- [ ] All `is_active` checks and redirect logic unchanged
- [ ] No other files modified
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists in `.env.local` (for local dev) and Vercel env vars (for production)

---

## Success Criteria

The implementation is complete when:

1. Both files use a service-role admin client for `team_members` profile SELECTs
2. `supabase.auth.getUser()` remains on the SSR cookie-based client in both files
3. All downstream authorization logic (is_active, redirects) is unchanged
4. Changes are committed and pushed to `origin main`

---

## Notes

- **Important discrepancy from request**: The request mentions an `/inspector/*` branch in proxy.ts, but the current code has no such branch. The matcher only covers `/admin/:path*` and `/login`. The `/login` branch also does a profile lookup and gets the same fix.
- **Security**: `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It is used here only with a known, authenticated `user.id` from `getUser()`. The service-role client is never exposed to client-side code or used for user-facing data access.
- **Future consideration**: If more service-role usage appears, extract a `createAdminClient()` factory into `src/lib/supabase/admin.ts` to centralize the pattern.

---

## Implementation Notes

**Implemented:** 2026-04-15

### Summary

Replaced user-scoped Supabase client with service-role admin client for all 3 `team_members` profile authorization SELECTs across 2 files. Committed as `9a240d9` and pushed to `origin main`.

### Deviations from Plan

None.

### Issues Encountered

None.
