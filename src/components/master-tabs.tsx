"use client";

import { useEffect, useState } from "react";
import { ContentMasterManager } from "@/components/content-master-manager";
import { MasterDataManager, type MasterSection } from "@/components/master-data-manager";
import { cn } from "@/lib/utils";

type Tab = MasterSection | "konten";
const TABS: Array<{ key: Tab; label: string; description: string }> = [
  { key: "pekerja", label: "Pekerja", description: "Kategori, keahlian, pengalaman" },
  { key: "gaji", label: "Gaji", description: "Zona, penempatan, rate" },
  { key: "mapping", label: "Mapping", description: "Kode lama Register" },
  { key: "konten", label: "Konten", description: "Template, channel, CTA, label" },
];
const isTab = (value: string): value is Tab => TABS.some((tab) => tab.key === value);

export function MasterTabs({ enabled }: { enabled: boolean }) {
  const [tab, setTab] = useState<Tab>("pekerja");

  // Tab tersimpan di hash URL agar bisa dibagikan/di-refresh (mis. /master#gaji).
  useEffect(() => {
    const sync = () => { const hash = window.location.hash.slice(1); if (isTab(hash)) setTab(hash); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function select(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  return <div className="space-y-4">
    <div role="tablist" aria-label="Bagian Master Data" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
      {TABS.map((item) => <button key={item.key} type="button" role="tab" id={`tab-${item.key}`} aria-selected={tab === item.key} aria-controls="master-panel" onClick={() => select(item.key)} className={cn("min-h-12 shrink-0 rounded-xl border px-4 py-2 text-left", tab === item.key ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
        <span className="block text-sm font-bold">{item.label}</span>
        <span className={cn("hidden text-[11px] sm:block", tab === item.key ? "text-white/70" : "text-slate-500")}>{item.description}</span>
      </button>)}
    </div>
    <div id="master-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === "konten" ? <ContentMasterManager enabled={enabled} /> : <MasterDataManager enabled={enabled} section={tab} />}
    </div>
  </div>;
}
