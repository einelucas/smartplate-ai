export default function MealPlanLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="h-8 w-48 bg-slate-100 rounded mb-6" />

      {/* Seletor de dias */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-14 w-[52px] flex-shrink-0 bg-slate-100 rounded-xl" />
        ))}
      </div>

      {/* Abas de refeição */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-100 rounded-full" />
        ))}
      </div>

      {/* Card da refeição selecionada */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="h-5 w-2/3 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-slate-100 rounded-xl" />
          <div className="h-10 w-28 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
