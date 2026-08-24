// app/profile/connected-apps/page.tsx
// Tela "Apps conectados" — acessível pelo Perfil (checklist item 57). Não é
// um sexto item da BottomNav.
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Unplug, CheckCircle2, Clock, AlertTriangle, Lock, ListFilter } from "lucide-react";
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay } from "@/lib/integrations/provider-display";
import { useConnectedApps, useSyncStrava, useDisconnectStrava, useExternalActivities, type ConnectedAppEntry } from "@/hooks/useConnectedApps";

const ActivityHistoryModal = dynamic(() => import("@/components/ActivityHistoryModal"), { ssr: false });

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: ConnectedAppEntry["status"] }) {
  if (status === "CONNECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#28A745] bg-[#28A745]/10 px-2 py-1 rounded-full">
        <CheckCircle2 size={12} /> Conectado
      </span>
    );
  }
  if (status === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
        <AlertTriangle size={12} /> Erro de autenticação
      </span>
    );
  }
  if (status === "COMING_SOON" || status === "UNAVAILABLE") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
        <Clock size={12} /> Em breve
      </span>
    );
  }
  return <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Não conectado</span>;
}

export default function ConnectedAppsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading } = useConnectedApps();
  const syncStrava = useSyncStrava();
  const disconnectStrava = useDisconnectStrava();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const apps = data?.apps ?? [];
  const stravaConnected = apps.some((app) => app.provider === "STRAVA" && app.status === "CONNECTED");
  const { data: externalActivitiesData } = useExternalActivities(stravaConnected);
  const stravaActivityCount = (externalActivitiesData?.activities ?? []).filter((a) => a.provider === "STRAVA").length;

  useEffect(() => {
    const strava = searchParams.get("strava");
    if (strava === "connected") {
      toast.success("Strava conectado!");
      router.replace("/profile/connected-apps");
    } else if (strava === "error") {
      const message = searchParams.get("message");
      const readable =
        message === "denied"
          ? "Conexão cancelada."
          : message === "not_configured"
          ? "Integração com o Strava ainda não está configurada neste ambiente."
          : "Não foi possível conectar ao Strava.";
      toast.error(readable);
      router.replace("/profile/connected-apps");
    }
  }, [searchParams, router]);

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Apps conectados</h1>
          <p className="text-sm text-slate-400">Sincronize atividades de outros apps — sempre de forma privada.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const display = getProviderDisplay(app.provider);
            const isStrava = app.provider === "STRAVA";
            const connected = app.status === "CONNECTED";

            return (
              <div key={app.provider} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                      <ProviderIcon provider={app.provider} size={22} className={display.accentClassName} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{display.label}</p>
                      {connected && <p className="text-xs text-slate-400">Última sincronização: {formatDateTime(app.lastSyncedAt)}</p>}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                {isStrava && connected && (
                  <div className="mb-3 bg-slate-50 rounded-xl p-3 space-y-2">
                    <p className="text-sm text-slate-600">
                      Atividades recentes: <span className="font-semibold text-slate-800">{stravaActivityCount}</span>
                    </p>
                    <p className="flex items-start gap-1.5 text-xs text-slate-500">
                      <Lock size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      Os dados sincronizados são privados e visíveis somente para você.
                    </p>
                  </div>
                )}

                {isStrava && (
                  <>
                    {connected ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => setShowActivities(true)}
                          className="flex items-center gap-1.5 text-sm font-medium border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50"
                        >
                          <ListFilter size={14} />
                          Ver atividades
                        </button>
                        <button
                          onClick={() => syncStrava.mutate()}
                          disabled={syncStrava.isPending}
                          className="flex items-center gap-1.5 text-sm font-medium bg-[#007BFF]/10 text-[#007BFF] px-3 py-2 rounded-xl disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={syncStrava.isPending ? "animate-spin" : ""} />
                          Sincronizar
                        </button>
                        {confirmingDisconnect ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                disconnectStrava.mutate();
                                setConfirmingDisconnect(false);
                              }}
                              className="text-sm font-medium bg-red-50 text-red-600 px-3 py-2 rounded-xl"
                            >
                              Confirmar
                            </button>
                            <button onClick={() => setConfirmingDisconnect(false)} className="text-sm text-slate-400 px-2">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDisconnect(true)}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-xl"
                          >
                            <Unplug size={14} />
                            Desconectar
                          </button>
                        )}
                      </div>
                    ) : app.status === "NOT_CONNECTED" ? (
                      <div>
                        <p className="text-xs text-slate-500 mb-3">
                          O SmartPlate acessará suas atividades do Strava para exibi-las somente para você, na sua área
                          privada. Elas nunca aparecem para outros usuários nem entram no ranking ou nos desafios da
                          Comunidade.
                        </p>
                        <a
                          href="/api/integrations/strava/connect"
                          className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#FC4C02] text-white px-4 py-2 rounded-xl"
                        >
                          Conectar Strava
                        </a>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showActivities && <ActivityHistoryModal onClose={() => setShowActivities(false)} initialFilter="STRAVA" />}
    </div>
  );
}
