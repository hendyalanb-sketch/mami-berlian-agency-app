# Decision Log

## D-019 — 2026-10-01 — Safe repository refactor
The existing `mami-berlian-agency-app` repository is used as the migration container because it is a small legacy PHP/cPanel draft. Implementation is isolated on `content-ops-v3`; the active Laravel CRM repository is not touched.

## D-020 — 2026-10-01 — Native Content Bridge created
`MBA - CONTENT BRIDGE` is a dedicated native Google Sheet. Register remains read-only. Bridge spreadsheet ID: `1ij6AI2y957PuHHsNGOi41IxWanvF63Sq7qucSWshuIA`.

## D-021 — 2026-10-01 — Canva source preserved
The existing Canva source design `DAHWsPb3Osk` is treated as immutable source/reference. It currently has no autofill dataset. A non-destructive copy will become MB-01 once fields are labeled and user-approved in Canva editing flow.
