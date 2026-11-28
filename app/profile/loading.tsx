export default function ProfileLoading() {
  return <div aria-label="Carregando perfil" role="status" className="mx-auto max-w-[540px] space-y-3 px-3 py-6 animate-pulse">
    <div className="h-14 w-36 rounded-xl bg-[#e1ebef]" />
    {[88, 174, 112, 225].map((height) => <div key={height} className="rounded-[24px] bg-white" style={{height}} />)}
  </div>;
}
