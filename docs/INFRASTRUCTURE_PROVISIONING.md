# Infrastructure Provisioning — Mami Berlian Content Operations v3

Updated: 2026-10-01

## Decision
Content Operations v3 MUST use dedicated infrastructure. Do not reuse or repurpose existing Mami Berlian/Vercel/Neon projects.

## Source of Truth
- GitHub repository: `hendyalanb-sketch/mami-berlian-agency-app`
- Implementation branch: `content-ops-v3`
- Base branch: `main`
- Framework: Next.js
- Package: `mami-berlian-content-operations`

## Dedicated Vercel Target
- Project name: `mami-berlian-content-ops`
- Project ID: `prj_FyXNhV1te30NgPRLQhSd7U1lwOMA`
- Team: `Hendy Alan Budisaputra's projects`
- Team ID: `team_lLFdnuYqmlrytUMLwPeDh0aZ`
- Git provider: GitHub
- Git repository: `hendyalanb-sketch/mami-berlian-agency-app`
- Production-tracked implementation branch during staging: `content-ops-v3`
- Production alias: `mami-berlian-content-ops.vercel.app`
- First correct deployment from `content-ops-v3`: READY
- Do NOT reuse `web-mami-berlian2026` or another existing Vercel project.

Recommended release flow:
1. Continue validating `content-ops-v3` on the dedicated Vercel project.
2. Keep business integrations gated until staging acceptance tests pass.
3. Merge to `main` only after Neon migration, OAuth callbacks, integration health, E2E, mobile QA, and smoke tests pass.

## Dedicated Neon Target
- Project name: `mami-berlian-content-ops-db`
- Project ID: `empty-tree-42677156`
- Region: `aws-ap-southeast-1` (Singapore)
- Production branch: `production` (`br-solitary-salad-azl3jo27`)
- Staging branch: `staging` (`br-muddy-math-aztg4tvi`)
- Default database: `neondb`
- Purpose: exclusive Lakebase Postgres database for Content Operations v3.
- Do NOT attach the app to an unrelated existing Neon project.

### Staging database state
- Drizzle schema migration applied successfully to `staging` only.
- Production branch remains unmigrated/empty until staging acceptance passes.
- Baseline master seed applied successfully to `staging`.
- Verified staging seed counts:
  - 7 worker categories
  - 13 skills
  - 5 experience levels
  - 3 salary zones
  - 11 placement options
  - 6 publish channels
  - 6 register mappings
  - 15 salary rates
  - 1 Canva template metadata row
  - 1 default CTA profile

Database bootstrap order:
1. Use the dedicated Neon staging branch connection string for non-production validation.
2. Configure Vercel environment securely; never commit connection strings.
3. Verify application health and authenticated DB access.
4. Add the initial Admin account explicitly.
5. Complete OAuth and integration configuration.
6. Only after staging acceptance passes, migrate/seed Production.

## Required Runtime Environment Keys
Names are sourced from `.env.example`; secret values MUST never be committed.

### Database / Admin
- `DATABASE_URL`
- `INITIAL_ADMIN_EMAIL`

### Google
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_REGISTER_SPREADSHEET_ID`
- `GOOGLE_BRIDGE_SPREADSHEET_ID`
- `GOOGLE_PHOTO_FOLDER_ID`
- `GOOGLE_EXPORT_FOLDER_ID`

### Canva
- `CANVA_CLIENT_ID`
- `CANVA_CLIENT_SECRET`
- `CANVA_REDIRECT_URI`
- `CANVA_MASTER_FOLDER_ID`
- `CANVA_MB01_SOURCE_DESIGN_ID`
- `CANVA_MB01_WORKING_DESIGN_ID`

### Application Security / URLs
- `ENCRYPTION_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_URL`

## Callback Rules
Dedicated application hostname:
- App: `https://mami-berlian-content-ops.vercel.app`
- Google callback: `https://mami-berlian-content-ops.vercel.app/api/auth/callback/google`
- Canva callback: `https://mami-berlian-content-ops.vercel.app/api/integrations/canva/callback`

## Provisioning Gate
- [x] Dedicated Neon project exists.
- [x] Dedicated Vercel project exists.
- [x] Vercel project is connected to the correct GitHub repository.
- [x] Vercel deployment uses `content-ops-v3`.
- [x] Dedicated Neon staging branch exists.
- [x] Drizzle migration succeeds on staging.
- [x] Baseline seed succeeds on staging.
- [ ] Vercel runtime `DATABASE_URL` securely points to the dedicated Neon environment.
- [ ] Initial Admin email is explicitly configured.
- [ ] Google OAuth callback is valid.
- [ ] Canva OAuth callback is valid.
- [ ] Integration health is green.
- [ ] MB-01 dataset health passes.
- [ ] End-to-end flow passes: Register read-only → enrichment → photo → approve → Canva → Drive export → publish.
- [ ] Mobile QA 360/390/412 px passes.
- [ ] Production Neon migration/seed is approved and applied.
- [ ] Production smoke test passes before PR merge/release.

## Safety
- Never write to the Register source sheet.
- Never commit credentials or connection strings.
- Never reuse unrelated Neon/Vercel projects just to unblock deployment.
- Never migrate the production Neon branch before staging validation is complete.
- Never merge `content-ops-v3` into `main` solely because CI is green; runtime provisioning and staging acceptance remain mandatory.
