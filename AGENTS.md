# AI AGENT INSTRUCTIONS — MAMI BERLIAN CONTENT OPERATIONS v3

## Source of truth
Implementasi mengikuti Rencana Induk v3 tanggal 1 Oktober 2026. v3 menggantikan rencana lama yang mengarah ke PHP/cPanel/full CRM.

## Architecture
- Next.js App Router + TypeScript, deploy ke Vercel.
- Neon Postgres + Drizzle untuk technical/master/audit/job DB.
- Google Sheet `REGISTER PEKERJA MAJIKAN` adalah sumber identitas/status dan READ ONLY pada MVP.
- `MBA - CONTENT BRIDGE` menyimpan enrichment/publikasi.
- Google Drive menyimpan foto dan export.
- Canva adalah design engine.

## Grounded integration IDs
- Register spreadsheet: `1McK_XHx3F81LqzBfrzNWI7QECdadKBnGmXqN7en35P4`
- Content Bridge: `1ij6AI2y957PuHHsNGOi41IxWanvF63Sq7qucSWshuIA`
- Photo folder: `1_36btdabS4uYwzMC1Ann2ejNlKc4Lq3J`
- Canva master folder: `FAHWsCPPCko`
- MB-01 source design: `DAHWsPb3Osk`

## Non-negotiable rules
1. Inspect GitHub, Neon, Vercel before changes.
2. Never write to Register in MVP.
3. Universal key is `worker_register`; never match by name.
4. Business options come from Neon master data, never hardcoded in production UI.
5. Do not send NIK/KTP, complete address, worker phone, emergency contacts, identity scans, or sensitive family/internal notes to Canva/public projection.
6. All DB schema changes go through Drizzle migration and are tested outside production first.
7. Never run destructive production changes autonomously.
8. Mobile-first: validate 360/390/412 px before UI done.
9. Prefer Active/Inactive over hard delete for masters.
10. Preview public projection before Canva generation.
11. Generation uses worker_register + template_version + content_hash idempotency.
12. Record override, approval, generation, and publish events in audit trail.
13. Do not expand MVP into full CRM/accounting/payroll/travel/contract lifecycle.
14. All user-facing errors must be actionable.
15. Keep staging and production isolated.

## Implementation order
Foundation → Design System → DB/Master → Auth/Role → Register Read → Bridge → Rule Engine → Photo → Preview/Approval → Canva → Export → Publish Tracking → PWA → Hardening.

## Current blockers
- Neon target project/branch has not yet been selected through the connected Neon account.
- Vercel project for Content Operations has not yet been created.
- Canva MB-01 source design has no autofill dataset yet and must be copied/labeled non-destructively before generation is enabled.
