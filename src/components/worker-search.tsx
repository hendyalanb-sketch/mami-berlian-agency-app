"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MapPin, Search, UserRound, X } from "lucide-react";
import { Alert, ErrorAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type WorkerResult = {
  workerRegister: string;
  name: string;
  age: string;
  origin: string;
  status: string;
  legacyCategoryCode: string | null;
  categoryHint: string | null;
  categoryMappingRequired: boolean;
  infalHint: boolean;
};

export function WorkerSearch({ enabled, isAdmin = false }: { enabled: boolean; isAdmin?: boolean }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<WorkerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = query.trim();
  const queryReady = enabled && normalizedQuery.length >= 2;

  useEffect(() => {
    if (!queryReady) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/workers/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "SEARCH_FAILED");
        setItems(body.items ?? []);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "SEARCH_FAILED");
        setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, queryReady]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!enabled || value.trim().length < 2) {
      setItems([]);
      setError(null);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-base shadow-sm outline-none [&::-webkit-search-cancel-button]:hidden placeholder:text-slate-400 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10 disabled:bg-slate-50 sm:text-sm"
          placeholder="Nomor register, nama, asal, atau status"
          aria-label="Cari pekerja"
          aria-describedby="worker-search-hint"
          enterKeyHint="search"
          autoFocus={enabled}
          disabled={!enabled}
        />
        {query && <button type="button" onClick={() => handleQueryChange("")} aria-label="Hapus pencarian" className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>}
      </div>
      <p id="worker-search-hint" className="text-xs text-slate-500">{enabled && normalizedQuery.length > 0 && normalizedQuery.length < 2 ? "Ketik minimal 2 karakter." : "Maksimal 20 hasil. Ketik minimal 2 karakter."}</p>

      {!enabled && <Alert tone="warning" title="Pencarian belum aktif.">{isAdmin ? "Neon, Google OAuth, kunci enkripsi token, dan ID Register harus siap. Periksa menu Integrasi." : "Koneksi aplikasi belum siap. Hubungi Admin."}</Alert>}

      {loading && (
        <div className="grid gap-3" role="status" aria-label="Mencari pekerja">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      <ErrorAlert code={error} />

      {!loading && queryReady && !error && items.length === 0 && (
        <Card>
          <CardContent className="flex min-h-36 flex-col items-center justify-center text-center">
            <UserRound size={24} className="text-slate-400" />
            <p className="mt-2 text-sm font-semibold">Tidak ada pekerja ditemukan</p>
            <p className="mt-1 text-xs text-slate-500">Periksa ejaan nama atau coba nomor register.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((worker) => (
          <Link href={`/pekerja/${encodeURIComponent(worker.workerRegister)}`} key={worker.workerRegister} className="block rounded-2xl">
            <Card className="transition hover:border-slate-300 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-brand-navy">{worker.name || "Tanpa nama"}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{worker.workerRegister}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1"><Badge>{worker.categoryHint ?? worker.legacyCategoryCode ?? "Belum dipetakan"}</Badge><ChevronRight size={16} className="text-slate-300" aria-hidden /></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin size={13} />{worker.origin || "Asal belum ada"}</span>
                  {worker.age && <span>• {worker.age} th</span>}
                  {worker.status && <span>• {worker.status}</span>}
                </div>
                {worker.categoryMappingRequired && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800">
                    Kode lama {worker.legacyCategoryCode} belum dipetakan ke kategori. {isAdmin ? "Tambahkan di Master Data → Mapping." : "Minta Admin menambahkan mapping."}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
