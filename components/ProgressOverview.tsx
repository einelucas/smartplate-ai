"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Plus, X, Download } from "lucide-react";
import { getLocalDateString, toUtcDateOnly } from "@/lib/community/dates";
import { dailyWeights, dayDistance, shiftDay, rangeWeights, carryForwardWeights, sevenDaySummary, loggingStreak, resolveWeightTimezone, weightMilestones, type ChartWeight, type WeightEntry, type WeightRange } from "@/lib/statistics/weight-progress";
import styles from "@/app/progress/progress.module.css";

const periods: { value: WeightRange; label: string; subtitle: string }[] = [
  { value: 7, label: "Semana", subtitle: "Últimos 7 dias" },
  { value: 30, label: "Mês", subtitle: "Últimos 30 dias" },
  { value: 90, label: "3 meses", subtitle: "Últimos 90 dias" },
  { value: "all", label: "Tudo", subtitle: "Todo o período" },
];
const decimal = (n: number | undefined | null) => n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (n: number | null, digits = 1) => n == null ? "—" : (Math.abs(n) < 0.5 * 10 ** -digits ? (0).toLocaleString("pt-BR", {minimumFractionDigits:digits, maximumFractionDigits:digits}) : (n < 0 ? "−" : "+") + Math.abs(n).toLocaleString("pt-BR", {minimumFractionDigits:digits, maximumFractionDigits:digits}));
const dateLabel = (date: string) => toUtcDateOnly(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" }).replace(" de ", " ").replace(".", "");
const validWeight = (weight: number | undefined): weight is number => weight !== undefined && Number.isFinite(weight) && weight > 0;

function WeightGraph({ points, start, end, target, range }: { points: ChartWeight[]; start: string; end: string; target?: number; range: WeightRange }) {
  const [selected, setSelected] = useState<string | null>(null);

  const w = 340, h = 136, pad = 6;
  const values = [...points.map(p => p.weight), ...(validWeight(target) ? [target] : [])];
  const low = values.length ? Math.min(...values) : 0, high = values.length ? Math.max(...values) : 1;
  const margin = Math.max(.7, (high - low) * .16);
  const min = low - margin, max = high + margin;
  const elapsedDays = dayDistance(start, end);
  const days = Math.max(1, elapsedDays);
  const x = (date: string) => pad + dayDistance(start, date) / days * (w - 2 * pad);
  const y = (weight: number) => pad + (max - weight) / (max - min) * (h - 2 * pad);
  const coords = points.map(p => ({ ...p, x: x(p.date), y: y(p.weight) }));
  const first = coords[0], last = coords[coords.length - 1];
  // Horizontal tangent cubic interpolation avoids overshoot between real measurements.
  const line = coords.reduce((d, p, i) => {
    if (i === 0) return "M " + p.x + " " + p.y;
    const prev = coords[i - 1], mid = (prev.x + p.x) / 2;
    return d + " C " + mid + " " + prev.y + ", " + mid + " " + p.y + ", " + p.x + " " + p.y;
  }, "");
  const area = first && last ? line + " L " + last.x + " " + h + " L " + first.x + " " + h + " Z" : "";
  const tickCount = Math.min(range === 7 ? 7 : 4, elapsedDays + 1);
  const labels = Array.from(new Set(Array.from({ length: tickCount }, (_, i) => shiftDay(start, Math.round(elapsedDays * i / Math.max(1, tickCount - 1))))));
  const active = coords.find(p => p.date === selected);
  return <div className={styles.graph}>
    {!points.length ? <div className={styles.graphEmpty}>Nenhuma pesagem neste período.</div> : <svg viewBox={"0 0 " + w + " " + h} className={styles.chart} role="img" aria-label="Histórico de peso; dias sem pesagem mantêm o último peso conhecido">
      {coords.length > 1 && <path d={area} fill="#e8f4fa" />}
      {validWeight(target) && <><line x1="0" x2={w} y1={y(target)} y2={y(target)} stroke="#c2ced2" strokeWidth="1" strokeDasharray="3 4" /><text x={w-1} y={Math.max(11,y(target)-5)} textAnchor="end" fill="#747b7c" fontSize="12">Meta {decimal(target)}</text></>}
      <path d={line} fill="none" stroke="#1b1c19" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {last && <><circle cx={last.x} cy={last.y} r="8" fill="#f47b58" opacity=".16" /><circle cx={last.x} cy={last.y} r="4.6" fill="#f47b58" /></>}
      {coords.map(point => <circle key={point.date} cx={point.x} cy={point.y} r="8" fill="transparent" onClick={() => setSelected(point.date)} onPointerEnter={() => setSelected(point.date)} onPointerLeave={() => setSelected(null)}><title>{dateLabel(point.date)}: {decimal(point.weight)} kg{!point.recorded ? " (último peso de " + dateLabel(point.sourceDate) + ")" : ""}</title></circle>)}
      {active && <circle cx={active.x} cy={active.y} r="3.5" fill="#191a18" pointerEvents="none" />}
    </svg>}
    <div className={styles.axis + (range === 7 ? " " + styles.weekAxis : "")}>{labels.map(d => <span key={d} title={dateLabel(d)} style={{left: (x(d)/w*100)+"%", transform: d===start ? "translateX(0)" : d===end ? "translateX(-100%)" : "translateX(-50%)"}}>{d === end ? "Hoje" : range === 7 ? d.slice(8,10)+"/"+d.slice(5,7) : dateLabel(d)}</span>)}</div>
    {active && <div className={styles.chartHint}>{dateLabel(active.date)} · {decimal(active.weight)} kg{!active.recorded && " · mantido"}</div>}
  </div>;
}

export default function ProgressOverview({ logs, currentWeight, startWeight, targetWeight, timezone, error, pending, onRegister }: {
  logs: WeightEntry[]; currentWeight?: number; startWeight?: number; targetWeight?: number; timezone?: string; error?: boolean; pending: boolean; onRegister: (weight: number, onSuccess: () => void) => void;
}) {
  const [range, setRange] = useState<WeightRange>(30);
  const [weight, setWeight] = useState("");
  const registerRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const [deviceZone, setDeviceZone] = useState<string>();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setDeviceZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const zone = resolveWeightTimezone(timezone, deviceZone);
  // Re-evaluate against the current instant even if a log arrived after the last clock tick.
  const referenceNow = new Date(Math.max(now.getTime(), Date.now()));
  const today = getLocalDateString(referenceNow, zone);
  const all = dailyWeights(logs, zone, referenceNow);
  const rawHistory = logs.filter(p => Number.isFinite(Date.parse(p.date)) && Date.parse(p.date) <= referenceNow.getTime() && validWeight(p.weight)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  const selected = rangeWeights(all, range, today);
  // Do not backfill before the first measurement: shorten the plotted start only for new histories.
  const chartStart = all[0] && all[0].date > selected.start ? all[0].date : selected.start;
  const chartPoints = carryForwardWeights(all, chartStart, selected.end);
  const current = all[all.length-1]?.weight ?? currentWeight;
  const first = all[0];
  const total = current != null && first ? current - first.weight : null;
  const week = sevenDaySummary(all, today);
  const weekly = week.dailyAverage;
  // The ruler is a signed daily-change scale, centered on zero and scaled to observed changes.
  const weeklyTick = weekly === null ? -1 : Math.round(14 + Math.max(-1, Math.min(1, weekly / week.scale)) * 14);
  const streak = loggingStreak(all, today);
  const milestones = weightMilestones(all, startWeight, targetWeight);
  const completed = milestones.filter(m => m.date !== null).length;
  function exportHistory() {
    const csv = ["Data;Peso (kg)", ...rawHistory.map(p => new Date(p.date).toISOString() + ";" + String(p.weight).replace(".", ","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], {type:"text/csv;charset=utf-8"}));
    const a = document.createElement("a"); a.href=url; a.download="historico-de-peso.csv"; a.click(); URL.revokeObjectURL(url);
  }
  return <>
    <header className={styles.heading}>
      <div><p>{first ? "Desde " + dateLabel(first.date) : "Sua jornada"}</p><h1>Progresso</h1></div>
      <div className={styles.headerActions}>
        <button type="button" aria-label="Histórico de pesagens" onClick={() => historyRef.current?.showModal()}><CalendarDays size={25} strokeWidth={1.5}/></button>
        <button type="button" aria-label="Registrar peso" onClick={() => registerRef.current?.showModal()}><Plus size={28} strokeWidth={1.5}/></button>
      </div>
    </header>
    <div role="group" aria-label="Período de peso" className={styles.periods}>
      {periods.map(p => <button key={p.value} type="button" aria-pressed={range===p.value} onClick={() => setRange(p.value)}>{p.label}</button>)}
    </div>
    {error && <p role="alert" className={styles.error}>Não foi possível carregar seu histórico. Tente novamente mais tarde.</p>}
    <section className={styles.card + " " + styles.weightCard} aria-label="Peso">
      <div className={styles.cardHeading}><h2>Peso</h2><span>{periods.find(p=>p.value===range)?.subtitle}</span></div>
      <div className={styles.bigNumber}><span>{decimal(current)}</span><small>kg</small></div>
      <div className={styles.weightNote}><i />{total == null ? "Registre seu peso para acompanhar a evolução" : Math.abs(total) < .05 ? "Peso estável desde " + dateLabel(first!.date) : decimal(Math.abs(total)) + " kg " + (total < 0 ? "perdidos" : "ganhos") + " desde " + dateLabel(first!.date)}</div>
      <WeightGraph key={range} points={chartPoints} start={chartStart} end={selected.end} target={targetWeight} range={range}/>
    </section>
    <div className={styles.twoCards}>
      <section className={styles.card + " " + styles.statCard}>
        <h2>Média semanal</h2>
        <div className={styles.statNumber}><span>{signed(weekly, 2)}</span><small>kg/dia</small></div>
        <div className={styles.weekTicks} role="img" aria-label={weekly===null ? "Sem dados suficientes" : "Escala da variação média diária: de menos " + decimal(week.scale) + " a mais " + decimal(week.scale) + " kg por dia; marcador em " + signed(weekly, 2)}>{Array.from({length:29},(_,i)=><i key={i} className={weekly!==null && i===weeklyTick?styles.orangeTick:weekly!==null&&i>=Math.min(14,weeklyTick)&&i<=Math.max(14,weeklyTick)?styles.blackTick:undefined}/>)}</div>
        <div className={styles.rulerLabels}><span>−{decimal(week.scale)}</span><span>0</span><span>+{decimal(week.scale)}</span></div>
        <p>{week.change === null ? "Sem dados para 7 dias" : "Total em 7 dias: " + signed(week.change) + " kg"}<span className={styles.streakStatus}>Peso médio: {decimal(week.averageWeight)} kg</span></p>
      </section>
      <section className={styles.card + " " + styles.statCard}>
        <h2>Sequência de pesagens</h2>
        <div className={styles.statNumber}><span>{error ? "—" : streak.current}</span><small>dias</small></div>
        <div className={styles.streakBars} aria-label="Pesagens nos últimos sete dias">{streak.recent.map((d,i)=><i key={d.date} title={dateLabel(d.date)+(d.logged?": registrado":": sem registro")} style={{height: d.logged ? 30 : 21}} className={d.logged ? (i===6?styles.orangeBar:styles.blackBar) : undefined}/>)}</div>
        <p>Melhor: {error ? "—" : streak.best} dias{!error && !streak.todayLogged && <span className={styles.streakStatus}>Hoje: falta registrar</span>}</p>
      </section>
    </div>
    <section className={styles.card + " " + styles.milestones}>
      <div className={styles.cardHeading}><h2>Marcos</h2><span>{completed} de {milestones.length}</span></div>
      {milestones.length ? <div className={styles.milestoneList}>{milestones.map(m=><div key={m.fraction} className={styles.milestone}><i className={m.date ? styles.completeDot : undefined}/><div><h3>{m.fraction===1?"Meta de peso":decimal(m.amount)+" kg "+(m.direction<0?"perdidos":"ganhos")}</h3><p>{m.date ? dateLabel(m.date) : "Ainda não atingido"}</p></div></div>)}</div> : <p className={styles.emptyText}>Defina uma meta de peso diferente do peso inicial para acompanhar seus marcos.</p>}
    </section>
    <dialog ref={registerRef} className={styles.dialog} onClose={()=>setWeight("")}>
      <div className={styles.dialogTitle}><h2>Registrar peso</h2><button type="button" aria-label="Fechar" onClick={()=>registerRef.current?.close()}><X size={22}/></button></div>
      <form onSubmit={e=>{e.preventDefault(); const value=Number(weight.replace(",", ".")); if(!Number.isFinite(value)||value<=0)return; onRegister(value,()=>registerRef.current?.close());}}>
        <label htmlFor="progress-weight">Peso de hoje (kg)</label><input id="progress-weight" value={weight} onChange={e=>setWeight(e.target.value)} inputMode="decimal" placeholder="0,0" required autoFocus/>
        <button className={styles.primary} type="submit" disabled={pending||!weight.trim()||!Number.isFinite(Number(weight.replace(",",".")))||Number(weight.replace(",","."))<=0}>{pending?"Registrando…":"Registrar"}</button>
      </form>
    </dialog>
    <dialog ref={historyRef} className={styles.dialog}>
      <div className={styles.dialogTitle}><h2>Histórico de peso</h2><button type="button" aria-label="Fechar" onClick={()=>historyRef.current?.close()}><X size={22}/></button></div>
      <button type="button" className={styles.export} onClick={exportHistory} disabled={!rawHistory.length}><Download size={16}/> Exportar CSV</button>
      <div className={styles.historyList}>{rawHistory.map((p,i)=><div key={p.date+"-"+i}><span>{new Date(p.date).toLocaleString("pt-BR",{timeZone: zone,dateStyle:"short",timeStyle:"short"})}</span><span>{decimal(p.weight)} kg</span></div>)}{!rawHistory.length&&<p>Nenhum registro encontrado.</p>}</div>
    </dialog>
  </>;
}
