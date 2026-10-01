import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
const items=[["Master Data","/master"],["Integrasi","/integrasi"],["Audit","/audit"],["Pengaturan","/pengaturan"]];
export default function MorePage(){return <div className="space-y-5"><header><h2 className="text-2xl font-bold text-[#0B1F3A]">Lainnya</h2><p className="mt-1 text-sm text-slate-500">Administrasi aplikasi dan monitoring.</p></header><Card><CardContent className="p-2">{items.map(([label,href])=><Link key={href} href={href} className="flex min-h-12 items-center justify-between rounded-xl px-3 text-sm font-medium hover:bg-slate-50"><span>{label}</span><ChevronRight size={17} className="text-slate-400"/></Link>)}</CardContent></Card></div>}
