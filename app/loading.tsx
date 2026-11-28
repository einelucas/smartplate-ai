export default function HomeLoading() {
  return <div className="mx-auto max-w-[540px] space-y-3 px-3 py-6 animate-pulse" role="status" aria-label="Carregando início">
    <div className="h-16 rounded-[24px] bg-[#e1ebef]"/>
    <div className="h-56 rounded-[24px] bg-white"/>
    <div className="grid grid-cols-2 gap-3"><div className="h-40 rounded-[24px] bg-white"/><div className="h-40 rounded-[24px] bg-white"/></div>
    <div className="h-24 rounded-[24px] bg-white"/><div className="h-36 rounded-[24px] bg-white"/>
  </div>;
}
