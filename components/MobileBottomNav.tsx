// components/MobileBottomNav.tsx
// Navegação principal em telas pequenas/médias — some em md: e acima, onde a
// AppSidebar assume. Respeita a safe area do iPhone (indicador Home) via
// env(safe-area-inset-bottom); só funciona de verdade com viewport-fit=cover
// (ver app/layout.tsx#viewport).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS, findActiveNavItem } from "@/lib/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const activeItem = findActiveNavItem(pathname, MOBILE_NAV_ITEMS);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-100 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around h-14">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = activeItem?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[44px] active:bg-slate-50 transition-colors"
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-[#007BFF]" : "text-slate-400"} />
              <span
                className={`text-[10px] leading-tight truncate max-w-[64px] ${
                  isActive ? "text-[#007BFF] font-semibold" : "text-slate-400 font-medium"
                }`}
              >
                {item.mobileLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
