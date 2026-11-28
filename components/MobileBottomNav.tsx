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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#e7ecee] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around h-[68px]">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = activeItem?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 min-w-0 active:bg-slate-50 transition-colors"
            >
              <item.icon size={24} strokeWidth={1.5} className={isActive ? "text-[#171817]" : "text-[#777d7e]"} />
              <span
                className={`text-[10px] min-[400px]:text-xs leading-tight truncate max-w-full px-0.5 ${
                  isActive ? "text-[#171817] font-normal" : "text-[#777d7e] font-light"
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
