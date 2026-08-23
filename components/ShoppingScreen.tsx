// components/ShoppingScreen.tsx
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Apple, Milk, Wheat, Fish, Package, ChevronDown, Sparkles, Share2, Printer, Loader2 } from "lucide-react";

interface ShoppingItem {
  name: string;
  quantity: string;
  category: string;
  estimated_price: number;
  checked: boolean;
}

interface ShoppingListRecord {
  id: string;
  mealPlanId: string;
  items: ShoppingItem[];
  createdAt: string;
}

const categoryIcons: Record<string, { icon: any; color: string; bg: string }> = {
  Hortifruti: { icon: Apple, color: "text-green-600", bg: "bg-green-100" },
  Proteínas: { icon: Fish, color: "text-red-600", bg: "bg-red-100" },
  Laticínios: { icon: Milk, color: "text-blue-600", bg: "bg-blue-100" },
  "Grãos e Cereais": { icon: Wheat, color: "text-amber-700", bg: "bg-amber-100" },
  Mercearia: { icon: Package, color: "text-purple-600", bg: "bg-purple-100" },
};

const getCategoryStyle = (name: string) => categoryIcons[name] || { icon: Package, color: "text-slate-500", bg: "bg-slate-100" };

const getWeekRange = () => {
  const start = new Date();
  start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const monthLabel = start.toLocaleDateString("pt-BR", { month: "long" });
  return `Semana de ${start.getDate()} a ${end.getDate()} de ${monthLabel}`;
};

export default function ShoppingScreen() {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const { data: plansData } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!isSignedIn,
  });
  const latestPlan = plansData?.plans?.[0] ?? null;

  const { data: listData } = useQuery({
    queryKey: ["shopping-list", latestPlan?.id],
    queryFn: async () => {
      const res = await fetch(`/api/shopping-list?mealPlanId=${latestPlan.id}`);
      if (!res.ok) return { list: null };
      return res.json();
    },
    enabled: !!isSignedIn && !!latestPlan?.id,
  });

  const [localList, setLocalList] = useState<ShoppingListRecord | null>(null);

  useEffect(() => {
    setLocalList(listData?.list ?? null);
    if (listData?.list?.items?.length) {
      const cats = [...new Set(listData.list.items.map((i: ShoppingItem) => i.category))] as string[];
      setExpandedCategories(cats.slice(0, 2));
    }
  }, [listData]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!latestPlan) throw new Error("Gere um plano alimentar primeiro");
      const res = await fetch("/api/shopping-list/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlanId: latestPlan.id }),
      });
      if (!res.ok) throw new Error("Erro ao gerar lista");
      return res.json();
    },
    onSuccess: (data) => {
      const record: ShoppingListRecord = { id: data.id, mealPlanId: data.mealPlanId, items: data.items, createdAt: new Date().toISOString() };
      setLocalList(record);
      queryClient.setQueryData(["shopping-list", latestPlan?.id], { list: record });
      const cats = [...new Set(data.items.map((i: ShoppingItem) => i.category))] as string[];
      setExpandedCategories(cats.slice(0, 2));
      toast.success("Lista gerada com sucesso!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (items: ShoppingItem[]) => {
      if (!localList?.id) return;
      const res = await fetch(`/api/shopping-list/${localList.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar item");
      return res.json();
    },
  });

  const toggleItem = (index: number) => {
    if (!localList) return;
    const newItems = localList.items.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item));
    setLocalList({ ...localList, items: newItems });
    toggleMutation.mutate(newItems);
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const items = Array.isArray(localList?.items) ? localList.items : [];
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.checked).length;
  const totalCost = items.reduce((acc, i) => acc + (i.estimated_price || 0), 0);
  const checkedCost = items.filter((i) => i.checked).reduce((acc, i) => acc + (i.estimated_price || 0), 0);

  const categories = items.reduce<Record<string, (ShoppingItem & { originalIndex: number })[]>>((acc, item, index) => {
    const cat = item.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...item, originalIndex: index });
    return acc;
  }, {});

  const copyList = () => {
    const text = Object.entries(categories)
      .map(([cat, its]) => `${cat}:\n${its.map((i) => `  • ${i.name} (${i.quantity})`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Lista copiada!");
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{getWeekRange()}</h2>
          <p className="text-sm text-slate-500">{totalItems > 0 ? `${totalItems} itens no total` : "Gere sua lista com IA baseada no plano da semana"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {totalItems > 0 && (
            <>
              <button onClick={() => window.print()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
              <button onClick={copyList} className="rounded-xl border border-[#007BFF] text-[#007BFF] px-4 py-2 text-sm font-medium hover:bg-[#007BFF]/5 flex items-center gap-2">
                <Share2 size={16} /> Compartilhar
              </button>
            </>
          )}
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !latestPlan}
            className="bg-[#007BFF] hover:bg-[#0056b3] disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gerar Lista
          </button>
        </div>
      </div>

      {!latestPlan && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-5xl mb-4">🥗</p>
          <p className="text-slate-500">Gere um plano alimentar na aba &quot;Plano Semanal&quot; para criar sua lista de compras.</p>
        </div>
      )}

      {latestPlan && totalItems === 0 && !generateMutation.isPending && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-slate-500">Clique em &quot;Gerar Lista&quot; para criar sua lista de compras com IA baseada no seu plano alimentar.</p>
        </div>
      )}

      {totalItems > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Categories */}
          <div className="lg:col-span-8 space-y-4">
            {Object.entries(categories).map(([catName, catItems]) => {
              const style = getCategoryStyle(catName);
              const Icon = style.icon;
              const isExpanded = expandedCategories.includes(catName);
              const checked = catItems.filter((i) => i.checked).length;
              const catTotal = catItems.reduce((a, i) => a + (i.estimated_price || 0), 0);

              return (
                <motion.div key={catName} layout className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <button onClick={() => toggleCategory(catName)} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${style.bg} rounded-xl flex items-center justify-center`}>
                        <Icon size={22} className={style.color} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-slate-800">{catName}</h3>
                        <p className="text-sm text-slate-500">
                          {checked}/{catItems.length} itens • R$ {catTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div className="h-full bg-[#28A745] rounded-full transition-all" style={{ width: `${(checked / catItems.length) * 100}%` }} />
                      </div>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={20} className="text-slate-400" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-4">
                          <div className="border-t border-slate-100 pt-4 space-y-2">
                            {catItems.map((item) => (
                              <div
                                key={item.originalIndex}
                                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${item.checked ? "bg-[#28A745]/8" : "bg-slate-50"}`}
                              >
                                <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                                  <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item.originalIndex)} className="w-5 h-5 accent-[#28A745] rounded flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className={`font-medium break-words ${item.checked ? "line-through text-slate-400" : "text-slate-700"}`}>{item.name}</p>
                                    <p className="text-xs text-slate-400">{item.quantity}</p>
                                  </div>
                                </label>
                                <span className={`font-medium flex-shrink-0 ml-2 ${item.checked ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                  {item.estimated_price ? `R$ ${item.estimated_price.toFixed(2)}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Progresso das Compras</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Itens comprados</span>
                <span className="font-semibold text-[#28A745]">
                  {checkedItems}/{totalItems}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                <motion.div animate={{ width: `${(checkedItems / totalItems) * 100}%` }} className="h-full bg-gradient-to-r from-[#28A745] to-[#007BFF] rounded-full" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#007BFF] to-[#0056b3] rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-4">Estimativa de Custo</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/80">Total estimado</span>
                  <span className="font-bold text-xl">R$ {totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Já comprado</span>
                  <span className="font-semibold text-green-300">R$ {checkedCost.toFixed(2)}</span>
                </div>
                <div className="h-px bg-white/20 my-2" />
                <div className="flex justify-between">
                  <span className="text-white/80 font-medium">Restante</span>
                  <span className="font-bold text-xl">R$ {(totalCost - checkedCost).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-white/60 mt-4">
                Preços estimados por IA com busca na web — podem variar por região e loja.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Por Categoria</h3>
              <div className="space-y-3">
                {Object.entries(categories).map(([catName, catItems]) => {
                  const style = getCategoryStyle(catName);
                  const Icon = style.icon;
                  const catTotal = catItems.reduce((a, i) => a + (i.estimated_price || 0), 0);
                  return (
                    <div key={catName} className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${style.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon size={14} className={style.color} />
                      </div>
                      <span className="text-sm text-slate-600 flex-1">{catName}</span>
                      <span className="font-semibold text-slate-700">R$ {catTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
