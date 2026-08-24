export default function GroupDetailLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="h-8 w-24 bg-slate-100 rounded mb-4" />
      <div className="h-24 bg-slate-100 rounded-2xl mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-100 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
