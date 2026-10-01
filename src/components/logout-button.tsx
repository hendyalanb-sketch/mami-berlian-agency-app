"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50">
    <span>Keluar</span><LogOut size={17}/>
  </button>;
}
