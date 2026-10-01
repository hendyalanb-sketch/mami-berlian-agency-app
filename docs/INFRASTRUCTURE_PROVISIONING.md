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
- Team: `Hendy Alan Budisaputra's projects`
- Team ID: `team_lLFdnuYqmlrytUMLwPeDh0aZ`
- Git provider: GitHub
- Git repository: `hendyalanb-sketch/mami-berlian-agency-app`
- Initial staging/preview source branch: `content-ops-v3`
- Do NOT reuse `web-mami-berlian2026` or another existing Vercel project.

Recommended release flow:
1. Connect the new Vercel project to the existing GitHub repository.
2. Deploy `content-ops-v3` as Preview/Staging first.
3. Keep Production gated until staging acceptance tests pass.
4. Merge to `main` only after Neon migration, OAuth callbacks, integration health, E2E, mobile QA, and smoke tests pass.

## Dedicated Neon Target
- Project name: `mami-berlian-content-ops-db`
- Purpose: exclusive Lakebase Postgres database for Content Operations v3.
- Do NOT attach the app to an unrelated existing Neon project.
- Use a dedicated default database/branch and retain a separate preview/staging branch if environment isolation is needed.

Database bootstrap order after the project exists:
1. Obtain `DATABASE_URL` from the dedicated Neon project.
2. Configure the Vercel Preview environment first.
3. Run `npm run db:migrate` against the staging/preview target.
4. Run `npm run db:seed`.
5. Verify tables/schema and application health.
6. Only after staging acceptance passes, configure Production database/environment.

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
After Vercel provides the actual deployment hostname, configure callbacks using that hostname:
- Google: `https://<app-host>/api/auth/callback/google`
- Canva: `https://<app-host>/api/integrations/canva/callback`

Do not finalize OAuth callback values before the dedicated Vercel project/hostname exists.

## Provisioning Gate
The implementation is **code-ready but not production-ready** until all of the following are true:
- [ ] Dedicated Neon project exists.
- [ ] Dedicated Vercel project exists.
- [ ] Vercel project is connected to the correct GitHub repository.
- [ ] Preview deployment uses `content-ops-v3`.
- [ ] Vercel Preview `DATABASE_URL` points only to the dedicated Neon project/branch.
- [ ] Drizzle migration succeeds.
- [ ] Seed succeeds.
- [ ] Google OAuth callback is valid.
- [ ] Canva OAuth callback is valid.
- [ ] Integration health is green.
- [ ] MB-01 dataset health passes.
- [ ] End-to-end flow passes: Register read-only → enrichment → photo → approve → Canva → Drive export → publish.
- [ ] Mobile QA 360/390/412 px passes.
- [ ] Production smoke test passes before PR merge/release.

## Safety
- Never write to the Register source sheet.
- Never commit credentials or connection strings.
- Never reuse unrelated Neon/Vercel projects just to unblock deployment.
- Never merge `content-ops-v3` into `main` solely because CI is green; runtime provisioning and staging acceptance remain mandatory.
