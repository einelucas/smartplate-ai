export default function CommunityLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="h-16 bg-slate-100 rounded-2xl mb-6" />
      <div className="h-10 w-48 bg-slate-100 rounded-xl mb-6" />

      {/* Composer */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4 flex gap-3">
        <div className="h-11 w-11 bg-slate-100 rounded-full flex-shrink-0" />
        <div className="flex-1 h-11 bg-slate-100 rounded-xl" />
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-2 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
            <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
