// Skeleton da rota "/" — cobre tanto a Home autenticada quanto o instante
// antes da landing pública decidir o que mostrar. Fica neutro de propósito
// (não copia o layout exato do HomeDashboard) para não "piscar" errado para
// quem não está logado.
export default function RootLoading() {
  return (
    <div className="p-4 sm:p-8 animate-pulse">
      <div className="h-40 sm:h-48 bg-slate-100 rounded-3xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 rounded-3xl" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-48 bg-slate-100 rounded-3xl" />
          <div className="h-40 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
