// lib/navigation.ts
// Fonte única dos destinos principais — compartilhada entre AppSidebar
// (desktop) e MobileBottomNav (mobile), para nunca haver dois arrays
// divergentes quando uma rota mudar.
import { LayoutGrid, ClipboardList, ShoppingCart, Users, UserRound, ChartNoAxesColumn, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Rótulo compacto para a barra inferior — se ausente, usa `label`. */
  mobileLabel?: string;
  /** Se aparece entre os destinos principais da bottom nav mobile. */
  showInMobileNav?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: LayoutGrid, label: "Início", showInMobileNav: true },
  { href: "/mealplan", icon: ClipboardList, label: "Plano Semanal", mobileLabel: "Plano", showInMobileNav: true },
  { href: "/shopping", icon: ShoppingCart, label: "Lista de Compras", mobileLabel: "Compras", showInMobileNav: true },
  { href: "/community", icon: Users, label: "Comunidade", showInMobileNav: true },
  { href: "/progress", icon: ChartNoAxesColumn, label: "Progresso", showInMobileNav: true },
  { href: "/profile", icon: UserRound, label: "Perfil", showInMobileNav: true },
  { href: "/subscribe", icon: Sparkles, label: "Planos", showInMobileNav: false },
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.showInMobileNav);

/** Mesma regra usada para destacar item ativo em Sidebar e BottomNav — nunca duplicar critérios diferentes. */
export function findActiveNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | undefined {
  return items.find((item) => (item.href === "/" ? pathname === "/" : (pathname === item.href || pathname.startsWith(item.href + "/"))));
}
