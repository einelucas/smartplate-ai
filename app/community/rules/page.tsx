// app/community/rules/page.tsx
import { ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    title: "Consistência acima de resultado",
    body: "A Comunidade celebra hábitos, streaks, desafios e conquistas — não peso perdido, calorias ou comparações físicas. Publicações focadas em emagrecimento, dietas extremas ou metas de peso não são permitidas.",
  },
  {
    title: "Respeito",
    body: "Trate outros membros com respeito. Não é permitido assédio, discurso de ódio, conteúdo sexual ou ataques pessoais.",
  },
  {
    title: "Sem conselhos médicos perigosos",
    body: "Não compartilhe recomendações de saúde perigosas, dietas extremas, jejuns prolongados ou qualquer conteúdo que possa colocar a saúde de alguém em risco.",
  },
  {
    title: "Sem spam",
    body: "Não use a Comunidade para divulgar produtos, serviços ou links não relacionados aos objetivos do SmartPlateAI.",
  },
  {
    title: "Denúncias e moderação",
    body: "Qualquer post, comentário ou usuário pode ser denunciado. Nossa moderação analisa denúncias e pode ocultar conteúdo ou remover comentários que violem estas regras.",
  },
  {
    title: "Bloqueios",
    body: "Você pode bloquear qualquer usuário a qualquer momento. Um usuário bloqueado deixa de aparecer no seu feed, buscas e sugestões, e não pode enviar solicitações de amizade.",
  },
];

export default function CommunityRulesPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#007BFF]/10 rounded-2xl flex items-center justify-center">
          <ShieldCheck size={24} className="text-[#007BFF]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Regras da Comunidade</h1>
          <p className="text-sm text-slate-400">SmartPlateAI</p>
        </div>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-800 mb-1">{section.title}</h2>
            <p className="text-sm text-slate-500">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
