"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ enabled, callbackUrl = "/" }: { enabled: boolean; callbackUrl?: string }) {
  return <Button className="w-full gap-2" disabled={!enabled} onClick={() => signIn("google", { callbackUrl })}>
    <LogIn size={18}/>Masuk dengan Google
  </Button>;
}
