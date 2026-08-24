// Compartilhado entre app/profile/loading.tsx (Suspense de navegação) e o
// estado isLoading interno de app/profile/page.tsx (dados do React Query
// ainda não chegaram) — mesma aparência nos dois casos, sem spinner
// fullscreen.
export default function ProfileSkeleton() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 bg-slate-100 rounded-full mb-4" />
              <div className="h-5 w-32 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="h-24 bg-slate-100 rounded-2xl" />
          <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
          </div>
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
