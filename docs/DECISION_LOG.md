# Decision Log — Content Operations v3

## D-001 — 2026-10-01
Use `mami-berlian-agency-app` branch `content-ops-v3` as the isolated implementation branch. The legacy PHP/cPanel main branch is not replaced until review and validation.

## D-002 — 2026-10-01
`REGISTER PEKERJA MAJIKAN / Register Pekerja` remains READ ONLY. All enrichment is written to `MBA - CONTENT BRIDGE`.

## D-003 — 2026-10-01
Universal worker key is a canonicalized `worker_register` (trimmed, uppercased, spacing around hyphens removed). The raw Register value remains available for traceability and the source Sheet is never silently rewritten.

## D-004 — 2026-10-01
Only legacy category mappings explicitly supported by the v3 source plan are auto-resolved: `ART → ART`, `SUSBY → BABYSITTER`, and `SUSL → SUSTER_LANSIA`. Observed codes `SUSBL`, `SUSPP`, and `PRT` remain unmapped until an Admin-defined mapping exists. Suffix `INFAL` is surfaced as a review hint rather than guessed into a category.

## D-005 — 2026-10-01
Canva source `DAHWsPb3Osk` remains untouched until a safe copy/autofill template can be provisioned. Generation must fail closed when template health is not valid.

## D-006 — 2026-10-01
Generated Drizzle migrations are version-controlled in the implementation branch and schema changes must be generated/tested before any Neon production application.
