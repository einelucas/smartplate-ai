"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Share2, Download, TrendingUp, CalendarDays, Trophy } from "lucide-react";
import type { AchievementsResponse } from "@/hooks/useAchievements";
import { buildStorySvg, storyPng, getStoryWeights, STORY_THEMES, type StoryKind, type StoryTheme, type StoryPeriod, type WeightEntry, type WeeklyStory } from "@/lib/statistics/story";

interface Props {
  onClose: () => void; weightLogs: WeightEntry[]; startWeight?: number; targetWeight?: number;
  currentWeight?: number; displayName: string; timezone?: string; streak?: number;
}
const kinds = [{ id:"weight", label:"Peso", Icon:TrendingUp },{ id:"week", label:"Semana", Icon:CalendarDays },{ id:"achievement", label:"Conquista", Icon:Trophy }] as const;
const choice = (active: boolean) => "rounded-xl border px-3 py-2 text-sm font-medium transition-colors "+(active?"border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]":"border-slate-200 text-slate-600 hover:bg-slate-50");
export default function StatisticsStoryModal({onClose,weightLogs,startWeight,targetWeight,currentWeight,displayName,timezone,streak}:Props){
  const dialog=useRef<HTMLDialogElement>(null);
  const [kind,setKind]=useState<StoryKind>("weight");
  const [theme,setTheme]=useState<StoryTheme>("signature");
  const [period,setPeriod]=useState<StoryPeriod>(7);
  const [showWeight,setShowWeight]=useState(false);
  const [showName,setShowName]=useState(false);
  const [showGraph,setShowGraph]=useState(true);
  const [showGoal,setShowGoal]=useState(true);
  const [code,setCode]=useState("");
  const [rendered,setRendered]=useState<{svg:string;file:File;url:string}|null>(null);
  const [renderError,setRenderError]=useState(false);
  const [shareError,setShareError]=useState("");
  useEffect(()=>{const el=dialog.current;el?.showModal();return()=>{el?.close();};},[]);
  const weekly=useQuery<WeeklyStory>({
    queryKey:["statistics-story-week"], enabled:kind==="week",
    queryFn:async()=>{const res=await fetch("/api/statistics/story-week");if(!res.ok)throw new Error("Resumo indisponível");return res.json();},
  });
  const achievements=useQuery<AchievementsResponse>({
    queryKey:["achievements"],enabled:kind==="achievement",
    queryFn:async()=>{const res=await fetch("/api/achievements");if(!res.ok)throw new Error("Conquistas indisponíveis");return res.json();},
  });
  const unlocked=useMemo(()=> (achievements.data?.achievements??[]).filter(a=>a.status==="UNLOCKED").sort((a,b)=>Date.parse(b.unlockedAt??"1970-01-01")-Date.parse(a.unlockedAt??"1970-01-01")),[achievements.data]);
  const achievement=unlocked.find(a=>a.code===code)??unlocked[0];
  const hasWeights=getStoryWeights(weightLogs,period,timezone).points.length>0;
  const svg=useMemo(()=>{
    if(kind==="week"&&!weekly.data || kind==="achievement"&&!achievement || kind==="weight"&&!hasWeights)return null;
    return buildStorySvg({kind,theme,period,logs:weightLogs,startWeight,targetWeight,currentWeight,timezone,showWeight,showGraph,showGoal,name:showName?displayName:undefined,week:weekly.data,streak,achievement});
  },[kind,theme,period,weightLogs,startWeight,targetWeight,currentWeight,timezone,showWeight,showGraph,showGoal,showName,displayName,weekly.data,streak,achievement,hasWeights]);
  useEffect(()=>{
    let cancelled=false;let url:string|undefined;setRenderError(false);setShareError("");
    if(svg) storyPng(svg).then(blob=>{
      if(cancelled)return;
      url=URL.createObjectURL(blob);
      setRendered({svg,file:new File([blob],`smartplate-estatisticas-${theme}.png`,{type:"image/png"}),url});
    }).catch(()=>{if(!cancelled)setRenderError(true);});
    return()=>{cancelled=true;if(url)URL.revokeObjectURL(url);};
  },[svg,theme]);
  const ready=svg&&rendered?.svg===svg&&!renderError?rendered:null;
  function save(){
    if(!ready)return;
    const link=document.createElement("a");link.href=ready.url;link.download=ready.file.name;document.body.appendChild(link);link.click();link.remove();
  }
  async function share(){
    if(!ready)return;setShareError("");
    try{
      if(typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files:[ready.file]})){
        await navigator.share({files:[ready.file],title:"Minhas estatísticas • SmartPlateAI"});
      }else save();
    }catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setShareError("Não foi possível compartilhar. Você pode salvar a imagem e postar manualmente.");}
  }
  const pending=kind==="week"&&weekly.isLoading||kind==="achievement"&&achievements.isLoading;
  const error=kind==="week"&&weekly.isError||kind==="achievement"&&achievements.isError;
  return (
    <dialog ref={dialog} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      aria-labelledby="statistics-story-title" className="fixed m-auto w-[calc(100%-1rem)] max-w-3xl max-h-[92dvh] overflow-auto rounded-2xl bg-white p-0 shadow-xl backdrop:bg-black/50">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white p-4">
        <div><h2 id="statistics-story-title" className="font-bold text-slate-800">Compartilhar estatísticas</h2><p className="text-xs text-slate-500">Crie um story personalizado</p></div>
        <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={22}/></button>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-[1fr_1fr] sm:p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo de story">
            {kinds.map(({id,label,Icon})=><button key={id} type="button" aria-pressed={kind===id} onClick={()=>setKind(id)} className={choice(kind===id)+" flex flex-col items-center gap-1"}><Icon size={18}/>{label}</button>)}
          </div>
          {kind==="weight"&&<div><p className="mb-2 text-xs font-semibold text-slate-600">Período</p><div className="flex gap-2">{([7,15,30] as const).map(n=><button type="button" key={n} aria-pressed={period===n} className={choice(period===n)} onClick={()=>setPeriod(n)}>{n} dias</button>)}</div></div>}
          {kind==="achievement"&&unlocked.length>0&&<label className="block text-xs font-semibold text-slate-600">Conquista<select value={achievement?.code??""} onChange={e=>setCode(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">{unlocked.map(a=><option key={a.code} value={a.code}>{a.title}</option>)}</select></label>}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Estilo do story</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Estilo visual">
              {STORY_THEMES.map(option=><button key={option.id} type="button" aria-pressed={theme===option.id} onClick={()=>setTheme(option.id)} className={choice(theme===option.id)+" flex min-w-0 flex-col items-center gap-2 px-1.5"}>
                <span aria-hidden="true" className="relative flex aspect-[9/12] w-full max-w-[54px] flex-col justify-center gap-1 overflow-hidden rounded-md border border-black/10 p-1.5" style={{background:option.id==="signature"?"linear-gradient(145deg,#1468E9,#1036A6)":option.color,color:option.id==="minimal"?"#096BD3":"#FFFFFF"}}>
                  <span className="h-1 w-1/3 rounded-full bg-current opacity-60"/>
                  <span className="text-base font-extrabold leading-none">−</span>
                  <svg viewBox="0 0 40 15" className="w-full" fill="none"><path d="M1 2L11 5L20 4L30 11L39 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="h-1 w-2/3 rounded-full bg-current opacity-50"/>
                </span>
                <span className="text-[11px] font-semibold leading-tight sm:text-xs">{option.label}</span>
              </button>)}
            </div>
            <p className="mt-2 text-xs text-slate-500">{STORY_THEMES.find(option=>option.id===theme)?.description} · a prévia e a imagem salva usam o estilo escolhido.</p>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Informações e privacidade</p>
            {kind!=="achievement"&&<label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showWeight} onChange={e=>setShowWeight(e.target.checked)} className="accent-[#007BFF]"/> {kind==="weight"?"Mostrar pesos exatos (incluindo a meta, se visível)":"Mostrar peso atual"}</label>}
            {kind==="weight"&&<>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showGraph} onChange={e=>setShowGraph(e.target.checked)} className="accent-[#007BFF]"/> Mostrar gráfico de evolução</label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showGoal} onChange={e=>setShowGoal(e.target.checked)} className="accent-[#007BFF]"/> Mostrar progresso da meta</label>
            </>}
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showName} onChange={e=>setShowName(e.target.checked)} className="accent-[#007BFF]"/> Mostrar meu nome</label>
            <p className="text-xs text-slate-500">A imagem é criada neste dispositivo. Revise os dados antes de compartilhar.</p>
          </div>
          {error&&<button type="button" className="text-sm text-[#007BFF]" onClick={()=>kind==="week"?weekly.refetch():achievements.refetch()}>Erro ao carregar. Tentar novamente.</button>}
        </div>
        <div className="mx-auto flex w-full max-w-[260px] flex-col gap-2">
          <div className="relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            {ready?<img src={ready.url} alt="Prévia do story a compartilhar" className="h-full w-full object-contain"/>:<p className="px-5 text-center text-sm text-slate-500">{renderError?"Não foi possível gerar a imagem. Altere uma opção para tentar novamente.":pending||svg?"Preparando prévia…":error?"Dados indisponíveis.":kind==="achievement"?"Nenhuma conquista desbloqueada.":"Nenhum registro de peso neste período."}</p>}
          </div>
          <p className="text-center text-xs text-slate-400">1080 × 1920 · PNG · 9:16</p>
        </div>
      </div>
      <div className="sticky bottom-0 space-y-2 border-t border-slate-100 bg-white p-4">
        {shareError&&<p role="alert" className="text-xs text-red-600">{shareError}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!ready} onClick={save} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><Download size={17}/> Salvar PNG</button>
          <button type="button" disabled={!ready} onClick={share} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#007BFF] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Share2 size={17}/> Compartilhar</button>
        </div>
      </div>
    </dialog>
  );
}
