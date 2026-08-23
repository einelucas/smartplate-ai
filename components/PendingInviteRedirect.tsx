// components/PendingInviteRedirect.tsx
// O sign-in/sign-up do Clerk tem forceRedirectUrl fixo (/mealplan, /subscribe)
// e não pode ser tornado dinâmico com segurança. Para preservar o código de
// convite através da autenticação, ele é guardado no localStorage pela
// landing pública e recuperado aqui assim que o usuário estiver autenticado.
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PENDING_INVITE_STORAGE_KEY } from "@/lib/community/constants";

export default function PendingInviteRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (pathname.startsWith("/community/invite/")) return;

    let code: string | null = null;
    try {
      code = localStorage.getItem(PENDING_INVITE_STORAGE_KEY);
    } catch {
      return;
    }

    if (code) {
      router.replace(`/community/invite/${code}`);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
