// components/AppSidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Menu, X, Sparkles, LogOut } from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useCommunityMe } from "@/hooks/useCommunity";
import { NAV_ITEMS, findActiveNavItem } from "@/lib/navigation";

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { data: meData } = useCommunityMe();

  const currentItem = findActiveNavItem(pathname);

  // Limpa todo o cache do React Query antes de sair — sem isso, dados
  // privados do usuário anterior (perfil, gamificação, feed) ficariam
  // visíveis por um instante para o próximo usuário que logar no mesmo
  // navegador, já que as query keys não incluem o userId.
  const handleSignOut = () => {
    if (confirm("Deseja realmente sair?")) {
      signOut(() => {
        queryClient.clear();
        router.push("/");
      });
    }
  };

  // Identidade pública (SocialProfile) é a fonte oficial; Clerk é usado como
  // fallback temporário enquanto a query carrega.
  const sidebarDisplayName = meData?.profile?.displayName || user?.fullName || user?.firstName || "Usuário";
  const sidebarUsername = meData?.profile?.username;
  // Sempre o valor já resolvido pelo backend (customAvatarUrl ?? providerAvatarUrl)
  // — nunca um fallback ad-hoc pra user.imageUrl aqui (ver lib/community/avatar.ts).
  const sidebarAvatarUrl = meData?.profile?.avatarUrl;

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar — só em telas grandes (lg+). Em telas menores a navegação
          principal é a MobileBottomNav, para não espremer tablets/celulares. */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex flex-shrink-0 bg-white border-r border-slate-100 flex-col h-screen sticky top-0 overflow-hidden shadow-sm z-30"
      >
        {/* Logo */}
        <div
          className={`border-b border-slate-100 flex ${
            sidebarOpen ? "flex-row items-center gap-3 p-5" : "flex-col items-center gap-2 py-4"
          }`}
        >
          <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-xl flex items-center justify-center shadow-md">
            <Leaf size={20} className="text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <span className="text-lg font-bold text-slate-800">
                  SmartPlate<span className="text-[#28A745]">AI</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0 ${sidebarOpen ? "ml-auto" : ""}`}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* AI badge */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-4 mt-4 bg-gradient-to-r from-[#007BFF]/10 to-[#28A745]/10 rounded-xl p-3 border border-[#007BFF]/20"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#007BFF]" />
                <span className="text-xs font-semibold text-[#007BFF]">IA Ativa</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Plano personalizado para você</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 mt-2">
          {NAV_ITEMS.map((item) => {
            const isActive = currentItem?.href === item.href;
            return (
              <Link key={item.href} href={item.href} prefetch={item.showInMobileNav}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer ${
                    isActive ? "bg-[#007BFF] text-white shadow-md shadow-[#007BFF]/30" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-medium text-sm whitespace-nowrap">
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom user card */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
              {sidebarAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sidebarAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                sidebarDisplayName.charAt(0)
              )}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{sidebarDisplayName}</p>
                  <p className="text-xs text-slate-400 truncate">{sidebarUsername ? `@${sidebarUsername}` : user?.primaryEmailAddress?.emailAddress}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && (
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar — compacta em mobile, completa em desktop */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 sm:px-8 sm:py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{currentItem?.label || "SmartPlateAI"}</h1>
            <p className="hidden sm:block text-sm text-slate-400">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <NotificationsBell />
            <Link href="/profile">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-full flex items-center justify-center text-lg cursor-pointer overflow-hidden">
                {sidebarAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sidebarAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{sidebarDisplayName.charAt(0)}</span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content — pb extra em telas < lg para nunca ficar atrás da MobileBottomNav */}
        <main className="flex-1 overflow-auto pb-24 lg:pb-0">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
