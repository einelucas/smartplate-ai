import { getLocalDateString, toUtcDateOnly } from "@/lib/community/dates";

export type StoryKind = "weight" | "week" | "achievement";
export type StoryTheme = "dark" | "light";
export type StoryPeriod = 7 | 15 | 30;
export interface WeightEntry { date: string; weight: number }
export interface WeeklyStory { start: string; end: string; activeDays: number; mealCount: number; waterMl: number; waterGoalDays: number }
export interface AchievementStory { title: string; description: string; unlockedAt: string | null; rarity?: string }
export interface StoryInput {
  kind: StoryKind; theme: StoryTheme; name?: string;
  showWeight: boolean; period: StoryPeriod; timezone?: string;
  logs: WeightEntry[]; startWeight?: number; currentWeight?: number; targetWeight?: number;
  week?: WeeklyStory; streak?: number; achievement?: AchievementStory;
}
const DAY = 86400000;
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
export const number = (value: number) => fmt.format(value);
const validWeight = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const escape = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" } as Record<string, string>)[c] || c));
const shortDate = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
const limit = (s: string, n: number) => Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join("") + "…" : s;
function wrap(s: string, max: number, lines: number) {
  const words = s.trim().split(/\s+/);
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > max && current) { result.push(current); current = word; }
    else current = next;
  }
  if (current) result.push(current);
  return result.slice(0, lines).map((line, i) => limit(line + (i === lines - 1 && result.length > lines ? "…" : ""), max));
}
export function getStoryWeights(logs: WeightEntry[], period: StoryPeriod, timezone?: string, now = new Date()) {
  const today = getLocalDateString(now, timezone);
  const start = new Date(toUtcDateOnly(today).getTime() - (period - 1) * DAY).toISOString().slice(0, 10);
  const map = new Map<string, number>();
  logs.map(l => ({ ...l, timestamp: Date.parse(l.date) }))
    .filter(l => Number.isFinite(l.timestamp) && validWeight(l.weight))
    .sort((a,b) => a.timestamp-b.timestamp)
    .forEach(l => { const day = getLocalDateString(new Date(l.timestamp), timezone); if (day >= start && day <= today) map.set(day,l.weight); });
  return { start, end: today, points: Array.from(map, ([date,weight]) => ({ date,weight })) };
}
export function goalProgress(start?: number, current?: number, target?: number) {
  if (!validWeight(start) || !validWeight(current) || !validWeight(target) || start === target) return null;
  return Math.max(0, Math.min(100, Math.round((current-start)/(target-start)*100)));
}
export function buildStorySvg(input: StoryInput) {
  const dark = input.theme === "dark";
  const ink = dark ? "#F5F9FF" : "#13253C";
  const muted = dark ? "#A7BDD5" : "#536B82";
  const accent = input.kind === "achievement" ? (dark ? "#FFD481" : "#A86A06") : (dark ? "#6FE7DD" : "#006ACD");
  const panel = dark ? "#142D48" : "#FFFFFF";
  const outline = dark ? "#2C4761" : "#D9E5F0";
  const t = (x: number, y: number, s: unknown, size = 36, color = ink, weight = 500, anchor = "start") =>
    '<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'" text-anchor="'+anchor+'">'+escape(s)+'</text>';
  const box = (x:number,y:number,w:number,h:number,r=36) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+panel+'" stroke="'+outline+'" stroke-width="2"/>';
  const multi = (x:number,y:number,s:string,size:number,chars:number,lines:number,anchor="start",color=ink) =>
    wrap(s,chars,lines).map((line,i)=>t(x,y+i*(size+12),line,size,color,700,anchor)).join("");
  const chip = (s:string) => '<rect x="82" y="274" width="405" height="62" rx="31" fill="'+accent+'" opacity=".13"/>'+t(110,316,s,29,accent,700);
  const title = (s:string) => multi(82,430,s,78,22,2);
  const head = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+(dark?"#08182E":"#F4F9FF")+'"/><stop offset="1" stop-color="'+(dark?"#173D55":"#E2F3F0")+'"/></linearGradient><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+accent+'" stop-opacity=".22"/><stop offset="1" stop-color="'+accent+'" stop-opacity="0"/></linearGradient><linearGradient id="line"><stop stop-color="#007BFF"/><stop offset="1" stop-color="'+accent+'"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#bg)"/><circle cx="1050" cy="110" r="330" fill="#007BFF" opacity=".07"/><circle cx="85" cy="1810" r="330" fill="#28A745" opacity=".06"/><g font-family="Arial, Helvetica, sans-serif"><rect x="82" y="180" width="56" height="56" rx="18" fill="#007BFF"/><path d="M96 208h9l8-12 11 23 7-11" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'+t(155,220,"SmartPlateAI",38,ink,700)+t(998,219,"MINHA JORNADA",25,muted,700,"end");
  let content = "";
  if(input.kind === "weight"){
    const range = getStoryWeights(input.logs,input.period,input.timezone);
    const p = range.points; const first = p[0]?.weight, last = p[p.length-1]?.weight;
    const delta = p.length >= 2 ? last-first : null;
    const label = delta === null ? "—" : (delta>0?"+":delta<0?"−":"")+number(Math.abs(delta))+" kg";
    content += chip("PROGRESSO • "+input.period+" DIAS")+title("Minha evolução")+t(82,526,shortDate(range.start)+" — "+shortDate(range.end),35,muted);
    content += t(82,760,label,label.length>9?140:172,accent,700)+t(88,830,"Variação registrada no período",38,muted);
    content += box(82,895,916,410);
    if(p.length>=2){
      const min=Math.min(...p.map(v=>v.weight)), max=Math.max(...p.map(v=>v.weight)), span=Math.max(max-min,1);
      const x0=toUtcDateOnly(p[0].date).getTime(), x1=toUtcDateOnly(p[p.length-1].date).getTime();
      const coords=p.map(v=>({x:132+(toUtcDateOnly(v.date).getTime()-x0)/Math.max(x1-x0,DAY)*816,y:1185-(v.weight-min)/span*215}));
      let path="M"+coords[0].x+" "+coords[0].y;
      for(let i=1;i<coords.length;i++){const a=coords[i-1], b=coords[i], mid=(a.x+b.x)/2; path+=" C"+mid+" "+a.y+" "+mid+" "+b.y+" "+b.x+" "+b.y;}
      const a=coords[0], b=coords[coords.length-1];
      content+='<path d="'+path+' L'+b.x+' 1235 L'+a.x+' 1235 Z" fill="url(#area)"/><path d="'+path+'" fill="none" stroke="url(#line)" stroke-width="7" stroke-linecap="round"/>';
      for(const q of [a,b]) content+='<circle cx="'+q.x+'" cy="'+q.y+'" r="9" fill="'+accent+'" stroke="'+panel+'" stroke-width="4"/>';
      content+=t(132,1270,shortDate(p[0].date),27,muted)+t(948,1270,shortDate(p[p.length-1].date),27,muted,500,"end");
    } else content+=t(540,1115,p.length?"Mais registros para ver a evolução":"Sem registros neste período",34,muted,500,"middle");
    const progress=goalProgress(input.startWeight,input.currentWeight,input.targetWeight);
    if(input.showWeight && validWeight(first) && validWeight(last)){
      content+=t(82,1385,"INÍCIO DO PERÍODO",27,muted,700)+t(82,1465,number(first)+" kg",59,ink,700)+t(998,1385,"ÚLTIMA PESAGEM",27,muted,700,"end")+t(998,1465,number(last)+" kg",59,ink,700,"end");
    } else content+=t(82,1415,p.length+" dias com pesagem",40,ink,700);
    if(progress!==null){
      content+=t(82,1550,"Minha meta • progresso geral",34,muted)+t(998,1550,progress+"%",40,accent,700,"end")+'<rect x="82" y="1580" width="916" height="18" rx="9" fill="'+outline+'"/><rect x="82" y="1580" width="'+916*progress/100+'" height="18" rx="9" fill="'+accent+'"/>';
      if(input.showWeight&&validWeight(input.targetWeight)) content+=t(82,1650,"Meta: "+number(input.targetWeight)+" kg",30,muted);
    }
  } else if(input.kind==="week" && input.week){
    const w=input.week;
    content+=chip("RESUMO SEMANAL")+title("Minha semana")+t(82,526,shortDate(w.start)+" — "+shortDate(w.end),35,muted);
    const tiles=[
      ["DIAS ATIVOS",String(w.activeDays)+"/7","Dias válidos para o streak"],
      ["REFEIÇÕES",String(w.mealCount),"Refeições concluídas"],
      ["HIDRATAÇÃO",number(w.waterMl/1000)+" L","Água registrada"],
      ["META DE ÁGUA",String(w.waterGoalDays)+"/7","Dias com meta atingida"],
    ];
    tiles.forEach(([heading,value,desc],i)=>{const x=82+(i%2)*468,y=610+Math.floor(i/2)*345;content+=box(x,y,448,315)+t(x+30,y+65,heading,26,muted,700)+t(x+30,y+175,value,value.length>6?60:80,accent,700)+t(x+30,y+253,desc,25,muted);});
    if(input.streak!==undefined) content+=box(82,1315,916,225)+t(124,1390,"SEQUÊNCIA ATUAL",30,muted,700)+t(124,1485,number(input.streak)+" dias",68,accent,700);
    if(input.showWeight&&validWeight(input.currentWeight)) content+=t(82,1630,"Peso atual",35,muted)+t(998,1630,number(input.currentWeight)+" kg",48,ink,700,"end");
    else content+=t(82,1630,"Uma escolha de cada vez.",40,ink,700);
  } else if(input.kind==="achievement" && input.achievement){
    const a=input.achievement;
    content+=chip("CONQUISTA")+title("Desbloqueada!");
    content+='<circle cx="540" cy="900" r="285" fill="'+accent+'" opacity=".06"/><circle cx="540" cy="900" r="235" fill="none" stroke="'+accent+'" stroke-width="3" stroke-dasharray="5 20"/><circle cx="540" cy="900" r="185" fill="'+accent+'" opacity=".12"/><path d="M455 1015l-25 142 110-62 110 62-25-142" fill="'+accent+'" opacity=".7"/><circle cx="540" cy="875" r="122" fill="'+panel+'" stroke="'+accent+'" stroke-width="12"/><path d="M540 800l23 48 53 8-38 37 9 53-47-25-47 25 9-53-38-37 53-8Z" fill="'+accent+'"/>';
    content+=multi(540,1260,a.title,73,24,2,"middle")+multi(540,1455,a.description,39,41,3,"middle",muted);
    if(a.unlockedAt){const date=new Date(a.unlockedAt);if(Number.isFinite(date.getTime()))content+=t(540,1660,"Desbloqueada em "+shortDate(getLocalDateString(date,input.timezone)),32,accent,700,"middle");}
  }
  const footer='<line x1="82" x2="998" y1="1690" y2="1690" stroke="'+outline+'" stroke-width="2"/>'+t(82,1740,input.name?limit(input.name,32):"Cada registro conta.",29,muted,600)+t(998,1740,"SmartPlateAI",29,ink,700,"end")+'</g></svg>';
  return head+content+footer;
}

export async function storyPng(svg: string): Promise<Blob> {
  const source=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("Não foi possível renderizar a imagem."));image.src=source;});
    const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas indisponível.");
    ctx.drawImage(image,0,0);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Não foi possível gerar o PNG.")),"image/png"));
  }finally{URL.revokeObjectURL(source);}
}
