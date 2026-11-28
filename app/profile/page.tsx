"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, LogOut, Plug, Zap, type LucideIcon } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useHydrationSummary } from "@/hooks/useHydration";
import Avatar from "@/components/social/Avatar";
import ProfileLoading from "./loading";
import styles from "./profile.module.css";

const EditProfileModal = dynamic(() => import("@/components/EditProfileModal"), { ssr: false });

type Meal = { calories?: number; proteina?: number; completed?: boolean };
type Day = { day: string; breakfast?: Meal | null; lunch?: Meal | null; dinner?: Meal | null; snacks?: Meal[] | null };
type Plan = { calories?: number; days?: Day[] };

const format = (n: number | undefined, digits = 0) => n === undefined ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const fraction = (value: number | undefined, goal: number | undefined) => valid(value) && valid(goal) && goal > 0 ? clamp(value / goal) : 0;

function WeightGoal({ start, current, target }: { start?: number; current?: number; target?: number }) {
  const ready = valid(start) && valid(current) && valid(target);
  const progress = ready ? (start === target ? Number(current === target) : clamp((current - start) / (target - start))) : 0;
  const remaining = ready ? Math.max(0, target === start ? Math.abs(current - target) : (target - current) * Math.sign(target - start)) : undefined;
  return <section className={styles.card + " " + styles.goal} aria-label="Meta de peso">
    <div className={styles.muted}>Meta de peso</div>
    <div className={styles.goalHeadline}>
      <div className={styles.goalAmount}><span>{format(remaining, 1)}</span><small>{remaining === 0 ? "meta atingida" : "kg restantes"}</small></div>
      <span className={styles.muted}>{ready ? Math.round(progress * 100) + "% concluído" : "Sem meta"}</span>
    </div>
    <div className={styles.scale} role="meter" aria-label="Progresso da meta de peso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready ? Math.round(progress * 100) : undefined}>
      <div className={styles.weightTrack}><div className={styles.weightFill} style={{ width: (progress * 100) + "%" }} /></div>
      {ready && <div className={styles.marker} style={{left: (progress * 100) + "%"}}>
        <span className={styles.markerLabel} style={{transform: progress < 0.12 ? "translateX(0)" : progress > 0.88 ? "translateX(-100%)" : "translateX(-50%)"}}>{format(current, 1)} kg</span>
      </div>}
    </div>
    <div className={styles.goalFoot}><span>{format(start, 1)} kg início</span><span>{format(target, 1)} kg meta</span></div>
  </section>;
}

function Metric({ label, value, goal, unit, kind, digits = 0 }: { label: string; value?: number; goal?: number; unit?: string; kind: "calories" | "protein" | "water"; digits?: number }) {
  const p = fraction(value, goal);
  return <div className={styles.metric}>
    <div className={styles.muted}>{label}</div>
    <div className={styles.metricValues}><span>{format(value, digits)}</span><small>/ {format(goal, digits)}{unit ? " " + unit : ""}</small></div>
    <div aria-hidden="true" className={styles[kind]}>
      {kind === "calories" ? <i style={{width: (p * 100) + "%"}} /> :
        Array.from({length: kind === "water" ? 8 : 4}, (_, i) => <i key={i}>{kind === "protein" && <b style={{width: (clamp(p * 4 - i) * 100) + "%"}} />}{kind === "water" && <b style={{opacity: clamp(p * 8 - i)}} />}</i>)}
    </div>
  </div>;
}

function SettingsRow({ icon: Icon, title, subtitle, href, onClick }: { icon: LucideIcon; title: string; subtitle: string; href?: string; onClick?: () => void }) {
  const content = <><span className={styles.settingIcon}><Icon size={21} strokeWidth={1.5} /></span><span className={styles.settingText}><span>{title}</span><small>{subtitle}</small></span><ChevronRight size={17} strokeWidth={1.5} className={styles.chevron} /></>;
  return href ? <Link className={styles.setting} href={href}>{content}</Link> : <button className={styles.setting} type="button" onClick={onClick}>{content}</button>;
}

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("achievement") || params.has("achievements")) router.replace("/progress?" + params.toString());
  }, [router]);
  const { physicalData, preferences, socialProfile, isLoading } = useProfile();
  const { data: subscription } = useSubscriptionStatus();
  const { data: hydration } = useHydrationSummary();
  const [editing, setEditing] = useState(false);
  const { data: plans } = useQuery<{plans: Plan[]}>({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans");
      if (!res.ok) throw new Error("Erro ao buscar planos");
      return res.json();
    },
    enabled: !!isSignedIn,
  });
  const timezone = socialProfile?.timezone;
  const now = new Date();
  const today = now.toLocaleDateString("en-US", {weekday:"long", timeZone: timezone || undefined});
  const plan = plans?.plans?.[0];
  const day = plan?.days?.find(d => d.day === today);
  const meals = day ? [day.breakfast, day.lunch, ...(day.snacks ?? []), day.dinner].filter((m): m is Meal => !!m) : [];
  const completed = meals.filter(m => m.completed);
  const sum = (items: Meal[], field: "calories" | "proteina") => items.reduce((total, m) => { const value = m[field]; return total + (valid(value) ? value : 0); }, 0);
  const proteinKnown = meals.length > 0 && meals.every(m => valid(m.proteina));
  const proteinGoal = proteinKnown ? sum(meals, "proteina") : undefined;
  const protein = proteinKnown ? sum(completed, "proteina") : undefined;
  const calories = day ? sum(completed, "calories") : undefined;
  const name = socialProfile?.displayName || user?.fullName || user?.firstName || "Usuário";
  const joined = user?.createdAt;
  const memberDate = joined?.toLocaleDateString("pt-BR", {month:"short", year:"numeric", timeZone:timezone || undefined});
  const dayCount = joined ? Math.max(1, Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(joined.getFullYear(), joined.getMonth(), joined.getDate())) / 86400000) + 1) : undefined;
  const isPremium = subscription?.premium.isPremium;
  const isBeta = subscription?.premium.source === "BETA_CODE" && isPremium;
  const subscriptionDescription = isBeta ? (subscription?.premium.expiresAt ? "Beta ativo até " + new Date(subscription.premium.expiresAt).toLocaleDateString("pt-BR") : "Acesso Beta ativo") : isPremium ? "Premium · assinatura ativa" : subscription ? "Plano gratuito" : "Gerenciar assinatura";

  if (!isLoaded || isLoading) return <ProfileLoading />;
  if (!isSignedIn) return <p className="p-6">Faça login para visualizar seu perfil.</p>;

  return <div className={styles.screen}>
    <div className={styles.heading}>
      <p>{dayCount ? "Dia " + dayCount + " · desde " + joined?.toLocaleDateString("pt-BR", {day:"numeric", month:"short", timeZone: timezone || undefined}) : "Sua jornada"}</p>
      <h1>Perfil</h1>
    </div>
    <section className={styles.card + " " + styles.identity} aria-label="Sua conta">
      <Avatar avatarUrl={socialProfile?.avatarUrl} name={name} sizeClassName={styles.avatar} textSizeClassName="text-xl" fallbackClassName="bg-[#edf3f5] text-[#555c5e]" />
      <div className={styles.identityText}>
        <div className={styles.nameLine}><h2 title={name}>{name}</h2>{isPremium && <span className={styles.badge}>{isBeta ? "Beta" : "Pro"}</span>}</div>
        <p>{memberDate ? "Membro desde " + memberDate : socialProfile?.username ? "@" + socialProfile.username : "Sua conta SmartPlate"}</p>
      </div>
      <button type="button" className={styles.edit} onClick={() => setEditing(true)}>Editar</button>
    </section>
    <WeightGoal start={physicalData?.startWeight} current={physicalData?.currentWeight} target={physicalData?.targetWeight} />
    <section className={styles.card + " " + styles.metrics} aria-label="Resumo de hoje">
      <Metric label="Calorias" value={calories} goal={plan?.calories} kind="calories" />
      <Metric label="Proteína" value={protein} goal={proteinGoal} unit="g" kind="protein" />
      <Metric label="Água" value={hydration ? hydration.totalMl / 1000 : undefined} goal={hydration ? hydration.goalMl / 1000 : undefined} unit="L" digits={1} kind="water" />
    </section>
    <section className={styles.card + " " + styles.settings} aria-label="Configurações da conta">
      <SettingsRow icon={Plug} title="Apps conectados" subtitle="Integrações e dispositivos" href="/profile/connected-apps" />
      <SettingsRow icon={Bell} title="Privacidade e notificações" subtitle="Preferências e permissões" href="/community/privacy" />
      <SettingsRow icon={Zap} title="Plano e assinatura" subtitle={subscriptionDescription} href="/subscribe" />
      <SettingsRow icon={LogOut} title="Sair da conta" subtitle="Encerrar sessão" onClick={() => {
        if (confirm("Deseja realmente sair?")) signOut(() => { queryClient.clear(); router.push("/"); });
      }} />
    </section>
    {editing && <EditProfileModal isOpen={editing} onClose={() => setEditing(false)} physicalData={physicalData ?? {}} preferences={preferences} socialProfile={socialProfile} />}
  </div>;
}
