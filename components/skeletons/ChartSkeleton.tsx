// Placeholder do tamanho exato do WeightChart (recharts, code-split), para
// o card de peso não pular de altura quando o chunk terminar de carregar.
export default function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
        <div className="h-5 w-14 bg-slate-100 rounded-full" />
      </div>
      <div className="h-40 bg-slate-50 rounded-xl" />
    </div>
  );
}
