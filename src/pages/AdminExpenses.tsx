import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, Receipt, AlertTriangle, Download, Search, BarChart2, Calendar,
  PackageSearch, Plus, Sparkles, Loader2
} from "lucide-react";
import { API_URL } from "@/data/menuData";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ShortcutManagerModal from "@/components/admin/ShortcutManagerModal";
import ExpenseEntryModal from "@/components/admin/ExpenseEntryModal";

// ─── Constants ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: "materia-prima", label: "Matéria-Prima", color: "#10b981", icon: "🥤" },
  { id: "embalagem", label: "Embalagem", color: "#3b82f6", icon: "📦" },
  { id: "utensilios", label: "Utensílios", color: "#f59e0b", icon: "🥄" },
  { id: "higiene", label: "Higiene/Limpeza", color: "#8b5cf6", icon: "🧴" },
  { id: "marketing", label: "Marketing", color: "#ec4899", icon: "📢" },
  { id: "energia", label: "Energia/Água", color: "#14b8a6", icon: "⚡" },
  { id: "outros", label: "Outros", color: "#64748b", icon: "📋" },
];

export interface ExpenseShortcut {
  id: number;
  description: string;
  category: string;
  suggested_amount: string;
}

interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  note_ref: string | null;
  created_at: string;
}

interface ExpenseFormItem {
  id: string;
  date: string;
  category: string;
  description: string;
  size: string;
  amount: string;
}

function getAuthHeader(token: string | null) {
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

async function fetchExpenses(token: string | null, start?: string, end?: string): Promise<Expense[]> {
  let url = `${API_URL}/expenses`;
  if (start && end) url += `?start=${start}&end=${end}`;
  const res = await fetch(url, { headers: getAuthHeader(token) });
  if (!res.ok) throw new Error("Erro ao buscar despesas");
  return res.json();
}

async function fetchExpenseShortcuts(token: string | null): Promise<ExpenseShortcut[]> {
  const res = await fetch(`${API_URL}/expense-shortcuts`, { headers: getAuthHeader(token) });
  if (!res.ok) throw new Error("Erro ao buscar atalhos");
  return res.json();
}

function getCategoryInfo(idOrLabel: string) {
  return CATEGORIES.find(c => c.id === idOrLabel || c.label === idOrLabel) || CATEGORIES[CATEGORIES.length - 1];
}

function formatCurrency(v: number) { return `R$ ${Number(v).toFixed(2)}`; }
function formatDate(d: string) {
  if (!d) return "—";
  const datePart = d.includes("T") ? d.split("T")[0] : d;
  const dt = new Date(datePart + "T12:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function exportToCSV(expenses: Expense[]) {
  const header = "Data,Categoria,Descrição,Valor,Referência\n";
  const rows = expenses.map(e => `${e.date},${e.category},"${e.description}",${e.amount},"${e.note_ref || ""}"`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `despesas_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`;
  link.click();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminExpenses() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  
  const [filterStart, setFilterStart] = useState(firstDay);
  const [filterEnd, setFilterEnd] = useState(lastDay);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  const [activeSection, setActiveSection] = useState<"dashboard" | "analytics" | "shortcuts">("dashboard");
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  
  // Modals
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", filterStart, filterEnd],
    queryFn: () => fetchExpenses(token, filterStart, filterEnd),
  });

  const { data: shortcuts = [] } = useQuery({
    queryKey: ["expense-shortcuts"],
    queryFn: () => fetchExpenseShortcuts(token),
  });

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
  const { data: lastMonthExpenses = [] } = useQuery({
    queryKey: ["expenses", lastMonthStart, lastMonthEnd],
    queryFn: () => fetchExpenses(token, lastMonthStart, lastMonthEnd),
  });

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (searchTerm) result = result.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()) || (e.note_ref || "").toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCategory !== "all") result = result.filter(e => getCategoryInfo(e.category).id === filterCategory);
    switch (sortBy) {
      case "date_asc": result.sort((a, b) => a.date.localeCompare(b.date)); break;
      case "date_desc": result.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "amount_asc": result.sort((a, b) => a.amount - b.amount); break;
      case "amount_desc": result.sort((a, b) => b.amount - a.amount); break;
    }
    return result;
  }, [expenses, searchTerm, filterCategory, sortBy]);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const changePercent = lastMonthTotal > 0 ? ((totalExpenses - lastMonthTotal) / lastMonthTotal * 100) : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = getCategoryInfo(e.category);
      map[cat.id] = (map[cat.id] || 0) + Number(e.amount);
    });
    return CATEGORIES.map(c => ({ ...c, total: map[c.id] || 0 })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const dailyChart = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const d = new Date(e.date + "T12:00:00");
      const key = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => {
        const [d1, m1] = a.date.split("/"); const [d2, m2] = b.date.split("/");
        return m1 !== m2 ? Number(m1) - Number(m2) : Number(d1) - Number(d2);
      });
  }, [expenses]);

  const handleSaveExpense = async (supplier: string, noteRef: string, noteDate: string, valid: ExpenseFormItem[]) => {
    setSaving(true);
    const fullRef = [supplier.trim() && `Fornecedor: ${supplier.trim()}`, noteRef.trim()].filter(Boolean).join(" | ") || null;
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: getAuthHeader(token),
        body: JSON.stringify({
          items: valid.map(i => ({ ...i, date: noteDate, amount: parseFloat(i.amount) })),
          note_ref: fullRef
        })
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowEntryModal(false);
      alert(`✅ ${valid.length} item(ns) lançado(s) com sucesso!`);
    } catch {
      alert("Erro ao salvar a nota. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE", headers: getAuthHeader(token) });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Receipt className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Controle de Despesas</h2>
            <p className="text-sm text-muted-foreground">Gestão completa de custos e notas fiscais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEntryModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-md shadow-emerald-500/20">
            <Plus size={16} /> Incluir Nota
          </button>
          <button onClick={() => exportToCSV(filteredExpenses)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground border border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors">
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex border-b border-border gap-1">
        {[
          { id: "dashboard", label: "Visão Geral", icon: Calendar },
          { id: "analytics", label: "Análise", icon: BarChart2 },
          { id: "shortcuts", label: "Atalhos", icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => setActiveSection(id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeSection === id ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: DASHBOARD (Overview + History)                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeSection === "dashboard" && (
        <div className="space-y-6">
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total no Período", value: formatCurrency(totalExpenses), sub: changePercent !== 0 ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}% vs mês anterior` : "Primeiro registro", subColor: changePercent > 0 ? "text-rose-500" : "text-emerald-500", icon: "💰", bg: "from-rose-500/10 to-orange-500/10" },
              { label: "Maior Categoria", value: byCategory[0]?.icon + " " + byCategory[0]?.label || "—", sub: byCategory[0] ? formatCurrency(byCategory[0].total) : "Sem dados", subColor: "text-muted-foreground", icon: "📊", bg: "from-blue-500/10 to-purple-500/10" },
              { label: "Lançamentos", value: String(expenses.length), sub: filteredExpenses.length !== expenses.length ? `${filteredExpenses.length} filtrados` : "No período", subColor: "text-muted-foreground", icon: "📋", bg: "from-emerald-500/10 to-teal-500/10" },
              { label: "Média por Lançamento", value: expenses.length > 0 ? formatCurrency(totalExpenses / expenses.length) : "R$ 0,00", sub: "Valor médio gasto", subColor: "text-muted-foreground", icon: "📈", bg: "from-purple-500/10 to-pink-500/10" }
            ].map((kpi, i) => (
              <div key={i} className={`bg-gradient-to-br ${kpi.bg} border border-border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-3"><span className="text-lg">{kpi.icon}</span></div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground leading-tight">{kpi.value}</p>
                <p className={`text-xs mt-1 ${kpi.subColor}`}>{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
              <Search size={15} className="text-muted-foreground" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar descrição ou nota..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none flex-1" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">Todas as categorias</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="date_desc">Mais recente</option>
              <option value="date_asc">Mais antigo</option>
              <option value="amount_desc">Maior valor</option>
              <option value="amount_asc">Menor valor</option>
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
              <span className="text-muted-foreground text-sm">até</span>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" /> Carregando lançamentos...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-16 text-center">
                <PackageSearch size={48} className="mx-auto text-muted-foreground/40 mb-4" />
                <p className="font-semibold text-foreground mb-1">Nenhum lançamento encontrado</p>
                <p className="text-sm text-muted-foreground">Tente outro período ou clique em "Incluir Nota" para adicionar novos registros.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="p-4 text-left font-semibold text-muted-foreground">Data</th>
                      <th className="p-4 text-left font-semibold text-muted-foreground">Categoria</th>
                      <th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th>
                      <th className="p-4 text-left font-semibold text-muted-foreground">Referência</th>
                      <th className="p-4 text-right font-semibold text-muted-foreground">Valor</th>
                      <th className="p-4 text-center font-semibold text-muted-foreground">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredExpenses.map(e => {
                      const cat = getCategoryInfo(e.category);
                      return (
                        <tr key={e.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="p-4 text-muted-foreground whitespace-nowrap font-mono text-xs">{formatDate(e.date)}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                              {cat.icon} {cat.label}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-foreground max-w-xs">{e.description}</td>
                          <td className="p-4 text-xs text-muted-foreground italic max-w-[140px] truncate">{e.note_ref || "—"}</td>
                          <td className="p-4 text-right font-bold" style={{ color: "#ef4444" }}>{formatCurrency(e.amount)}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={4} className="p-4 font-bold text-foreground">Total do Período Filtrado</td>
                      <td className="p-4 text-right text-lg font-bold" style={{ color: "#ef4444" }}>
                        {formatCurrency(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: ANALYTICS                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeSection === "analytics" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-5 flex items-center gap-2">
              <span className="text-lg">📊</span> Gastos por Categoria
            </h3>
            <div className="space-y-4">
              {byCategory.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Sem dados no período.</p>
              ) : byCategory.map(cat => {
                const pct = totalExpenses > 0 ? (cat.total / totalExpenses * 100) : 0;
                const budget = budgets[cat.id] || 0;
                const overBudget = budget > 0 && cat.total > budget;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{cat.icon} {cat.label}</span>
                      <div className="flex items-center gap-3">
                        {overBudget && <AlertTriangle size={14} className="text-rose-500" />}
                        <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                        <span className="font-bold text-sm" style={{ color: cat.color }}>{formatCurrency(cat.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: overBudget ? "#ef4444" : cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-5 flex items-center gap-2">
              <span className="text-lg">📅</span> Evolução Diária de Gastos
            </h3>
            <div className="h-[260px]">
              {dailyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`R$ ${Number(v).toFixed(2)}`, "Gasto"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {dailyChart.map((entry, i) => (
                        <Cell key={i} fill={entry.total > (totalExpenses / dailyChart.length * 1.5) ? "#ef4444" : "#f59e0b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Lance despesas para ver a evolução diária.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: SHORTCUTS                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeSection === "shortcuts" && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <Sparkles size={40} className="mx-auto text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-foreground">Gerenciador de Atalhos</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
              Crie atalhos para os itens que você mais lança (ex: Gás, Conta de Luz, Açaí 10L) para preencher a nota com apenas 1 clique!
            </p>
          </div>
          <button onClick={() => setShowShortcutModal(true)} className="bg-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-600 transition-colors">
            Configurar Meus Atalhos
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      <ExpenseEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSave={handleSaveExpense}
        shortcuts={shortcuts}
        categories={CATEGORIES}
        saving={saving}
        onOpenShortcutManager={() => {
          setShowEntryModal(false);
          setShowShortcutModal(true);
        }}
      />

      <ShortcutManagerModal
        isOpen={showShortcutModal}
        onClose={() => setShowShortcutModal(false)}
        shortcuts={shortcuts}
        token={token}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["expense-shortcuts"] })}
        categories={CATEGORIES}
      />
    </div>
  );
}
