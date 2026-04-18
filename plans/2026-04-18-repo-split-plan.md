\# Split Seller's Compliance into two repos / two Vercel projects

\#\# Context  
Today everything lives in one Next.js app (\`sellers-compliance\`, deployed to a single Vercel project at sellerscompliance.com). The public marketing site (\`/\`, \`/order\`, \`/payment/\*\`) and the staff admin portal (\`/admin/\*\`, \`/login\`) share one build, one deployment pipeline, and one git history. Any admin-side change risks breaking the live order-taking surface.

The goal is to physically separate the two so admin work has zero blast radius on the public site. Approach: duplicate a small shared core (Supabase clients, types, design tokens, a couple of utilities, shadcn UI primitives) into both repos rather than extract a shared package — the surface is small and the project is solo, so the maintenance cost of duplication is lower than the cost of a workspace/package.

Decisions already locked in (from clarifying questions):  
\- Admin subdomain: \*\*admin.sellerscompliance.com\*\*  
\- Old admin URLs on the public site: \*\*301 redirect\*\* (configured in \`next.config.ts\` of the public repo)  
\- Stripe webhook: \*\*stays on sellerscompliance.com\*\* (no Stripe dashboard change, no risk of dropped events)

\#\# Target shape

\`\`\`mermaid  
flowchart LR  
  subgraph PublicRepo\["sellers-compliance-public (existing repo, trimmed)"\]  
    PR\_Pages\["/, /order, /order/confirmation,\<br/\>/payment/success, /payment/cancel"\]  
    PR\_API\["/api/inspections\<br/\>/api/stripe/create-checkout\<br/\>/api/stripe/webhook"\]  
    PR\_Redirect\["/admin/\* \+ /login → 301"\]  
  end

  subgraph AdminRepo\["sellers-compliance-admin (new repo)"\]  
    AR\_Pages\["/login\<br/\>/admin (command center)\<br/\>/admin/dispatch, /jobs, /inspectors, /settings"\]  
    AR\_API\["/api/auth/callback\<br/\>/api/auth/logout\<br/\>/api/employees/invite"\]  
    AR\_Proxy\["proxy.ts (auth gate on /admin/\* \+ /login)"\]  
  end

  PublicVercel\["Vercel project: public\<br/\>sellerscompliance.com"\]  
  AdminVercel\["Vercel project: admin\<br/\>admin.sellerscompliance.com"\]  
  Supabase\[(Supabase — shared DB)\]  
  Stripe((Stripe))

  PublicRepo \--\> PublicVercel  
  AdminRepo \--\> AdminVercel  
  PR\_Redirect \-. 301 .-\> AdminVercel  
  PR\_API \--\> Supabase  
  PR\_API \--\> Stripe  
  AR\_API \--\> Supabase  
  AR\_Pages \--\> Supabase  
  Stripe \-. webhook .-\> PR\_API  
\`\`\`

The two deployments share Supabase and Stripe accounts. The admin repo never builds public code; the public repo never builds admin code. A broken admin build cannot affect the public site.

\---

\#\# File inventory

Source paths are relative to the current repo root.

\#\#\# Goes to PUBLIC repo only (delete from admin)  
\- \`src/app/page.tsx\` — landing  
\- \`src/app/order/page.tsx\`  
\- \`src/app/order/confirmation/page.tsx\`  
\- \`src/app/payment/success/page.tsx\`  
\- \`src/app/payment/cancel/page.tsx\`  
\- \`src/app/api/inspections/route.ts\`  
\- \`src/app/api/stripe/create-checkout/route.ts\`  
\- \`src/app/api/stripe/webhook/route.ts\`  
\- \`src/components/public/PublicHeader.tsx\`  
\- \`src/lib/utils/geocoding.ts\` (only \`/api/inspections\` uses it)  
\- \`src/lib/email/order-notification-template.ts\`

\#\#\# Goes to ADMIN repo only (delete from public)  
\- \`src/app/admin/\*\*\` (entire tree: \`layout.tsx\`, \`page.tsx\`, \`dispatch/\`, \`inspectors/\`, \`jobs/\`, \`settings/\`)  
\- \`src/app/login/page.tsx\`  
\- \`src/app/api/auth/callback/route.ts\`  
\- \`src/app/api/auth/logout/route.ts\`  
\- \`src/app/api/employees/invite/route.ts\`  
\- \`src/components/admin/\*\*\`  
\- \`src/hooks/use-schedule-sync.ts\`  
\- \`src/lib/auth.ts\`  
\- \`src/lib/actions/\*\*\`  
\- \`src/lib/queries/\*\*\`  
\- \`src/lib/email/invite-template.ts\`  
\- \`src/lib/utils/formatting.ts\` (only admin command-center cards use it)  
\- \`src/services/\*\*\`  
\- \`src/proxy.ts\` — Next 16 middleware; only needs to exist where \`/admin\` and \`/login\` exist  
\- \`supabase/schema.sql\` — admin owns operational schema; public regenerates \`database.ts\` via \`supabase gen types typescript\`

\#\#\# Duplicated in BOTH repos (small shared surface)  
\- \`src/app/layout.tsx\` (root layout — fonts, metadata)  
\- \`src/app/globals.css\`  
\- \`src/styles/sc-bold-tokens.css\`  
\- \`src/styles/sc-bold-components.css\`  
\- \`src/lib/supabase/client.ts\`  
\- \`src/lib/supabase/server.ts\`  
\- \`src/lib/utils.ts\` (the \`cn\` helper)  
\- \`src/lib/stripe.ts\` (public uses it for checkout \+ webhook; admin uses it for payment-link creation in \`lib/actions/payment-actions.ts\`)  
\- \`src/lib/utils/pricing.ts\` (public webhook recomputes invoice totals; admin command-center \+ payment actions use the same functions)  
\- \`src/types/database.ts\` — duplicate, then keep in sync via \`supabase gen types typescript \--project-id \<id\> \> src/types/database.ts\` run in each repo when the schema changes  
\- \`src/components/ui/\*\*\` (shadcn primitives — \`button\`, \`card\`, \`checkbox\`, \`dialog\`, \`dropdown-menu\`, \`input\`, \`label\`, \`select\`, \`textarea\`, \`avatar\`, \`address-autocomplete\`). Public uses a subset (input, label, textarea, address-autocomplete) but the surface is small and self-contained, so duplicate the whole folder rather than prune.  
\- \`public/\*\*\` (favicons, logos, hero image — admin uses the logo, public uses everything)  
\- \`package.json\`, \`tsconfig.json\`, \`next.config.ts\`, \`eslint.config.mjs\`, \`postcss.config.mjs\`, \`.gitignore\`  
\- \`.env.example\` — copy then trim per repo (see env section)

\#\#\# Where duplication is the wrong fit (call-outs)  
\- \*\*\`supabase/schema.sql\`\*\*: do NOT duplicate — designate the admin repo as the schema owner. Public consumes the schema via generated types only.  
\- \*\*\`src/types/database.ts\`\*\*: technically duplicated, but the canonical source is the live Supabase project. Treat both copies as generated artifacts; never hand-edit either, always regenerate.  
\- Everything else in the shared list is small, stable, and rarely changes — duplication is fine.

\#\#\# Pre-existing bugs surfaced during research (NOT in scope, listed so you can decide)  
\- \`src/app/login/page.tsx:29\` redirects to \`/admin/dashboard\` (does not exist; real route is \`/admin\`).  
\- \`src/app/api/auth/callback/route.ts:7\` defaults \`next\` to \`/admin/dashboard\` (same).  
\- \`src/components/admin/command/CommandMetricsRow.tsx:78,87,97,107\` — links to \`/admin/dashboard?...\` (broken).  
\- \`src/app/api/employees/invite/route.ts:97\` — generates \`${siteUrl}/auth/setup-account?...\` but no \`/auth/setup-account\` route exists.

Recommend fixing the first two (\`/admin/dashboard\` → \`/admin\`) as part of step 5 below since you're touching auth flow anyway. Leave the others alone.

\---

\#\# Execution order

Each step is a checkpoint. If you stop after any step ≤ step 8, production is unchanged from today and admin still works at sellerscompliance.com/admin.

\#\#\# Step 1 — Create the new admin repo (production untouched)  
On your machine, in the parent dir of the current repo:  
\`\`\`bash  
git clone \<existing-repo-url\> sellers-compliance-admin  
cd sellers-compliance-admin  
git remote remove origin  
\# Create new empty GitHub repo "sellers-compliance-admin" via gh or web UI, then:  
git remote add origin git@github.com:\<you\>/sellers-compliance-admin.git  
git push \-u origin main  
\`\`\`  
\*\*Checkpoint:\*\* New repo on GitHub with full history, identical code. Production unchanged.  
\*\*Rollback:\*\* Delete the GitHub repo.

\#\#\# Step 2 — Spin up the admin Vercel project  
\- Create a new Vercel project, import \`sellers-compliance-admin\`.  
\- Framework: Next.js (auto-detected).  
\- Build/install settings: defaults.  
\- Env vars (Production \+ Preview \+ Development) — see env table below.  
\- Deploy. You'll get \`sellers-compliance-admin-\<hash\>.vercel.app\`.

\*\*Checkpoint:\*\* Two deployments hit the same Supabase. Old prod still serves everything. New deployment serves the same app at a \`\*.vercel.app\` URL.  
\*\*Rollback:\*\* Pause/delete the new Vercel project.

\#\#\# Step 3 — Smoke-test admin at the vercel.app URL  
\- Hit \`https://\<vercel-url\>/login\`, log in with your existing user.  
\- Confirm \`/admin\`, \`/admin/dispatch\`, \`/admin/jobs\`, \`/admin/inspectors\`, \`/admin/settings\` load.  
\- Confirm a payment-link can be created from a job (admin → Stripe).  
\- Confirm employee invite send works.

\*\*Checkpoint:\*\* Admin functionally works on the new deployment. Still no DNS or code changes anywhere visible to customers.

\#\#\# Step 4 — Strip public code from the admin repo  
In \`sellers-compliance-admin\` on a new branch \`chore/strip-public\`:  
\`\`\`bash  
git rm src/app/page.tsx  
git rm \-r src/app/order src/app/payment  
git rm \-r src/app/api/inspections src/app/api/stripe  
git rm \-r src/components/public  
git rm src/lib/email/order-notification-template.ts  
git rm src/lib/utils/geocoding.ts  
\`\`\`  
Replace \`src/app/page.tsx\` with a tiny redirect so \`/\` on admin subdomain doesn't 404:  
\`\`\`tsx  
import { redirect } from 'next/navigation'  
export default function Root() { redirect('/admin') }  
\`\`\`  
Trim \`.env.example\` to admin-only vars (see env table). Commit, push, merge to main, let Vercel deploy.

\*\*Checkpoint:\*\* Admin Vercel deploys successfully without any public code. Re-run smoke tests from step 3 at the vercel.app URL.  
\*\*Rollback:\*\* \`git revert\` the merge commit, redeploy.

\#\#\# Step 5 — Fix the admin login redirect (uses this opportunity)  
Same admin repo:  
\- \`src/app/login/page.tsx:29\`: \`window.location.assign('/admin/dashboard')\` → \`'/admin'\`  
\- \`src/app/api/auth/callback/route.ts:7\`: \`searchParams.get('next') ?? '/admin/dashboard'\` → \`?? '/admin'\`

Test locally:  
\`\`\`bash  
cd sellers-compliance-admin  
cp .env.example .env.local  \# fill in real values  
npm install  
npm run dev  
\# visit http://localhost:3000/login, sign in, confirm landing on /admin  
\`\`\`  
Commit, push, deploy.

\#\#\# Step 6 — Attach the admin subdomain  
In Vercel admin project → Settings → Domains:  
\- Add \`admin.sellerscompliance.com\`.  
\- Vercel will display a target like \`cname.vercel-dns.com\` (or an A record).

In your DNS provider:  
\- Add a CNAME: \`admin\` → \`cname.vercel-dns.com.\` (TTL 300).  
\- Wait for Vercel to verify \+ provision SSL (usually \< 5 min).

\*\*Checkpoint:\*\* \`https://admin.sellerscompliance.com/login\` works. \`https://sellerscompliance.com/admin/...\` ALSO still works (public repo unchanged). Two valid paths to admin during this overlap window — that's intentional and safe.  
\*\*Rollback:\*\* Remove the CNAME record; remove the domain in Vercel. No effect on public.

\#\#\# Step 7 — Update Supabase Auth allowed redirect URLs  
Supabase Dashboard → Authentication → URL Configuration:  
\- Add to "Redirect URLs": \`https://admin.sellerscompliance.com/api/auth/callback\`, \`https://admin.sellerscompliance.com/\*\*\`  
\- Keep the existing \`https://sellerscompliance.com/\*\*\` entries for now (removed in step 11).  
\- Site URL: change to \`https://admin.sellerscompliance.com\` (this affects only Supabase-generated email links going forward).

Test the magic-link / password-reset flow if you use either.

\#\#\# Step 8 — End-to-end test on the real subdomain  
\- Log in at \`https://admin.sellerscompliance.com/login\`.  
\- Walk every admin page and one happy-path mutation each (create a test job, drag it on the dispatch board, then delete it).  
\- Test logout.

\*\*Checkpoint:\*\* Admin is fully operational on its own subdomain. Public is still serving everything from the old repo unchanged.

\#\#\# Step 9 — Strip admin code from the public repo  
On the existing repo (the production one), branch \`chore/extract-admin\`:  
\`\`\`bash  
git rm \-r src/app/admin src/app/login  
git rm \-r src/app/api/auth src/app/api/employees  
git rm \-r src/components/admin  
git rm src/hooks/use-schedule-sync.ts  
git rm src/lib/auth.ts  
git rm \-r src/lib/actions src/lib/queries  
git rm src/lib/email/invite-template.ts  
git rm src/lib/utils/formatting.ts  
git rm \-r src/services  
git rm src/proxy.ts  
git rm supabase/schema.sql  
\`\`\`  
Trim \`.env.example\` to public-only vars. Add redirects to \`next.config.ts\`:  
\`\`\`ts  
import type { NextConfig } from 'next'  
const nextConfig: NextConfig \= {  
  async redirects() {  
    return \[  
      { source: '/admin', destination: 'https://admin.sellerscompliance.com/admin', permanent: true },  
      { source: '/admin/:path\*', destination: 'https://admin.sellerscompliance.com/admin/:path\*', permanent: true },  
      { source: '/login', destination: 'https://admin.sellerscompliance.com/login', permanent: true },  
    \]  
  },  
}  
export default nextConfig  
\`\`\`  
Run \`npm run build\` locally to confirm nothing in the remaining public code imports a deleted file. Commit, push, open PR, merge, deploy.

\*\*Checkpoint:\*\* Public site serves \`/\`, \`/order\`, \`/payment/\*\`, and the three \`/api/\*\` routes. \`/admin/\*\` and \`/login\` 301 to admin subdomain. Webhook URL unchanged → Stripe keeps delivering.  
\*\*Rollback:\*\* \`git revert\` the merge commit, redeploy. The admin subdomain keeps working independently.

\#\#\# Step 10 — Smoke-test the public site post-strip  
\- Hit \`/\`, \`/order\`, complete an order flow into Stripe Checkout (use a test card if you have a Stripe test mode toggle, otherwise hit the real flow with a tiny amount and refund).  
\- Confirm \`/admin/jobs\` redirects to \`https://admin.sellerscompliance.com/admin/jobs\`.  
\- Confirm \`/login\` redirects.

\#\#\# Step 11 — Tighten Supabase URL allow-list  
Once you've confirmed no auth callbacks land on sellerscompliance.com, remove \`https://sellerscompliance.com/\*\*\` from Supabase's Redirect URLs.

\---

\#\# Vercel env vars

| Var | Public repo | Admin repo | Notes |  
|---|---|---|---|  
| \`NEXT\_PUBLIC\_SITE\_URL\` | \`https://sellerscompliance.com\` | \`https://admin.sellerscompliance.com\` | Admin uses it to build invite-email setup URLs |  
| \`NEXT\_PUBLIC\_SUPABASE\_URL\` | ✅ | ✅ | Same value |  
| \`NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY\` | ✅ | ✅ | Same value |  
| \`SUPABASE\_SERVICE\_ROLE\_KEY\` | ✅ (\`/api/inspections\` bypasses RLS for public form) | ✅ (proxy \+ admin layout \+ invite endpoint) | Same value |  
| \`STRIPE\_SECRET\_KEY\` | ✅ (create-checkout \+ webhook) | ✅ (admin payment-link creation in \`lib/actions/payment-actions.ts\`) | Same value |  
| \`STRIPE\_WEBHOOK\_SECRET\` | ✅ | ❌ | Webhook stays on public |  
| \`NEXT\_PUBLIC\_GOOGLE\_MAPS\_API\_KEY\` | ✅ (order autocomplete) | ❌ | |  
| \`GOOGLE\_MAPS\_API\_KEY\` | ✅ (server geocoding) | ❌ | |  
| \`RESEND\_API\_KEY\` | ✅ (order notification) | ✅ (invite emails) | Same value |

Build settings for both: Next.js defaults. Preview deployments: enable for both — admin previews are now isolated and can't break public previews.

\#\# DNS — exact order  
Already covered in step 6\. Recap:  
1\. Add CNAME \`admin\` → \`cname.vercel-dns.com.\` only AFTER the admin Vercel project is built and you've added the domain in Vercel's UI.  
2\. Do NOT touch the apex (\`sellerscompliance.com\`) DNS record at any point — it keeps pointing at the existing (now public-only) Vercel project.

\#\# Auth redirect changes — what files actually change  
\- \`src/app/login/page.tsx:29\` (admin repo only): \`/admin/dashboard\` → \`/admin\`  
\- \`src/app/api/auth/callback/route.ts:7\` (admin repo only): default next → \`/admin\`  
\- \`src/proxy.ts\` (admin repo) — NO change needed; redirects are same-origin (\`/login\` ↔ \`/admin/dispatch\`) and now both live on \`admin.sellerscompliance.com\`.  
\- Public repo: no auth code remains.

The new flow:  
\`\`\`  
user → admin.sellerscompliance.com/anything-under-/admin  
  → proxy.ts checks Supabase session  
  → if not logged in: 302 to /login (same origin)  
  → login form posts to Supabase, sets cookie on admin.sellerscompliance.com  
  → window.location.assign('/admin') → command center  
\`\`\`  
Local test (admin repo): \`npm run dev\`, visit \`http://localhost:3000/admin/dispatch\`, confirm bounce to \`/login\`, sign in, land on \`/admin\`.

\#\# Rollback summary  
| After step | Rollback |  
|---|---|  
| 1–3 | Delete new GitHub repo \+ new Vercel project. Zero impact on prod. |  
| 4–5 | \`git revert\` merge commit in admin repo, redeploy. |  
| 6 | Remove CNAME, remove domain from Vercel admin project. Zero impact on public. |  
| 7 | Re-add the removed Supabase redirect entries. |  
| 9 | \`git revert\` the strip commit in public repo, redeploy. Admin subdomain keeps working in parallel. |  
| 11 | Re-add the public-domain redirect entries to Supabase. |

\#\# Explicitly NOT changing  
\- Database schema, RLS policies, Supabase project.  
\- Any business logic, pricing rules, scheduling logic.  
\- Stripe products, webhook URL, webhook secret rotation.  
\- Resend sender identity / domain.  
\- Admin UI design, public site design, brand tokens.  
\- Route names under \`/admin/\*\` (kept as-is to avoid touching every internal link).  
\- The \`/admin\` prefix itself (could flatten to \`admin.sellerscompliance.com/dispatch\` etc., but that's scope creep — stay literal).  
\- The pre-existing broken links in \`CommandMetricsRow.tsx\` and the missing \`/auth/setup-account\` route — separate fix.

\#\# Post-migration verification checklist  
Run after step 11\. Both must pass before considering this done.

\*\*Public site (sellerscompliance.com)\*\*  
\- \[ \] \`/\` loads, hero image renders, phone link works.  
\- \[ \] \`/order\` loads, address autocomplete works (Google Maps key wired), all 4 steps submit.  
\- \[ \] Submit a real test order → row appears in \`inspections\` table in Supabase.  
\- \[ \] Order notification email arrives at info@sellerscompliance.com.  
\- \[ \] \`/payment/success\` and \`/payment/cancel\` render standalone.  
\- \[ \] End-to-end: submit order → click "Pay now" path (whatever triggers \`/api/stripe/create-checkout\`) → reach Stripe Checkout → complete with test card → webhook records payment row → inspection \`payment\_status\` flips to \`paid\`.  
\- \[ \] \`https://sellerscompliance.com/admin/jobs\` returns 301 → \`https://admin.sellerscompliance.com/admin/jobs\`.  
\- \[ \] \`https://sellerscompliance.com/login\` returns 301 → admin login.  
\- \[ \] Vercel build log for public repo shows zero references to \`@/components/admin/\*\`, \`@/lib/actions/\*\`, \`@/services/\*\`.

\*\*Admin portal (admin.sellerscompliance.com)\*\*  
\- \[ \] \`/login\` loads, sign-in works, lands on \`/admin\`.  
\- \[ \] \`/admin\` (command center) renders metrics row, alerts, all cards.  
\- \[ \] \`/admin/dispatch\` loads, drag-and-drop schedule update persists.  
\- \[ \] \`/admin/jobs\` lists jobs, \`/admin/jobs/new\` creates one, \`/admin/jobs/\[id\]\` edits and deletes.  
\- \[ \] \`/admin/inspectors\` lists, create/edit/delete works.  
\- \[ \] \`/admin/settings\` lists employees, invite flow sends email via Resend.  
\- \[ \] Logout returns to \`/login\` and clears session cookie.  
\- \[ \] Visiting \`/admin/dispatch\` while signed out bounces to \`/login?redirectTo=...\`.  
\- \[ \] Vercel build log for admin repo shows zero references to \`@/components/public/\*\`, \`@/lib/email/order-notification-template\`, \`@/lib/utils/geocoding\`.

\*\*Cross-cutting\*\*  
\- \[ \] A change pushed to admin repo triggers ONLY the admin Vercel project.  
\- \[ \] A change pushed to public repo triggers ONLY the public Vercel project.  
\- \[ \] Stripe dashboard webhook still shows \`https://sellerscompliance.com/api/stripe/webhook\` and recent successful deliveries.  
\- \[ \] Supabase Auth → URL Configuration has only admin subdomain entries.  
