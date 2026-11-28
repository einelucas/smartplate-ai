import { getLocalDateString, toUtcDateOnly } from "@/lib/community/dates";

export type StoryKind = "weight" | "week" | "achievement";
export type StoryTheme = "signature" | "performance" | "minimal";
export const STORY_THEMES = [
  { id: "signature", label: "Signature", color: "#145BE1", description: "Azul vibrante" },
  { id: "performance", label: "Performance", color: "#101A2A", description: "Escuro esportivo" },
  { id: "minimal", label: "Minimal", color: "#F3F5F6", description: "Claro editorial" },
] as const;
export type StoryPeriod = 7 | 15 | 30;
export interface WeightEntry { date: string; weight: number }
export interface WeeklyStory { start: string; end: string; activeDays: number; mealCount: number; waterMl: number; waterGoalDays: number }
export interface AchievementStory { title: string; description: string; unlockedAt: string | null; rarity?: string }
export interface StoryInput {
  kind: StoryKind; theme: StoryTheme; name?: string;
  showWeight: boolean; showGraph?: boolean; showGoal?: boolean; period: StoryPeriod; timezone?: string;
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
  const signature = input.theme === "signature";
  const minimal = input.theme === "minimal";
  const ink = minimal ? "#15253A" : "#F8FAFC";
  const muted = minimal ? "#53677D" : signature ? "#D4E5FF" : "#A7BDD5";
  const accent = input.kind === "achievement" && !signature ? (minimal ? "#95610B" : "#FFD481") : minimal ? "#096BD3" : signature ? "#FFFFFF" : "#60A5FA";
  const chart = signature ? "#B8F4FF" : accent;
  const panel = minimal ? "#E5EAF0" : signature ? "#103DA8" : "#152238";
  const outline = minimal ? "#D2DCE7" : signature ? "#7095E9" : "#33465E";
  const t = (x: number, y: number, s: unknown, size = 36, color = ink, weight = 500, anchor = "start", spacing = 0) =>
    '<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'" text-anchor="'+anchor+'" letter-spacing="'+spacing+'">'+escape(s)+'</text>';
  const box = (x:number,y:number,w:number,h:number,r=32) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+panel+'"/>';
  const multi = (x:number,y:number,s:string,size:number,chars:number,lines:number,anchor="start",color=ink) =>
    wrap(s,chars,lines).map((line,i)=>t(x,y+i*(size+12),line,size,color,700,anchor)).join("");
  const chip = (s:string) => t(84,409,s,29,muted,700,"start",3);
  const title = (s:string) => multi(82,505,s,76,22,2);
  // Same blue-to-green Leaf mark used by AppSidebar and PublicNavBar.
  // Inline SVG ensures the exported PNG is self-contained (no external images).
  const logo = '<rect x="82" y="255" width="60" height="60" rx="18" fill="url(#brand)"/><g transform="translate(94 267) scale(1.5)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></g>';
  const decoration = signature ? Array.from({length:6},(_,i)=>'<circle cx="1130" cy="520" r="'+(170+i*78)+'" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".11"/>').join("") : "";
  const head = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+(signature?"#1468E9":minimal?"#F8FAFC":"#101A2A")+'"/><stop offset="1" stop-color="'+(signature?"#1036A6":minimal?"#F0F3F5":"#07101C")+'"/></linearGradient><linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#007BFF"/><stop offset="1" stop-color="#28A745"/></linearGradient><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+chart+'" stop-opacity=".20"/><stop offset="1" stop-color="'+chart+'" stop-opacity="0"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#bg)"/>'+decoration+'<g font-family="Manrope, Arial, Helvetica, sans-serif">'+logo+t(160,298,"SmartPlateAI",39,ink,700);
  let content = "";
  if(input.kind === "weight"){
    const range = getStoryWeights(input.logs,input.period,input.timezone);
    const p = range.points; const first = p[0]?.weight, last = p[p.length-1]?.weight;
    const delta = p.length >= 2 ? last-first : null;
    const label = delta === null ? "—" : (delta>0?"+":delta<0?"−":"")+number(Math.abs(delta))+" kg";
    content += chip("MINHA JORNADA • PESO")+t(84,480,"Minha evolução",65,ink,700);
    const metricSize = label.length > 10 ? 130 : label.length > 8 ? 155 : 205;
    content += t(78,710,label,metricSize,accent,800,"start",-5)+t(84,775,"Variação registrada no período",38,muted)+t(84,835,shortDate(range.start)+" — "+shortDate(range.end)+"  ·  "+input.period+" dias",32,muted,600);
    const showGraph = input.showGraph !== false;
    const showGoal = input.showGoal !== false;
    if(showGraph){
      if(p.length>=2){
        const min=Math.min(...p.map(v=>v.weight)), max=Math.max(...p.map(v=>v.weight)), span=Math.max(max-min,1);
        const x0=toUtcDateOnly(p[0].date).getTime(), x1=toUtcDateOnly(p[p.length-1].date).getTime();
        const coords=p.map(v=>({x:92+(toUtcDateOnly(v.date).getTime()-x0)/Math.max(x1-x0,DAY)*896,y:1160-(v.weight-min)/span*245}));
        // Straight segments connect actual dated readings; no invented samples.
        const path=coords.map((q,i)=>(i===0?"M":"L")+q.x+" "+q.y).join(" ");
        const firstPoint=coords[0], lastPoint=coords[coords.length-1];
        if(!signature) for(const y of [915,997,1079,1160]) content+='<path d="M82 '+y+'H998" stroke="'+outline+'" stroke-width="2" stroke-dasharray="7 12" opacity=".5"/>';
        if(!minimal) content+='<path d="'+path+' L'+lastPoint.x+' 1190 L'+firstPoint.x+' 1190 Z" fill="url(#area)"/>';
        content+='<path d="'+path+'" fill="none" stroke="'+chart+'" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
        for(const q of [firstPoint,lastPoint]) content+='<circle cx="'+q.x+'" cy="'+q.y+'" r="10" fill="'+chart+'"/>';
        content+=t(84,1240,shortDate(p[0].date),30,muted)+t(996,1240,shortDate(p[p.length-1].date),30,muted,500,"end");
      } else content+=t(540,1050,p.length?"Mais registros para ver a evolução":"Sem registros neste período",34,muted,500,"middle");
    }
    const progress=goalProgress(input.startWeight,input.currentWeight,input.targetWeight);
    const hasGoal=showGoal && progress!==null;
    const y=showGraph?1290:930;
    const metricBottom=y+150;
    if(signature) content+=box(82,y-22,916,hasGoal?340:174);
    const left=signature?126:82, right=signature?954:998;
    if(input.showWeight && validWeight(first) && validWeight(last)){
      content+=t(left,y+35,"INÍCIO DO PERÍODO",26,muted,700)+t(left,y+110,number(first)+" kg",62,ink,700)+t(right,y+35,"ÚLTIMA PESAGEM",26,muted,700,"end")+t(right,y+110,number(last)+" kg",62,ink,700,"end");
    } else content+=t(left,y+80,p.length+(p.length===1?" dia com pesagem":" dias com pesagem"),43,ink,700);
    if(hasGoal && progress!==null){
      if(signature) content+='<path d="M126 '+metricBottom+'H954" stroke="'+outline+'" opacity=".6" stroke-width="2"/>';
      if(minimal) content+=box(82,metricBottom+10,916,155,24);
      const gl=minimal?112:left, gr=minimal?968:right, gy=metricBottom+70;
      content+=t(gl,gy,"Progresso da meta",33,muted,600)+t(gr,gy,progress+"%",49,accent,800,"end")+'<rect x="'+gl+'" y="'+(gy+26)+'" width="'+(gr-gl)+'" height="12" rx="6" fill="'+outline+'"/><rect x="'+gl+'" y="'+(gy+26)+'" width="'+(gr-gl)*progress/100+'" height="12" rx="6" fill="'+accent+'"/>';
      if(input.showWeight&&validWeight(input.targetWeight)) content+=t(gl,gy+83,"Meta: "+number(input.targetWeight)+" kg",29,muted);
    }
  } else if(input.kind==="week" && input.week){
    const w=input.week;
    content+=chip("RESUMO SEMANAL")+title("Minha semana")+t(82,570,shortDate(w.start)+" — "+shortDate(w.end),35,muted);
    const tiles=[
      ["DIAS ATIVOS",String(w.activeDays)+"/7","Dias válidos para o streak"],
      ["REFEIÇÕES",String(w.mealCount),"Refeições concluídas"],
      ["HIDRATAÇÃO",number(w.waterMl/1000)+" L","Água registrada"],
      ["META DE ÁGUA",String(w.waterGoalDays)+"/7","Dias com meta atingida"],
    ];
    tiles.forEach(([heading,value,desc],i)=>{const x=82+(i%2)*468,y=630+Math.floor(i/2)*310;content+=box(x,y,448,280)+t(x+30,y+65,heading,26,muted,700)+t(x+30,y+175,value,value.length>6?60:80,accent,700)+t(x+30,y+235,desc,25,muted);});
    if(input.streak!==undefined) content+=box(82,1260,916,225)+t(124,1335,"SEQUÊNCIA ATUAL",30,muted,700)+t(124,1430,number(input.streak)+" dias",68,accent,700);
    if(input.showWeight&&validWeight(input.currentWeight)) content+=t(82,1550,"Peso atual",35,muted)+t(998,1550,number(input.currentWeight)+" kg",48,ink,700,"end");
    else content+=t(82,1550,"Uma escolha de cada vez.",40,ink,700);
  } else if(input.kind==="achievement" && input.achievement){
    const a=input.achievement;
    content+=chip("CONQUISTA")+title("Desbloqueada!");
    content+='<circle cx="540" cy="900" r="285" fill="'+accent+'" opacity=".06"/><circle cx="540" cy="900" r="235" fill="none" stroke="'+accent+'" stroke-width="3" stroke-dasharray="5 20"/><circle cx="540" cy="900" r="185" fill="'+accent+'" opacity=".12"/><path d="M455 1015l-25 142 110-62 110 62-25-142" fill="'+accent+'" opacity=".7"/><circle cx="540" cy="875" r="122" fill="'+panel+'" stroke="'+accent+'" stroke-width="12"/><path d="M540 800l23 48 53 8-38 37 9 53-47-25-47 25 9-53-38-37 53-8Z" fill="'+accent+'"/>';
    content+=multi(540,1260,a.title,73,24,2,"middle")+multi(540,1455,a.description,39,41,3,"middle",muted);
    if(a.unlockedAt){const date=new Date(a.unlockedAt);if(Number.isFinite(date.getTime()))content+=t(540,1600,"Desbloqueada em "+shortDate(getLocalDateString(date,input.timezone)),32,accent,700,"middle");}
  }
  const footer=(input.name?t(540,1640,limit(input.name,32),30,muted,600,"middle"):"")+'</g></svg>';
  return head+content+footer;
}

// SVG images loaded through a Blob URL do not reliably inherit document fonts.
// Rasterize the artwork first, then paint text with the loaded self-hosted font.
export async function storyPng(svg: string, fontFamily: string): Promise<Blob> {
  const doc=new DOMParser().parseFromString(svg,"image/svg+xml");
  if(doc.querySelector("parsererror")) throw new Error("Story SVG inválido.");
  const textNodes=Array.from(doc.querySelectorAll("text"));
  const texts=textNodes.map(node=>({
    value:node.textContent??"",
    x:Number(node.getAttribute("x")),y:Number(node.getAttribute("y")),
    size:Number(node.getAttribute("font-size")??36),
    weight:Number(node.getAttribute("font-weight")??500),
    spacing:Number(node.getAttribute("letter-spacing")??0),
    fill:node.getAttribute("fill")??"#15253A",
    anchor:node.getAttribute("text-anchor")??"start",
  }));
  // Load the actual Manrope face for each weight before export, not a fallback.
  const family=fontFamily.split(",")[0].trim();
  const font=(size:number,weight:number)=>weight+" "+size+"px "+family;
  await Promise.all(Array.from(new Set(texts.map(t=>t.weight))).map(async weight=>{
    const faces=await document.fonts.load(font(36,weight),"SmartPlateAI áéíóúçã −0123456789");
    if(!faces.length||faces.some(face=>face.status!=="loaded")) throw new Error("Não foi possível carregar Manrope.");
  }));
  textNodes.forEach(node=>node.remove());
  const artwork=new XMLSerializer().serializeToString(doc.documentElement);
  const source=URL.createObjectURL(new Blob([artwork],{type:"image/svg+xml;charset=utf-8"}));
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("Não foi possível renderizar a imagem."));image.src=source;});
    const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas indisponível.");
    ctx.drawImage(image,0,0);
    ctx.textBaseline="alphabetic";
    for(const t of texts){
      ctx.font=font(t.size,t.weight);
      ctx.fillStyle=t.fill;
      ctx.textAlign=t.anchor==="end"?"right":t.anchor==="middle"?"center":"left";
      // Keep the native shaping/kerning on all browsers; spacing is supported
      // on recent Canvas implementations, older ones still render Manrope.
      if("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & {letterSpacing:string}).letterSpacing=t.spacing+"px";
      ctx.fillText(t.value,t.x,t.y);
    }
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Não foi possível gerar o PNG.")),"image/png"));
  }finally{URL.revokeObjectURL(source);}
}
