# Mami Berlian Content Operations v3

Internal **Content Operations & Worker Enrichment Platform** untuk Mami Berlian Agency.

## Tujuan MVP

`Pekerja → Lengkap → Foto → Ready → Konten`

Aplikasi membaca identitas pekerja dari Google Register secara **read-only**, menyimpan enrichment ke `MBA - CONTENT BRIDGE`, memakai Neon untuk master/config/audit/job, Google Drive untuk foto/export, dan Canva sebagai design engine.

## Stack

- Next.js App Router + TypeScript
- Vercel
- Neon Postgres + Drizzle ORM
- Tailwind CSS + shadcn-style primitives
- Google Sheets / Google Drive
- Canva
- PWA mobile-first

## Branch implementasi

Pengembangan v3 dimulai di branch `content-ops-v3`. Branch ini menggantikan arah lama PHP/cPanel/full CRM untuk repository ini. Repository CRM Laravel terpisah tidak disentuh.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Setelah `DATABASE_URL` staging tersedia:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run test
npm run build
```

## Safety Rules

- Register pekerja tidak boleh ditulis pada MVP.
- Primary key lintas sistem: `worker_register`.
- PII sensitif dilarang masuk public projection/Canva.
- Schema change wajib via migration dan diuji di Neon staging/branch lebih dahulu.
- Tidak ada destructive production change tanpa approval eksplisit.
- UI wajib diuji pada 360/390/412 px.

Lihat `AGENTS.md`, `docs/IMPLEMENTATION_STATUS.md`, dan `docs/DECISION_LOG.md` untuk detail operasional.
