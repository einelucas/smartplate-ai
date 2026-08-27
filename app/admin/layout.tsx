// app/admin/layout.tsx
// Guarda de acesso do painel administrativo — checagem real no servidor
// (Server Component), mesmo padrão de app/community/moderation/page.tsx.
// As APIs por trás (lib/admin/authz.ts::requireAdmin) reforçam a mesma regra
// de novo — este layout é só a camada de navegação/UX, nunca a única defesa.
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/beta", label: "Beta Codes" },
  { href: "/admin/premium", label: "Premium Grants" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">SmartPlate Admin</h1>
            <p className="text-xs text-slate-400 mt-1">Área restrita a administradores</p>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-8 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-t-lg whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6">{children}</main>
    </div>
  );
}
