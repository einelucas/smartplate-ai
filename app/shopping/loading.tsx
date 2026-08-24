export default function ShoppingLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-slate-100 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-9 bg-slate-100 rounded-full" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-100 rounded-xl flex-shrink-0" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
            <div className="px-4 pb-4 space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-10 bg-slate-50 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
