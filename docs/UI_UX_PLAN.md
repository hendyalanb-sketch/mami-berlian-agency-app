# UI/UX Improvement Plan — Content Operations v3

Dibuat: 2026-10-01
Status: **Draft — menunggu persetujuan**
Ruang lingkup: perbaikan UI/UX pada aplikasi yang sudah ada. Tidak menambah modul baru di luar MVP (AGENTS.md #13), tidak mengubah skema DB, tidak menulis ke Register.

## Tujuan

1. Staf bisa menyelesaikan alur **Pekerja → Lengkap → Foto → Preview → Approve → Generate → Export → Publish** dari HP tanpa bingung "langkah berikutnya apa" atau "kenapa tombol ini terkunci".
2. Semua error yang dilihat user berbahasa Indonesia dan menyebut tindakan perbaikan (AGENTS.md #14).
3. Layar lolos cek 360 / 390 / 412 px dan desktop ≥1024 px (AGENTS.md #8).

## Prinsip

- Tiap fase = satu PR kecil ke `content-ops-v3`, CI hijau (test + lint + build) sebelum lanjut.
- Tidak ada perubahan perilaku backend kecuali yang disebut eksplisit. Kode error API tetap; terjemahan dilakukan di UI.
- Label status/kode tampil via kamus terpusat, bukan string tersebar.
- Opsi bisnis tetap dari Neon master (AGENTS.md #4).

---

## Fase 1 — Perbaikan kritis (bug & error)

| # | Perubahan | File utama | Kriteria selesai |
|---|---|---|---|
| 1.1 | Halaman Konten menampilkan **MB-01A dan MB-01B** (bukan `MB-01`), masing-masing dengan status aktif/terkunci, versi, dan design ID. | `src/app/konten/page.tsx` | Template aktif tampil "Siap"; tidak ada query ke kode `MB-01`. |
| 1.2 | Primitive `Input`, `Select`, `Textarea` dengan `text-base sm:text-sm` (≥16px di mobile) agar iOS tidak auto-zoom. Ganti semua input/select manual. | `src/components/ui/input.tsx` (baru), semua komponen form | `grep` tidak menemukan `<input`/`<select` dengan `text-sm` tanpa `text-base` di mobile. |
| 1.3 | Sidebar desktop memuat semua menu sesuai role (Audit, Pengaturan untuk Admin) + info user + tombol Logout. | `src/components/app-shell.tsx`, `src/app/layout.tsx` | Admin & Staff bisa logout dari desktop. |
| 1.4 | Highlight menu aktif memakai prefix (`/pekerja/...` → Pekerja aktif, `/preview/...` → Pekerja, `/master`, `/audit`, dll. → Lainnya di mobile). | `src/components/app-shell.tsx` | Tab aktif benar di semua route. |
| 1.5 | **Kamus error** `errorMessage(code)` → `{ title, action, href? }` untuk semua kode yang dikembalikan API (mis. `GOOGLE_RECONNECT_REQUIRED`, `CANVA_RECONNECT_REQUIRED`, `TEMPLATE_UNHEALTHY`, `CONTENT_NOT_APPROVED`, `PROFILE_PHOTO_REQUIRED`, `EXPORT_REQUIRED_BEFORE_PUBLISH`, `RATE_NOT_FOUND`, `GENERATION_POLL_TIMEOUT`, …). Komponen `ErrorAlert` menampilkan pesan + tombol aksi. Fallback: "Terjadi kesalahan (KODE). Coba lagi atau hubungi Admin." | `src/lib/error-messages.ts` (baru) + test, `src/components/ui/alert.tsx` (baru), semua komponen client | Tidak ada kode error mentah yang tampil sendirian; unit test memastikan semua kode yang dikenal punya pesan. |
| 1.6 | Upload foto memperbarui kesiapan konten tanpa reload: detail pekerja memakai satu state bersama (atau `router.refresh()` + refetch enrichment setelah upload sukses). Kirim `workerName` ke `WorkerPhotoPrep` agar nama file tidak "PEKERJA". | `src/app/pekerja/[register]/page.tsx`, `worker-enrichment-flow.tsx`, `worker-photo-prep.tsx` | Setelah upload, skor & daftar "kurang" berubah seketika. |
| 1.7 | Preview: ganti `catch {}` kosong dengan penanganan per penyebab (Google perlu dihubungkan ulang, pekerja tidak ditemukan, Bridge gagal dibaca) memakai kamus error. | `src/app/preview/[register]/page.tsx` | Tiap penyebab menampilkan pesan & aksi berbeda. |
| 1.8 | `loading.tsx` (skeleton) dan `error.tsx` (pesan + "Coba lagi") untuk route server yang lambat: `/konten`, `/preview/[register]`, `/pekerja/[register]`, `/audit`. | `src/app/**/loading.tsx`, `error.tsx` | Navigasi menampilkan skeleton, bukan layar kosong. |

## Fase 2 — Bahasa, status & komponen dasar

| # | Perubahan | File utama | Kriteria selesai |
|---|---|---|---|
| 2.1 | Token warna merek di Tailwind (`brand-navy`, `brand-pink`, dst.) dari variabel di `globals.css`; ganti hex hardcode. | `src/app/globals.css`, semua komponen | Tidak ada `#0B1F3A`/`#E7508B` hardcode di komponen. |
| 2.2 | `StatusBadge` + kamus status: `INCOMPLETE`→"Belum lengkap" (abu), `READY`→"Siap review" (biru), `APPROVED`→"Disetujui" (hijau muda), `GENERATING`→"Sedang dibuat" (kuning), `GENERATED`→"Desain jadi" (biru), `ARCHIVED`→"Tersimpan di Drive" (hijau), `PUBLISHED`→"Terpublikasi" (hijau tua), `ERROR`→"Gagal" (merah). Juga status template, user (Aktif/Nonaktif), job generate. | `src/lib/status-labels.ts` (baru) + test, `src/components/ui/status-badge.tsx` (baru) | Tidak ada badge berisi kode status mentah. |
| 2.3 | Nama field readiness yang manusiawi: `category`→"Kategori", `profile_photo`→"Foto profil", `publication_consent`→"Izin publikasi", dst. Tiap item bisa diklik → scroll & fokus ke field. | `src/modules/rules/readiness.ts` (label), `worker-enrichment-flow.tsx`, `worker-content-actions.tsx` | Daftar "kurang" berbahasa Indonesia dan dapat diklik. |
| 2.4 | Konsistensi bahasa UI: "Approve Konten"→"Setujui Konten", "Mark Published"→"Tandai Sudah Dipublikasi", "Can Generate"→"Boleh Generate", "Configured"→"Terkonfigurasi", jenis foto PROFILE/FULLBODY/TRAINING/OTHER → "Profil/Seluruh badan/Pelatihan/Lainnya". | komponen terkait | Tidak ada label UI berbahasa Inggris kecuali nama produk (Canva, Google Drive). |
| 2.5 | Semua field form punya `<label>` terlihat (bukan hanya placeholder), tombol toggle skill memakai `aria-pressed`. | `master-data-manager.tsx`, `content-master-manager.tsx`, `user-management.tsx`, `worker-enrichment-flow.tsx` | Audit Lighthouse aksesibilitas tanpa error label. |

## Fase 3 — Alur kerja pekerja

| # | Perubahan | File utama | Kriteria selesai |
|---|---|---|---|
| 3.1 | **Stepper alur** di detail pekerja & preview: Data → Foto → Preview → Setujui → Generate → Export → Publikasi. Tiap langkah: ✓ selesai / ● sekarang / 🔒 terkunci + alasan singkat. Di mobile: progress ringkas + langkah aktif; di desktop: horizontal penuh. | `src/components/workflow-stepper.tsx` (baru), `src/modules/workflow/steps.ts` (baru, logika murni + test) | Status langkah dihitung dari `content_status` + readiness; unit test untuk tiap status. |
| 3.2 | Form enrichment: tandai field wajib yang kosong (bukan hanya tombol disable), toast/inline "Tersimpan ✓" setelah berhasil, peringatan `beforeunload` bila ada perubahan belum disimpan. Tombol Simpan sticky di bawah layar mobile. | `worker-enrichment-flow.tsx` | Staf tahu field mana yang kurang tanpa menebak. |
| 3.3 | Hirarki tombol Workflow Konten: satu aksi utama per tahap (primary), sisanya secondary. Aksi yang belum relevan disembunyikan dan digantikan oleh teks "Langkah berikutnya: …". | `worker-content-actions.tsx` | Pada tiap status hanya ada satu tombol primary. |
| 3.4 | Foto: tampilkan foto profil yang sudah tersimpan (thumbnail dari `/api/workers/[register]/photo?type=PROFILE`) dengan opsi "Ganti foto". Satukan langkah "Putar" + "Siapkan" + "Upload" jadi alur dua tombol (Putar, Simpan Foto). | `worker-photo-prep.tsx` | Staf langsung melihat apakah foto sudah ada. |
| 3.5 | Generate yang melewati 30 detik tidak dianggap gagal: tampilkan "Masih diproses di Canva" + tautan ke Konten; lanjutkan polling dengan backoff sampai batas wajar (mis. 2 menit). | `worker-content-actions.tsx` | Tidak ada error `GENERATION_POLL_TIMEOUT` untuk job yang sebenarnya masih berjalan. |
| 3.6 | Gabungkan konteks: tombol "Preview & Konten" di detail pekerja menampilkan status saat ini; halaman preview punya tombol kembali ke langkah yang belum lengkap. | `pekerja/[register]/page.tsx`, `preview/[register]/page.tsx` | Navigasi bolak-balik jelas. |

## Fase 4 — Dashboard & halaman admin

| # | Perubahan | File utama | Kriteria selesai |
|---|---|---|---|
| 4.1 | Dashboard: kotak cari jadi link ke `/pekerja` (autofocus), "Lihat Integrasi" jadi link nyata, kartu "Perlu Dikerjakan" berdasar status integrasi aktual (tidak tampil bila sudah tersambung). Angka metrik dari Neon `generation_jobs` (job hari ini, gagal, selesai); metrik yang belum ada sumbernya disembunyikan, bukan "—". | `src/app/page.tsx` | Tidak ada elemen yang terlihat interaktif tapi tidak bisa diklik. |
| 4.2 | Pencarian pekerja: hint "minimal 2 karakter", tombol hapus (×), pesan konfigurasi teknis hanya untuk Admin (Staff: "Hubungi Admin"). | `worker-search.tsx`, `pekerja/page.tsx` | — |
| 4.3 | Master Data dibagi tab: **Pekerja** (kategori, skill, pengalaman) · **Gaji** (zona, penempatan, rate) · **Mapping** · **Konten** (template, channel, CTA, label). Toggle Aktif/Nonaktif jadi tombol jelas + konfirmasi. Edit nama item. "Kode target" mapping jadi dropdown dari master aktif. | `src/app/master/page.tsx`, `master-data-manager.tsx`, `content-master-manager.tsx`, `src/app/api/master/route.ts` (edit nama, tercatat audit) | Halaman master di 360 px tidak lebih dari ~2 layar per tab. |
| 4.4 | Integrasi: satu checklist berurutan (Neon → Google → Drive → Canva → Template) dengan tombol aksi per baris; hilangkan duplikasi kartu. | `src/app/integrasi/page.tsx`, kontrol Google/Canva | Satu sumber status per integrasi. |
| 4.5 | Audit log: label aksi berbahasa Indonesia, filter berdasarkan `worker_register`. | `src/app/audit/page.tsx` | — |
| 4.6 | Kerapian: format ulang file satu-baris (`worker-photo-prep.tsx`, `pekerja/[register]/page.tsx`, `publish/service.ts`), hapus `readiness-card.tsx` yang tidak dipakai. | — | Tidak ada perubahan perilaku. |

## Fase 5 — Verifikasi

1. **Unit test** untuk logika baru: kamus error, kamus status, langkah workflow.
2. **Cek visual otomatis** dengan Playwright di 360 / 390 / 412 / 1280 px: halaman login + galeri komponen dev (lihat Keputusan D2). Screenshot dilampirkan di tiap PR.
3. **Staging** (setelah Neon + Vercel tersedia): jalankan `ACCEPTANCE_TESTS.md` end-to-end di HP nyata.

---

## Keputusan yang perlu disetujui

| ID | Pertanyaan | Rekomendasi |
|---|---|---|
| D1 | Metrik dashboard: ambil dari Neon saja (`generation_jobs`) atau juga hitung dari Register/Bridge (lebih lengkap, tapi baca Sheet setiap buka dashboard)? | Neon saja untuk MVP; metrik Register menyusul. |
| D2 | Karena staging belum ada, boleh dibuat halaman **galeri komponen dev-only** (`/dev/ui`, data contoh, mati otomatis di production) agar UI bisa dicek di 360/390/412 px sekarang? | Ya — tanpa data asli, tanpa PII, diblok saat `NODE_ENV=production`. |
| D3 | Aksi yang belum tersedia: **disembunyikan** atau **ditampilkan terkunci dengan alasan**? | Disembunyikan di Workflow Konten, alasannya tampil di stepper. |
| D4 | Edit nama master data (Fase 4.3) menyentuh API master — boleh? | Ya, dengan audit event; kode tetap tidak bisa diubah. |

## Di luar ruang lingkup

- Perubahan skema Neon / migrasi.
- Fitur CRM, payroll, kontrak, dsb. (AGENTS.md #13).
- Penulisan ke Register.
- Provisioning Neon/Vercel/OAuth (tetap di `docs/IMPLEMENTATION_STATUS.md`).
