# ACCEPTANCE TESTS — MAMI BERLIAN CONTENT OPERATIONS v3

Dokumen ini adalah acceptance gate MVP. Scope v3: **Worker Register → Enrichment → Photo → Preview/Approval → Canva → Export → Publish Tracking**.

## A. Auth, Role, dan Safety

- **AT-01 — Login whitelist:** hanya email aktif pada `app_users` yang dapat masuk.
- **AT-02 — Role access:** Admin dapat Master/Audit/User Management; Staff tidak dapat operasi Admin-only; Viewer tidak dapat mengubah enrichment.
- **AT-03 — Register read-only:** pencarian/detail pekerja tidak pernah menulis ke spreadsheet `REGISTER PEKERJA MAJIKAN`.
- **AT-04 — Universal key:** semua Bridge, foto, job, audit, dan export memakai `worker_register`, bukan nama pekerja.

## B. Worker Enrichment

- **AT-05 — Worker search:** pencarian pekerja dari Register dapat dibuka dari HP dan desktop.
- **AT-06 — Bridge upsert aman:** simpan category/experience/skills/placement/consent tidak mengosongkan field Bridge lain.
- **AT-07 — Master-driven options:** kategori, skill, experience, placement, zone, dan rate di UI berasal dari Neon Master Data.
- **AT-08 — Salary rule:** category + experience + placement menghasilkan range gaji dari rate aktif sesuai tanggal efektif.
- **AT-09 — Readiness:** status hanya READY bila field wajib lengkap; alasan field yang kurang ditampilkan.

## C. Photo dan Privacy

- **AT-10 — Photo preparation:** upload/camera melakukan validasi, resize/compress, preview, dan naming `[REGISTER] - [NAMA] - [TYPE]`.
- **AT-11 — Drive storage:** foto tersimpan ke folder Drive yang lolos health check dan dapat dibaca ulang.
- **AT-12 — Public projection:** NIK/KTP, alamat lengkap, nomor HP, kontak darurat, scan dokumen, dan catatan sensitif tidak masuk preview/Canva payload.
- **AT-13 — Consent gate:** konten tidak dapat Ready/Approve tanpa izin publikasi.

## D. Approval dan Canva

- **AT-14 — Approval gate:** hanya Admin dapat approve dan approval ditolak bila readiness belum lengkap.
- **AT-15 — Template fail-closed:** Template Canva yang baru/diubah otomatis nonaktif sampai dataset health check valid.
- **AT-16 — MB-01 dataset:** health check memerlukan `WORKER_PHOTO`, `WORKER_NAME`, `WORKER_AGE`, `WORKER_ORIGIN`, `WORKER_CATEGORY`, `WORKER_SKILLS`, `WORKER_PLACEMENT`, `WORKER_SALARY`, dan `CTA_TEXT` dengan tipe benar.
- **AT-17 — Master template source:** design ID/version dari Neon Master menjadi source of truth; environment hanya fallback bootstrap.
- **AT-18 — Generation:** pekerja APPROVED dapat menghasilkan design Canva baru dan status Bridge menjadi GENERATED setelah job sukses.
- **AT-19 — Idempotency:** worker + template version + content hash yang sama tidak membuat duplikasi job/design tanpa alasan.
- **AT-20 — CTA:** `CTA_TEXT` berasal dari CTA default aktif di Neon.

## E. Export dan Publish

- **AT-21 — Export:** design GENERATED dapat diekspor sebagai PNG dan diarsipkan ke Google Drive.
- **AT-22 — Bridge export reference:** `export_drive_id` dan `export_drive_url` tersimpan setelah export sukses; status menjadi ARCHIVED.
- **AT-23 — Publish gate:** Mark Published ditolak sebelum export/ARCHIVED.
- **AT-24 — Channel master:** dropdown publish hanya menampilkan channel aktif dari Neon Master Data.
- **AT-25 — Publish tracking:** channel, timestamp, user, dan status PUBLISHED tersimpan serta tercatat di audit trail.

## F. Master Data dan Integrasi

- **AT-26 — Master CRUD/toggle:** Admin dapat mengelola kategori, skill, experience, zone, placement, mapping, rate, channel, CTA, template Canva, dan display text tanpa menulis Register.
- **AT-27 — Display text:** perubahan headline/label/footer di Master tampil pada Preview Publik.
- **AT-28 — Google health:** health check membedakan Register, Content Bridge, folder foto, dan folder export; akses yang tidak cukup harus terlihat UNHEALTHY.
- **AT-29 — Safe folder provisioning:** Admin dapat membuat folder aplikasi sendiri bila resource Drive existing tidak dapat dipakai dengan scope sempit; tidak ada folder lama yang dihapus/dipindah.
- **AT-30 — Canva OAuth:** PKCE connect/callback/token refresh berjalan dan rotating refresh token tersimpan terenkripsi.

## G. Audit, PWA, dan Release

- **AT-31 — Audit:** enrichment, foto, approval, master change, generation, export, dan publish memiliki event audit yang dapat ditelusuri.
- **AT-32 — PWA/mobile:** alur utama usable pada lebar 360/390/412 px tanpa horizontal overflow dan target sentuh utama minimal nyaman digunakan.
- **AT-33 — CI gate:** unit test, ESLint, production build, dan schema artifact harus hijau pada branch release.
- **AT-34 — Schema gate:** migration Drizzle mencerminkan schema aplikasi termasuk `app_settings`; migration staging berhasil sebelum production.
- **AT-35 — Environment isolation:** Preview/Staging/Production memakai DB/env terpisah dan tidak melakukan mutation production dari preview.
- **AT-36 — Production smoke test:** login → cari pekerja → enrichment → foto → preview → approve → generate → export → publish berhasil dengan satu data uji yang disetujui.

## Definition of Done

MVP hanya dinyatakan **DONE** setelah seluruh acceptance test yang memerlukan runtime eksternal diuji pada staging dan production smoke test berhasil. CI hijau saja berarti **code-ready**, bukan otomatis production-ready.
