# Staging Runtime — Content Operations v3

Updated: 2026-10-01

## Admin bootstrap
- Initial/Admin Google account: `cvmamiberlian@gmail.com`
- Neon staging row: role `ADMIN`, `can_generate=true`, `is_active=true`

## Vercel
- Project: `mami-berlian-content-ops`
- Project ID: `prj_FyXNhV1te30NgPRLQhSd7U1lwOMA`
- Team ID: `team_lLFdnuYqmlrytUMLwPeDh0aZ`
- Production/source branch during staging: `content-ops-v3`
- App host: `https://mami-berlian-content-ops.vercel.app`
- Environment bootstrap redeploy triggered after `DATABASE_URL`, `ENCRYPTION_KEY`, and `NEXTAUTH_SECRET` were entered in Vercel on 2026-10-01.

## Neon
- Project: `mami-berlian-content-ops-db`
- Project ID: `empty-tree-42677156`
- Production branch ID: `br-solitary-salad-azl3jo27` (DO NOT USE until staging acceptance passes)
- Staging branch ID: `br-muddy-math-aztg4tvi`
- Database: `neondb`
- Region: AWS Singapore (`aws-ap-southeast-1`)
- Migration + baseline seed applied to staging only.

## Google Workspace / Drive — owner verified
Owner: `cvmamiberlian@gmail.com` (`MAMI BERLIAN CV`)

- Register source (READ ONLY): `1McK_XHx3F81LqzBfrzNWI7QECdadKBnGmXqN7en35P4`
- Content Bridge: `1ij6AI2y957PuHHsNGOi41IxWanvF63Sq7qucSWshuIA`
- Photo folder candidate: `1_36btdabS4uYwzMC1Ann2ejNlKc4Lq3J`
- Export folder candidate: `1yvDWc5T4zT21j99_AfjG7lRTwlXtCHdE`

The application intentionally requests Sheets + `drive.file`, not full Drive access. At runtime Admin must run Google integration health. If `drive.file` cannot add children to the existing photo/export folders, use `Provision Safe Folders`; the app will create app-owned folders under the same Google account and persist those IDs to `app_settings`. Never broaden to full Drive scope merely to bypass this gate.

## Canva
- Master folder: `FAHWsCPPCko`
- Source design (archive/reference): `DAHWsPb3Osk`
- Working design: `DAHWvDoKJo8`
- MB-01 remains inactive until all required autofill fields pass template health.

## Vercel runtime environment checklist
Never commit secret values.

Known non-secret values:
- `GOOGLE_REGISTER_SPREADSHEET_ID=1McK_XHx3F81LqzBfrzNWI7QECdadKBnGmXqN7en35P4`
- `GOOGLE_BRIDGE_SPREADSHEET_ID=1ij6AI2y957PuHHsNGOi41IxWanvF63Sq7qucSWshuIA`
- `GOOGLE_PHOTO_FOLDER_ID=1_36btdabS4uYwzMC1Ann2ejNlKc4Lq3J`
- `GOOGLE_EXPORT_FOLDER_ID=1yvDWc5T4zT21j99_AfjG7lRTwlXtCHdE`
- `CANVA_MASTER_FOLDER_ID=FAHWsCPPCko`
- `CANVA_MB01_SOURCE_DESIGN_ID=DAHWsPb3Osk`
- `CANVA_MB01_WORKING_DESIGN_ID=DAHWvDoKJo8`
- `NEXTAUTH_URL=https://mami-berlian-content-ops.vercel.app`
- `APP_URL=https://mami-berlian-content-ops.vercel.app`
- Google callback: `https://mami-berlian-content-ops.vercel.app/api/auth/callback/google`
- Canva callback: `https://mami-berlian-content-ops.vercel.app/api/integrations/canva/callback`

Secrets still required in Vercel:
- `DATABASE_URL` — Neon staging connection string only while staging is active
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CANVA_CLIENT_ID`
- `CANVA_CLIENT_SECRET`
- `ENCRYPTION_KEY` — base64 encoded 32-byte value
- `NEXTAUTH_SECRET`

Optional seed-only value:
- `INITIAL_ADMIN_EMAIL=cvmamiberlian@gmail.com`

## Release gate
Do not point Vercel at the Neon production branch and do not merge to `main` until Google OAuth/Drive health, Canva health, E2E, mobile QA, and smoke tests pass.
