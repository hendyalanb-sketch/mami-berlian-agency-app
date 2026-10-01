"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, UserRound, AlertCircle, MapPin } from "lucide-react";
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

export function WorkerSearch({ enabled }: { enabled: boolean }) {
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
      <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Cari nomor register, nama, asal, atau status"
          disabled={!enabled}
        />
      </div>

      {!enabled && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Pencarian aktif setelah Neon, Google OAuth, enkripsi token, dan ID Register siap.
        </p>
      )}

      {loading && (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error === "GOOGLE_RECONNECT_REQUIRED" ? "Akun Google perlu dihubungkan ulang." : "Pencarian Register belum dapat dijalankan."}</span>
        </div>
      )}

      {!loading && queryReady && !error && items.length === 0 && (
        <Card>
          <CardContent className="flex min-h-36 flex-col items-center justify-center text-center">
            <UserRound size={24} className="text-slate-400" />
            <p className="mt-2 text-sm font-semibold">Tidak ada pekerja ditemukan</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((worker) => (
          <Link href={`/pekerja/${encodeURIComponent(worker.workerRegister)}`} key={worker.workerRegister}>
            <Card className="transition hover:border-slate-300 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0B1F3A]">{worker.name || "Tanpa nama"}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{worker.workerRegister}</p>
                  </div>
                  <Badge>{worker.categoryHint ?? worker.legacyCategoryCode ?? "UNMAPPED"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin size={13} />{worker.origin || "Asal belum ada"}</span>
                  {worker.age && <span>• {worker.age} th</span>}
                  {worker.status && <span>• {worker.status}</span>}
                </div>
                {worker.categoryMappingRequired && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800">
                    Legacy code {worker.legacyCategoryCode} perlu Mapping Register oleh Admin.
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
