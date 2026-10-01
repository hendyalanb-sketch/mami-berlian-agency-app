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
      <p className="text-xs font-black tracking-[0.2em] text-[#E7508B]">MAMI BERLIAN</p>
      <h1 className="mt-2 text-2xl font-black text-[#0B1F3A]">Content Operations</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Masuk memakai akun Google yang sudah terdaftar pada whitelist internal aplikasi.</p>
      <div className="my-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={19}/><span>Login Google saja tidak cukup. Akses hanya diberikan bila email aktif di <strong>app_users</strong> Neon.</span></div>
      <GoogleSignInButton enabled={enabled} callbackUrl={params.callbackUrl ?? "/"}/>
      {params.error && <p className="mt-3 text-center text-xs font-semibold text-red-600">Akun tidak terdaftar/aktif atau autentikasi gagal.</p>}
      {!enabled && <p className="mt-3 text-center text-xs leading-5 text-amber-700">Login dikunci sampai Neon dan Google OAuth dikonfigurasi.</p>}
    </div>
  </div>;
}
