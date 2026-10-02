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

## Infrastructure state (verified 2026-10-01 via Neon + Vercel connectors)

- **Neon:** project `mami-berlian-content-ops-db` (`empty-tree-42677156`, aws-ap-southeast-1, PG 18).
  - Branch `production` (`br-solitary-salad-azl3jo27`): empty, no tables.
  - Branch `staging` (`br-muddy-math-aztg4tvi`): schema matches `drizzle/0000_mature_moira_mactaggert.sql` exactly (16 tables, all columns); seeded (7 categories, 13 skills, 5 experiences, 3 zones, 11 placements, 15 rates, 6 channels, 1 CTA, 3 settings); templates MB-01 (legacy), MB-01A, MB-01B active; 1 ADMIN user.
  - Schema had been applied without Drizzle tracking; migration `0000` is now recorded in `drizzle.__drizzle_migrations` on **staging only**, so `npm run db:migrate` will not try to recreate tables.
- **Vercel:** project `mami-berlian-content-ops` (`prj_FyXNhV1te30NgPRLQhSd7U1lwOMA`), linked to GitHub. `content-ops-v3` deploys to Production; other branches get Preview deploys.
  - All environment variables are scoped to **Production only**. Preview deployments have no env vars, so they run in "not configured" mode.
  - Production `DATABASE_URL` cannot be read (sensitive), but the staging branch shows an ADMIN login while the production branch is empty, so Production most likely points at the Neon **staging** branch. Confirm and decide before go-live (AGENTS.md rule 15).

## Canva templates

| Code | Version | Design | Purpose | Autofill fields |
|---|---|---|---|---|
| MB-01A | v5 | `DAHW1M7vzeE` | Worker profile, personal | 9 fields (incl. blank `WORKER_CODE`) |
| MB-01B | v5 | `DAHW1NniltY` | Worker profile, promo | 11 fields (incl. blank `WORKER_CODE`) |
| MB-02A | v4 | `DAHW1EbFCDY` | Catalog flyer "Ready To Interview", blue | `WORKER_PHOTO`, `WORKER_NAME`, `WORKER_POSITION`, `WORKER_PLACEMENT`, blank `WORKER_CODE` |
| MB-02B | v4 | `DAHW1Idsl-4` | Catalog flyer "Ready To Interview", pink (ART Momong / Babysitter) | same as MB-02A |

- MB-02A/B are single-page copies of `SAMPUL PEKERJA` (`DAHQAVPdSqQ`, pages 1 and 30). The source design is untouched.
- 2 Oct 2026 design pass (new copies; previous designs `DAHWxdqUjBU`, `DAHWxdxDo0A`, `DAHWz75MkSY`, `DAHWzxuSgYw` left unchanged for rollback):
  - MB-02A/B: smaller repeated headline, larger photo frame, solid footer bar with "Chat WA untuk jadwalkan interview". MB-02B name band `#AD1457`, footer `#880E4F`, placement text `#6B0F35` (all ≥4.5:1; previously 1.6–2.5:1).
  - MB-01A: 2×2 info grid instead of one overflowing row, clipped corner decorations removed; aligned to the MB-02 blue family (CTA `#1A6BD7`, 5.1:1; navy `#043372` footer with logo, website and handle).
  - MB-01B: availability as a calm tag instead of an extra orange band, narrower photo column (no text collisions).
  - The worker register code is not shown on any public design (owner decision); it stays the internal key only.
  - All four use the official logo `MAHW1Wa9OfU` (`public/brand/mami-berlian-logo.png`) whose badge interior is opaque white. The older asset `MAHW0f6LSjE` is transparent inside and disappears on coloured backgrounds.
  - Canva fonts cannot be changed through the API, so MB-01 and MB-02 still use their original typefaces.
- Text limits (`CANVA_TEXT_LIMITS` in `worker-template-render.ts`) were measured with real Autofill using the longest realistic values. Staff input limits in `COPY_FIELDS` match them.
- Templates must be re-checked with "Periksa Template" in Integrasi after re-seeding. Canva keeps the `WORKER_CODE` label in the dataset of these designs even after the element was deleted (it cannot be removed via API, copies keep it too), and the health check rejects unmapped fields. So `WORKER_CODE` stays a registered field that is always rendered as an empty string; this also blanks the code badge on older designs.

## Remaining provisioning / release blockers

1. ~~Neon target not selected~~ — resolved (see Infrastructure state).
2. ~~Dedicated Vercel project missing~~ — resolved (`mami-berlian-content-ops`).
3. **Preview environment variables are missing**, and Production vs staging database isolation needs confirming (see Infrastructure state).
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
