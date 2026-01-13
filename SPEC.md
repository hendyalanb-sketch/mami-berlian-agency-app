# SPECIFICATION – MAMI BERLIAN AGENCY APP

## Goal
Membangun aplikasi web operasional untuk mengelola proses:
Lead → Client → Worker → Training → Matching → Placement → Contract → Payment.

## Hosting Constraint
- Shared hosting (cPanel)
- PHP 8.x
- MySQL/MariaDB
- Tidak menggunakan backend Node.js

## Roles & Access
1. Owner: full access + laporan
2. Admin Ops: data pekerja, client, placement, kontrak, pembayaran
3. Admin Medsos: lead & follow-up saja
4. Trainer: training & penilaian
5. Driver: task trip & upload bukti

## Core Rules
- Semua aktivitas operasional dicatat sebagai Task
- File upload tidak boleh diakses publik langsung
- Semua perubahan penting dicatat di audit log
- Delete data harus membersihkan file terkait

## Upload Structure
/uploads/
  /workers/{id}/photo
  /workers/{id}/ktp
  /payments/{id}/proof
  /tasks/{id}/attachments
