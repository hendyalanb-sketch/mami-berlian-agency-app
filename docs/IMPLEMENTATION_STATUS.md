# Implementation Status — Content Operations v3

Updated: 2026-10-01
Branch: `content-ops-v3`
PR: `#1` (draft, target `main`)

## Current classification

**Code-ready, not yet production-ready.**

The application flow is implemented in the isolated branch and validated by CI. Runtime provisioning, external OAuth credentials, Canva Autofill dataset preparation, staging E2E, and production smoke test are still required before release.

## Completed in `content-ops-v3`

### Foundation & UX
- Next.js App Router + TypeScript foundation.
- Mobile-first shell, desktop sidebar, bottom navigation, PWA manifest, and safe service worker.
- Dashboard, Worker, Content, Master Data, Integration, Audit, and Settings/User Management screens.
- Public Preview screen with PII-safe projection.
- Mobile photo preparation: camera/gallery input, validation, rotation, resize/compression preview, standardized filename.

### Database & Master Data
- Neon/Drizzle technical + master schema.
- Drizzle migration committed; `app_settings` is included in migration SQL.
- Baseline master/rate seed.
- Master Admin for category, skill, experience, salary zone, placement, Register mapping, salary rate.
- Master Content for Canva template metadata, publish channels, CTA/contact profiles, and display labels.
- Active/inactive model instead of destructive delete for business masters.
- Template metadata changes fail closed: template becomes inactive until Canva health passes.
- Neon Master template is the runtime source of truth; env design ID is bootstrap fallback only.

### Auth, Roles & Audit
- Google login contract + internal whitelist/role model.
- Admin/Staff/Viewer permission helpers.
- Admin user management with self-admin protection.
- Audit UI and audit events for core worker/content/master operations.

### Google Sheets / Drive
- Server-side chunked Register read service; Register remains read-only.
- Native `MBA - CONTENT BRIDGE` read/upsert service with merge-patch semantics.
- Google OAuth token lifecycle service.
- Authenticated Drive upload/download.
- Google runtime health for Register, Bridge, photo folder, and export folder.
- Safe folder provisioning using least-privilege Drive access; no existing folder is deleted or moved.
- Photo folder can be resolved from `app_settings` with env fallback.
- Export folder can be resolved from `app_settings` with env fallback.

### Enrichment & Rules
- Worker category/experience/skills/placement enrichment.
- Salary-zone/rate resolution from Neon master.
- Readiness engine and explicit missing-field reasons.
- Publication consent gate.
- Public projection whitelist prevents sensitive fields from entering preview/Canva payload.
- Display labels from `app_settings` are reflected in Preview Publik.

### Canva Generation
- Canva OAuth Authorization Code + PKCE flow.
- Encrypted token storage and rotating refresh-token handling.
- MB-01 dataset health check for nine required Autofill fields.
- Profile-photo upload to Canva Assets.
- Autofill `create_from_design` generation.
- Content hash + worker/template/version idempotency.
- Generation job tracking, polling, retry/error state, and history screen.
- Default active CTA from Neon is used for `CTA_TEXT`.

### Export & Publish
- Canva export request/polling for final PNG.
- Final PNG archived to Google Drive.
- `export_drive_id` / `export_drive_url` written back to Content Bridge.
- Workflow gate: `GENERATED → ARCHIVED → PUBLISHED`.
- Publish is rejected before Drive export exists.
- Publish channel dropdown is sourced from active Neon master channels.
- Publish tracking and audit event support.

### Quality Gates
- Unit tests for readiness, privacy/public projection, content hash, Bridge merge, capabilities, photo validation/naming, Canva template health, permissions, serialization, and worker normalization.
- GitHub CI: dependency install → tests → ESLint → production build.
- Drizzle schema artifact workflow.
- `ACCEPTANCE_TESTS.md` replaced with 36 Content Operations v3 acceptance gates.

## External assets prepared

- Register source: `REGISTER PEKERJA MAJIKAN` — must remain READ ONLY.
- Content Bridge: `MBA - CONTENT BRIDGE`.
- Existing photo folder: `Foto Pekerja Mami Berlian`.
- Export archive folder prepared in Mami Berlian Drive: `Mami Berlian - Content Exports` (`1yvDWc5T4zT21j99_AfjG7lRTwlXtCHdE`).
- Canva master folder verified.
- MB-01 source/reference verified at 1080×1350.
- Existing MB-01 design still has no complete Autofill dataset; generation must remain locked until health passes.

## Remaining provisioning / release blockers

1. **Neon target is not selected.** The connected Neon account is unscoped and requires an explicit `project_id`; no staging migration/seed has been applied through the connector.
2. **Dedicated Vercel Content Operations project does not exist.** The connected team currently contains eight other projects; none is a dedicated Content Ops project. Existing Mami Berlian/RS projects must not be reused silently.
3. **Runtime environment variables are not provisioned** on a dedicated Preview/Staging/Production Vercel target.
4. **Google OAuth production callback/client credentials** still need provisioning in the final deployment environment.
5. **Canva OAuth client/callback credentials** still need provisioning in the final deployment environment.
6. **MB-01 Autofill fields must be created/verified non-destructively in Canva** and then activated through the app health check.
7. **Staging E2E is pending:** login → search → enrichment → photo → preview → approve → generate → export → publish.
8. **Mobile QA at 360/390/412 px is pending on a real deployment.**
9. **Production smoke test is pending.**

## Safety state

- `main` remains untouched; PR is still draft.
- Register source remains untouched/read-only.
- Existing Canva source/archive designs remain untouched by destructive operations.
- No production Neon migration has been executed.
- No existing Vercel project has been repurposed.
- No secrets are committed.
- Generate remains fail-closed until OAuth + active/healthy template are available.
- Publish remains fail-closed until final export is archived to Drive.

## Next provisioning sequence

1. Select/create dedicated Neon project and identify `project_id`.
2. Create isolated Neon staging branch; apply Drizzle migration + seed there.
3. Create dedicated Vercel project for this repository/branch strategy.
4. Add Preview/Staging env vars and OAuth callback URLs.
5. Deploy Preview/Staging.
6. Run Google health; provision safe app-owned folders if needed.
7. Connect Canva OAuth; prepare/verify nine MB-01 Autofill fields; run template health activation.
8. Execute `ACCEPTANCE_TESTS.md` on staging.
9. Only after staging passes: prepare production env/migration and production smoke test.
