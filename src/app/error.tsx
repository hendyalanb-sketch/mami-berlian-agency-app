"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="mx-auto max-w-lg space-y-4 py-10">
    <Alert tone="error" title="Halaman ini gagal dimuat.">
      <p>Biasanya karena koneksi internet atau layanan Google/Neon sedang lambat. Coba muat ulang. Jika berulang, hubungi Admin{error.digest ? ` dan sebutkan kode ${error.digest}` : ""}.</p>
    </Alert>
    <div className="flex gap-2"><Button onClick={reset}>Coba lagi</Button><Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800">Ke Beranda</Link></div>
  </div>;
}
