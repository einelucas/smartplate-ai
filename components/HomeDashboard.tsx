// components/HomeDashboard.tsx
"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { Sparkles, ChefHat, RefreshCw, CalendarDays, Plus, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import MealTypeIcon, { type MealType } from "./MealTypeIcon";
import { useActivitySummary } from "@/hooks/useActivities";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { useActivityGoals } from "@/hooks/useActivityGoals";
import { useCommunityMe } from "@/hooks/useCommunity";
import { resolveWeightTimezone } from "@/lib/statistics/weight-progress";
import Avatar from "@/components/social/Avatar";
import NotificationsBell from "@/components/NotificationsBell";
import styles from "./HomeDashboard.module.css";
import { ACTIVITY_TYPE_ICON_KEY, ACTIVITY_GOAL_METRIC_LABELS } from "@/lib/activity/options";
import { resolveIcon } from "@/components/icon-registry";
import HydrationCard from "@/components/HydrationCard";
import XpTodayCard from "@/components/XpTodayCard";

const RegisterActivityModal = dynamic(() => import("./RegisterActivityModal"), { ssr: false });

const MEAL_TIMES: Record<string, string> = { breakfast: "07:30", lunch: "12:30", snack: "15:30", dinner: "19:30" };
const MEAL_LABELS: Record<string, string> = { breakfast: "Café da Manhã", lunch: "Almoço", snack: "Lanche", dinner: "Jantar" };
const MEAL_TYPE_BY_KEY: Record<string, MealType> = { breakfast: "BREAKFAST", lunch: "LUNCH", snack: "SNACK", dinner: "DINNER" };

const numeric = (n: unknown): number | undefined => typeof n === "number" && Number.isFinite(n) ? n : undefined;
const fmt = (n: number | undefined, digits = 0) => n === undefined ? "—" : n.toLocaleString("pt-BR", {minimumFractionDigits:digits,maximumFractionDigits:digits});
const ratio = (n: number | undefined, target: number | undefined) => n !== undefined && target !== undefined && target > 0 ? Math.max(0, Math.min(1,n/target)) : 0;

function WeightRuler({current,start,target}: {current?:number;start?:number;target?:number}) {
  const ready = current !== undefined && start !== undefined && target !== undefined && start !== target;
  const progress = ready ? Math.max(0,Math.min(1,(current-start)/(target-start))) : 0;
  const delta = current !== undefined && start !== undefined ? current-start : undefined;
  const position = 6 + progress*328;
  return <section className={styles.card + " " + styles.weight} aria-label="Peso atual">
    <div className={styles.cardHead}><h2>Peso atual</h2>{delta!==undefined && <span className={styles.weightDelta}><i/>{fmt(Math.abs(delta),1)} kg {delta<0?"perdidos":delta>0?"ganhos":"de variação"}</span>}</div>
    <div className={styles.weightNumber}><span>{fmt(current,1)}</span><small>kg</small></div>
    <svg className={styles.ruler} viewBox="0 0 340 44" role="img" aria-label={ready ? Math.round(progress*100)+"% da meta de peso concluída" : "Meta de peso não definida"}>
      {Array.from({length:41},(_,i)=>{const x=6+i*8.2;return <line key={i} x1={x} x2={x} y1={i%5===0?15:25} y2={38} stroke={ready&&x<=position?"#252623":"#d9dcd7"} strokeWidth="1.5" strokeLinecap="round"/>;})}
      {ready && <><line x1={position} x2={position} y1="7" y2="40" stroke="#f47b58" strokeWidth="2.2" strokeLinecap="round"/><circle cx={position} cy="6" r="4.7" fill="#f47b58"/></>}
    </svg>
    <div className={styles.weightFooter}><span>Início {fmt(start,1)}</span><span>Meta {fmt(target,1)}</span></div>
    <Link href="/progress" className={styles.weightLink}>Ver evolução <ChevronRight size={15} strokeWidth={1.5}/></Link>
  </section>;
}

function NutritionCard({label,value,target,unit,kind,subtitle}: {label:string;value?:number;target?:number;unit:string;kind:"calories"|"protein";subtitle:string}) {
  const p=ratio(value,target);
  return <section className={styles.card + " " + styles.nutrition} aria-label={label}>
    <h2>{label}</h2><div className={styles.nutritionValue}><span>{fmt(value)}</span><small>{unit}</small></div>
    {kind==="calories" ? <div className={styles.calorieBars} role="img" aria-label={Math.round(p*100)+"% da meta de calorias"}>{Array.from({length:7},(_,i)=>{const fill=Math.max(0,Math.min(1,p*7-i));return <i key={i} style={{height:fill>0?Math.max(5,32*fill):5,background:fill>0?(i===Math.ceil(p*7)-1?"#f47b58":"#252623"):"#d9dcd7"}}/>})}</div> : <div className={styles.proteinTrack} role="img" aria-label={Math.round(p*100)+"% da proteína planejada"}><div style={{width:(p*100)+"%"}}/><i style={{left:(p*100)+"%"}}/></div>}
    <p>{subtitle}</p>
  </section>;
}

export default function HomeDashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showActivityModal, setShowActivityModal] = useState(false);
  const { data: activitySummary } = useActivitySummary();
  const { manualItems, externalItems } = useActivityHistory();
  const { data: goalsData } = useActivityGoals();
  const primaryGoal = goalsData?.goals.find((g) => g.isActive) ?? null;
  const { data: meData } = useCommunityMe();

  const today = new Date();
  const zone = resolveWeightTimezone(meData?.profile?.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const hour = Number(new Intl.DateTimeFormat("en-GB", {hour:"2-digit",hourCycle:"h23",timeZone:zone}).format(today));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const todayKey = new Intl.DateTimeFormat("en-US", {weekday:"long",timeZone:zone}).format(today);

  const { data: physicalData } = useQuery({
    queryKey: ["physical-data"],
    queryFn: async () => {
      const res = await fetch("/api/user/physical-data");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: plansData } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
  });

  const { data: favoritePlansData } = useQuery({
    queryKey: ["meal-plans", "favorites"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans?favorites=true");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
  });

  const latestPlan = plansData?.plans?.[0] ?? null;
  const todayPlan = latestPlan?.days?.find((d: any) => d.day === todayKey) ?? null;

  const todayMeals = todayPlan
    ? [
        todayPlan.breakfast && { key: "breakfast", ...todayPlan.breakfast },
        todayPlan.lunch && { key: "lunch", ...todayPlan.lunch },
        ...(Array.isArray(todayPlan.snacks) ? todayPlan.snacks.map((s: any, idx: number) => ({ key: "snack", snackIndex: idx, ...s })) : []),
        todayPlan.dinner && { key: "dinner", ...todayPlan.dinner },
      ].filter(Boolean)
    : [];

  const completedCount = todayMeals.filter((m: any) => m.completed).length;
  const daysWithMeals = latestPlan?.days?.filter((d: any) => d.breakfast || d.lunch || d.dinner || d.snacks?.length).length ?? 0;
  const adherence = todayMeals.length ? Math.round((completedCount / todayMeals.length) * 100) : 0;
  const todayCalories: number = todayMeals.filter((m: any) => m.completed).reduce((acc: number, m: any) => acc + (numeric(m.calories ?? m.calorias) ?? 0), 0);
  const calorieTarget: number | undefined = latestPlan?.calories;

  const toggleMealMutation = useMutation({
    mutationFn: async ({ mealType, snackIndex, completed }: { mealType: string; snackIndex?: number; completed: boolean }) => {
      if (!latestPlan) return;
      const res = await fetch(`/api/meal-plans/${latestPlan.id}/meals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: todayKey,
          mealType: mealType === "snack" ? "snacks" : mealType,
          snackIndex,
          patch: { completed },
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar refeição");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["community", "gamification"] });
      queryClient.invalidateQueries({ queryKey: ["community", "me"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["community", "challenges"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Texto local instantâneo, exibido enquanto a dica real da IA carrega (ou se a chamada falhar)
  const fallbackTip = !latestPlan
    ? "Complete seu perfil e gere um plano para receber dicas personalizadas da IA."
    : calorieTarget && todayCalories > calorieTarget * 1.15
    ? `Você já consumiu ${todayCalories} kcal hoje, acima da sua meta de ${calorieTarget} kcal. Que tal uma refeição mais leve no restante do dia?`
    : calorieTarget && completedCount > 0 && todayCalories < calorieTarget * 0.5
    ? `Você está em ${todayCalories} kcal hoje, bem abaixo da meta de ${calorieTarget} kcal. Não pule refeições!`
    : `Você está indo muito bem! 🎉 Mantenha a consistência no seu plano ${physicalData?.dietType?.replace("_", " ") || ""}.`;

  const { data: aiTipData } = useQuery({
    queryKey: ["ai-tip", todayKey, latestPlan?.id],
    queryFn: async () => {
      const res = await fetch("/api/ai-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todayCalories, calorieTarget, completedCount, totalMeals: todayMeals.length, hasPlan: !!latestPlan }),
      });
      if (!res.ok) throw new Error("Erro ao buscar dica");
      return res.json();
    },
    enabled: !!plansData,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const aiTip = aiTipData?.tip || fallbackTip;
  const proteinKnown = todayMeals.length > 0 && todayMeals.every((m: any) => numeric(m.proteina ?? m.protein) !== undefined);
  const proteinGoal = proteinKnown ? todayMeals.reduce((sum: number, m: any) => sum + (numeric(m.proteina ?? m.protein) ?? 0), 0) : undefined;
  const todayProtein = proteinKnown ? todayMeals.filter((m: any) => m.completed).reduce((sum: number, m: any) => sum + (numeric(m.proteina ?? m.protein) ?? 0), 0) : undefined;
  const nextMeal = todayMeals.find((m: any) => !m.completed);
  const name = meData?.profile?.displayName || user?.fullName || user?.firstName || "Usuário";


  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <details className={styles.avatarLink}><summary aria-label="Menu da conta"><Avatar avatarUrl={meData?.profile?.avatarUrl} name={name} sizeClassName="w-12 h-12" fallbackClassName="bg-white text-slate-600" /></summary><div className={styles.accountMenu}><Link href="/profile">Perfil</Link><button type="button" onClick={()=>{if(confirm("Deseja realmente sair?")) signOut(()=>{queryClient.clear();router.push("/");});}}>Sair da conta</button></div></details>
        <div className={styles.greeting}><p>{greeting},</p><h1>{name}</h1></div>
        <div className={styles.headerActions}><div className="lg:hidden"><NotificationsBell minimal /></div><Link href="/mealplan" aria-label="Calendário de refeições"><CalendarDays size={25} strokeWidth={1.5}/></Link></div>
      </header>
      <WeightRuler current={numeric(physicalData?.currentWeight)} start={numeric(physicalData?.startWeight)} target={numeric(physicalData?.targetWeight)} />
      <div className={styles.twoCards}>
        <NutritionCard label="Consumido hoje" value={todayPlan ? todayCalories : undefined} target={numeric(calorieTarget)} unit="kcal" kind="calories" subtitle={calorieTarget ? "de "+fmt(calorieTarget)+" kcal planejadas" : "Sem meta definida"}/>
        <NutritionCard label="Proteína hoje" value={todayProtein} target={proteinGoal} unit="g" kind="protein" subtitle={proteinGoal!==undefined?"de "+fmt(proteinGoal)+" g planejados":"Proteína não informada"}/>
      </div>
      <section className={styles.card+" "+styles.nextMeal} aria-label="Próxima refeição">
        {nextMeal ? <>
          <span className={styles.mealIcon}><MealTypeIcon type={MEAL_TYPE_BY_KEY[nextMeal.key] ?? "SNACK"} className="w-8 h-8"/></span>
          <Link href="/mealplan" className={styles.nextMealText}>
            <p>A seguir · {MEAL_LABELS[nextMeal.key]}, {MEAL_TIMES[nextMeal.key]}</p>
            <h2>{nextMeal.name ?? nextMeal.nome ?? "Refeição"}</h2>
            <p>{fmt(numeric(nextMeal.calories ?? nextMeal.calorias))} kcal{numeric(nextMeal.proteina ?? nextMeal.protein)!==undefined ? " · "+fmt(numeric(nextMeal.proteina ?? nextMeal.protein))+" g proteína" : ""}</p>
          </Link>
          <button type="button" className={styles.addMeal} aria-label="Marcar próxima refeição como concluída" disabled={toggleMealMutation.isPending} onClick={()=>toggleMealMutation.mutate({mealType:nextMeal.key,snackIndex:nextMeal.snackIndex,completed:true})}><Plus size={25} strokeWidth={1.5}/></button>
        </> : <>
          <span className={styles.mealIcon}>{todayMeals.length ? <Check size={28} strokeWidth={1.5}/> : <ChefHat size={28} strokeWidth={1.5}/>}</span>
          <div className={styles.nextMealText}><p>Próxima refeição</p><h2>{todayMeals.length?"Refeições concluídas":"Seu plano alimentar"}</h2><p>{todayMeals.length?"Tudo registrado por hoje.":"Gere um plano para começar."}</p></div>
          <Link href="/mealplan" className={styles.addMeal} aria-label="Abrir plano alimentar"><ChevronRight size={24} strokeWidth={1.5}/></Link>
        </>}
      </section>
      <HydrationCard />
      <section className={styles.card}>
        <div className={styles.sectionHead}><h2>Refeições de hoje</h2><Link href="/mealplan" className={styles.outline}><RefreshCw size={13} strokeWidth={1.5}/> Ver plano</Link></div>
        {!todayMeals.length ? <p className={styles.muted}>Nenhum plano ativo para hoje.</p> : <div className={styles.mealList}>
          {todayMeals.map((meal:any,i:number)=><button type="button" key={meal.key+"-"+i} className={styles.mealRow} aria-pressed={!!meal.completed} disabled={toggleMealMutation.isPending} onClick={()=>toggleMealMutation.mutate({mealType:meal.key,snackIndex:meal.snackIndex,completed:!meal.completed})}>
            <span className={styles.smallMealIcon}><MealTypeIcon type={MEAL_TYPE_BY_KEY[meal.key]??"SNACK"} className="w-5 h-5"/></span><span className={styles.mealRowText}><small>{MEAL_LABELS[meal.key]} · {MEAL_TIMES[meal.key]}</small><span>{meal.name??meal.nome??"Refeição"}</span><small>{fmt(numeric(meal.calories??meal.calorias))} kcal{meal.rating ? " · ★ "+meal.rating : ""}</small></span><span className={styles.mealCheck + (meal.completed?" "+styles.checked:"")}>{meal.completed?<Check size={16}/>:<Plus size={16}/>}</span>
          </button>)}
        </div>}
        <Link href="/mealplan" className={styles.textLink}>{latestPlan?"Trocar refeição ou gerar novo plano":"Gerar plano alimentar"} <ChevronRight size={15}/></Link>
      </section>
      <section className={styles.card}>
        <div className={styles.sectionHead}><h2>Adesão ao plano</h2><span>{adherence}%</span></div>
        <div className={styles.adherenceTrack}><i style={{width:adherence+"%"}}/></div>
        <div className={styles.details}><div><span>Refeições concluídas hoje</span><strong>{completedCount}/{todayMeals.length}</strong></div><div><span>Planos favoritos</span><strong>{favoritePlansData?.plans?.length??0}</strong></div><div><span>Dias com plano na semana</span><strong>{daysWithMeals}/7</strong></div></div>
      </section>
      <div className={styles.extras}>
        <XpTodayCard />
          {/* Atividade física */}
          <div className="bg-white rounded-3xl p-5">
            <h3 className="font-bold text-slate-800 mb-4">Atividade</h3>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Esta semana</p>
            <p className="text-sm text-slate-600 mt-1">
              {activitySummary?.thisWeek.distinctDays ?? 0} {(activitySummary?.thisWeek.distinctDays ?? 0) === 1 ? "dia" : "dias"} •{" "}
              {activitySummary?.thisWeek.minutes ?? 0} min • {activitySummary?.thisWeek.count ?? 0}{" "}
              {(activitySummary?.thisWeek.count ?? 0) === 1 ? "atividade" : "atividades"}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100">
              {primaryGoal ? (
                <>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide truncate">
                      Meta de {ACTIVITY_GOAL_METRIC_LABELS[primaryGoal.metric]}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 flex-shrink-0">
                      {primaryGoal.progress.current} / {primaryGoal.progress.target}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#86c4e4] rounded-full transition-all"
                      style={{ width: `${primaryGoal.progress.percentage}%` }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">Meta semanal</p>
                  <p className="text-xs text-slate-500 mt-1">Defina uma meta de atividade para acompanhar sua semana.</p>
                  <Link href="/progress" className="inline-block mt-2 text-xs font-semibold text-[#007BFF]">
                    Criar meta →
                  </Link>
                </div>
              )}
            </div>

            {(manualItems[0] || externalItems[0]) && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Atividades recentes</p>
                {manualItems[0] && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const LastIcon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[manualItems[0].activityType]);
                      return <LastIcon size={18} weight="duotone" className="text-[#007BFF] flex-shrink-0" />;
                    })()}
                    <p className="text-sm text-slate-600 truncate">
                      <span className="text-slate-400">SmartPlate •</span> {manualItems[0].title} • {manualItems[0].durationMin} min
                    </p>
                  </div>
                )}
                {externalItems[0] && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const LastIcon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[externalItems[0].activityType]);
                      return <LastIcon size={18} weight="duotone" className="text-[#FC4C02] flex-shrink-0" />;
                    })()}
                    <p className="text-sm text-slate-600 truncate">
                      <span className="text-slate-400">Strava •</span> {externalItems[0].title}
                      {externalItems[0].durationMin ? ` • ${externalItems[0].durationMin} min` : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowActivityModal(true)}
              className="mt-4 w-full bg-[#242520] hover:bg-[#393a35] rounded-xl text-white text-sm font-medium py-2.5 transition-colors"
            >
              Registrar atividade
            </button>
          </div>


        <section className={styles.card}>
          <div className={styles.sectionHead}><h2>Dica da IA</h2><Sparkles size={19} strokeWidth={1.5}/></div>
          <p className={styles.muted}>{aiTip}</p>
          <Link href={latestPlan?"/mealplan":"/profile"} className={styles.textLink}>{latestPlan?"Ver plano semanal":"Completar perfil"} <ChevronRight size={15}/></Link>
        </section>
        <section className={styles.card}>
          <div className={styles.sectionHead}><h2>Não sei cozinhar</h2><ChefHat size={20} strokeWidth={1.5}/></div>
          <p className={styles.muted}>Consulte os ingredientes e o modo de preparo das suas refeições.</p>
          <Link href="/mealplan" className={styles.textLink}>Ver receitas do plano <ChevronRight size={15}/></Link>
        </section>
      </div>
      <RegisterActivityModal isOpen={showActivityModal} onClose={()=>setShowActivityModal(false)}/>
    </div>
  );
}
