import { ShieldCheck } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getRuntimeCapabilities } from "@/modules/integrations/capabilities";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const capabilities = getRuntimeCapabilities();
  const enabled = capabilities.database.configured && capabilities.googleOAuth.configured;
  return <div className="mx-auto flex min-h-[85vh] max-w-md items-center px-4">
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-black tracking-[0.2em] text-brand-pink">MAMI BERLIAN</p>
      <h1 className="mt-2 text-2xl font-black text-brand-navy">Content Operations</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Masuk memakai akun Google yang sudah terdaftar pada whitelist internal aplikasi.</p>
      <div className="my-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={19}/><span>Hanya email yang sudah didaftarkan Admin yang bisa masuk. Belum punya akses? Hubungi Admin Mami Berlian.</span></div>
      <GoogleSignInButton enabled={enabled} callbackUrl={params.callbackUrl ?? "/"}/>
      {params.error && <p role="alert" className="mt-3 text-center text-xs font-semibold leading-5 text-red-600">Email ini belum terdaftar atau sudah dinonaktifkan. Minta Admin menambahkan email Anda di Pengaturan, lalu coba lagi.</p>}
      {!enabled && <p className="mt-3 text-center text-xs leading-5 text-amber-700">Login belum bisa dipakai karena aplikasi belum selesai dikonfigurasi. Hubungi Admin.</p>}
    </div>
  </div>;
}
