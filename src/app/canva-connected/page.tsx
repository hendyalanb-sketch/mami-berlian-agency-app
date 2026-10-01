import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Canva Terhubung" };

export default function CanvaConnectedPage() {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={28} />
          </div>
          <p className="mt-5 text-xs font-black tracking-[0.2em] text-brand-pink">MAMI BERLIAN</p>
          <h1 className="mt-2 text-2xl font-black text-brand-navy">Canva berhasil terhubung</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Otorisasi Canva sudah disimpan dengan aman. Kembali ke aplikasi untuk memvalidasi template MB-01.
          </p>
          <Link
            href="/integrasi?canva=connected"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-navy px-4 text-sm font-bold text-white"
          >
            Kembali ke Integrasi
          </Link>
          <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
            Jika sesi login sudah habis, aplikasi akan meminta login Google kembali sebelum membuka menu Integrasi.
          </p>
        </section>
      </div>
    </main>
  );
}
