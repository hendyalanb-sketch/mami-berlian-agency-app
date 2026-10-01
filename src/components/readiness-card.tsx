import { Check, CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = ["Data", "Kategori", "Keahlian", "Penempatan", "Foto", "Consent"];
export function ReadinessCard() {
  return <Card><CardHeader><CardTitle>Kesiapan Konten</CardTitle></CardHeader><CardContent><div className="mb-4 flex items-end justify-between"><div><p className="text-3xl font-bold text-[#0B1F3A]">—</p><p className="text-xs text-slate-500">Status dihitung dari mandatory rules</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Belum disinkronkan</span></div><div className="space-y-2">{items.map((item)=><div key={item} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{item}</span>{item === "Data" ? <Check size={17} className="text-emerald-600"/> : <CircleAlert size={17} className="text-slate-300"/>}</div>)}</div></CardContent></Card>;
}
