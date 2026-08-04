import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Camera, FileText, X, Save, Loader2, Receipt,
  TrendingDown, PackageSearch, AlertTriangle,
  Download, Search, BarChart2, Zap, Check, Copy, Calendar,
  Building2, Scale, Hash, ShoppingBag, Sparkles, CheckCircle2
} from "lucide-react";
import { API_URL } from "@/data/menuData";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "materia-prima", label: "Matéria-Prima", color: "#10b981", icon: "🥤" },
  { id: "embalagem", label: "Embalagem", color: "#3b82f6", icon: "📦" },
  { id: "utensilios", label: "Utensílios", color: "#f59e0b", icon: "🥄" },
  { id: "higiene", label: "Higiene/Limpeza", color: "#8b5cf6", icon: "🧴" },
  { id: "marketing", label: "Marketing", color: "#ec4899", icon: "📢" },
  { id: "energia", label: "Energia/Água", color: "#14b8a6", icon: "⚡" },
  { id: "outros", label: "Outros", color: "#64748b", icon: "📋" },
];

// Quick-add shortcuts specific to açaí/sweets stores
const QUICK_ITEMS = [
  { description: "Açaí 10kg", category: "materia-prima", suggestedAmount: "" },
  { description: "Nutella 1kg", category: "materia-prima", suggestedAmount: "" },
  { description: "Leite em pó", category: "materia-prima", suggestedAmount: "" },
  { description: "Leite condensado", category: "materia-prima", suggestedAmount: "" },
  { description: "Granola 1kg", category: "materia-prima", suggestedAmount: "" },
  { description: "Paçoca", category: "materia-prima", suggestedAmount: "" },
  { description: "Banana", category: "materia-prima", suggestedAmount: "" },
  { description: "Morango", category: "materia-prima", suggestedAmount: "" },
  { description: "Copos 300ml (100un)", category: "embalagem", suggestedAmount: "" },
  { description: "Colheres (100un)", category: "embalagem", suggestedAmount: "" },
  { description: "Tampas", category: "embalagem", suggestedAmount: "" },
  { description: "Sacolas", category: "embalagem", suggestedAmount: "" },
  { description: "Álcool 70%", category: "higiene", suggestedAmount: "" },
  { description: "Detergente", category: "higiene", suggestedAmount: "" },
  { description: "Papel toalha", category: "higiene", suggestedAmount: "" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseFormItem {
  id: string;
  date: string;
  category: string;
  description: string;
  size: string;        // tamanho / quantidade (ex: 10kg, 500g, 100un)
  amount: string;
  isEditing?: boolean;
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

interface MonthlyBudget {
  [categoryId: string]: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getCategoryInfo(idOrLabel: string) {
  return CATEGORIES.find(c => c.id === idOrLabel || c.label === idOrLabel) || CATEGORIES[CATEGORIES.length - 1];
}

function formatCurrency(v: number) { return `R$ ${Number(v).toFixed(2)}`; }
function formatDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function todayStr() { return new Date().toISOString().split("T")[0]; }

function exportToCSV(expenses: Expense[]) {
  const header = "Data,Categoria,Descrição,Valor,Referência\n";
  const rows = expenses.map(e =>
    `${e.date},${e.category},"${e.description}",${e.amount},"${e.note_ref || ""}"`
  ).join("\n");
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

  // ── Date Filter ──
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const [filterStart, setFilterStart] = useState(firstDay);
  const [filterEnd, setFilterEnd] = useState(lastDay);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // ── Form State ──
  const [formItems, setFormItems] = useState<ExpenseFormItem[]>([
    { id: uid(), date: todayStr(), category: "materia-prima", description: "", size: "", amount: "" }
  ]);
  const [supplier, setSupplier] = useState("");    // fornecedor da nota
  const [noteRef, setNoteRef] = useState("");       // referência / número da nota
  const [noteDate, setNoteDate] = useState(todayStr()); // data única da nota
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [activeSection, setActiveSection] = useState<"form" | "history" | "analytics">("form");

  // ── OCR State ──
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPhase, setOcrPhase] = useState("");
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrSuggestions, setOcrSuggestions] = useState<ExpenseFormItem[]>([]);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Budget ──
  const [budgets, setBudgets] = useState<MonthlyBudget>({});
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);

  // ── Data ──
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", filterStart, filterEnd],
    queryFn: () => fetchExpenses(token, filterStart, filterEnd),
  });

  // Also fetch last month for comparison
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
  const { data: lastMonthExpenses = [] } = useQuery({
    queryKey: ["expenses", lastMonthStart, lastMonthEnd],
    queryFn: () => fetchExpenses(token, lastMonthStart, lastMonthEnd),
  });

  // ─── Computed Values ─────────────────────────────────────────────────────────

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (searchTerm) result = result.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()) || (e.note_ref || "").toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCategory !== "all") result = result.filter(e => {
      const cat = getCategoryInfo(e.category);
      return cat.id === filterCategory;
    });
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

  const formTotal = formItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  // ─── Form Handlers ────────────────────────────────────────────────────────────

  const updateItem = (id: string, field: keyof ExpenseFormItem, value: string) => {
    setFormItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addEmptyItem = () => {
    const last = formItems[formItems.length - 1];
    setFormItems(prev => [...prev, {
      id: uid(), date: noteDate, category: last?.category || "materia-prima", description: "", size: "", amount: ""
    }]);
  };

  const removeItem = (id: string) => {
    if (formItems.length === 1) return;
    setFormItems(prev => prev.filter(i => i.id !== id));
  };

  const addQuickItem = (item: typeof QUICK_ITEMS[0]) => {
    setFormItems(prev => {
      const last = prev[prev.length - 1];
      if (!last.description && !last.amount) {
        return prev.slice(0, -1).concat({ id: uid(), date: noteDate, category: item.category, description: item.description, size: "", amount: "" });
      }
      return [...prev, { id: uid(), date: noteDate, category: item.category, description: item.description, size: "", amount: "" }];
    });
    setShowQuickAdd(false);
  };

  const duplicateItem = (item: ExpenseFormItem) => {
    setFormItems(prev => [...prev, { ...item, id: uid() }]);
  };

  const clearForm = () => {
    setFormItems([{ id: uid(), date: todayStr(), category: "materia-prima", description: "", size: "", amount: "" }]);
    setSupplier("");
    setNoteRef("");
    setNoteDate(todayStr());
    setSaveMsg(null);
  };

  const handleSave = async () => {
    const valid = formItems.filter(i => i.description.trim() && parseFloat(i.amount) > 0);
    if (valid.length === 0) { setSaveMsg({ type: "err", text: "Preencha ao menos um item com descrição e valor." }); return; }
    setSaving(true); setSaveMsg(null);
    // Monta a referência completa com fornecedor
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
      setSaveMsg({ type: "ok", text: `✅ ${valid.length} item(ns) lançado(s) com sucesso!` });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setTimeout(() => setActiveSection("history"), 1200);
    } catch {
      setSaveMsg({ type: "err", text: "Erro ao salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE", headers: getAuthHeader(token) });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  // ─── OCR Handler ──────────────────────────────────────────────────────────────

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setOcrPreview(previewUrl);
    setShowOcrModal(true);
    setOcrLoading(true);
    setOcrSuggestions([]);
    setOcrPhase("Carregando motor de leitura...");
    try {
      const { createWorker } = await import("tesseract.js");
      setOcrPhase("Processando imagem...");
      const worker = await createWorker("por");
      setOcrPhase("Reconhecendo texto...");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setOcrPhase("Analisando valores...");
      const lines = text.split("\n").filter(l => l.trim().length > 2);
      const parsed: ExpenseFormItem[] = [];
      const moneyRegex = /R?\$?\s*(\d{1,4}[,.]?\d{0,2})/gi;
      for (const line of lines) {
        const matches = [...line.matchAll(moneyRegex)];
        if (matches.length > 0) {
          const rawAmount = matches[matches.length - 1][1].replace(",", ".");
          const amount = parseFloat(rawAmount);
          const desc = line.replace(moneyRegex, "").replace(/[-:R$]/g, "").trim();
          if (desc.length > 1 && amount > 0 && amount < 100000) {
            parsed.push({ id: uid(), date: noteDate, category: "materia-prima", description: desc, size: "", amount: rawAmount });
          }
        }
      }
      setOcrSuggestions(parsed);
    } catch (err) {
      console.error("OCR error:", err);
    } finally {
      setOcrLoading(false);
      setOcrPhase("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const confirmOcr = () => {
    const valid = ocrSuggestions.filter(s => s.description && s.amount);
    if (valid.length > 0) {
      setFormItems(prev => {
        const nonEmpty = prev.filter(i => i.description.trim());
        return [...nonEmpty, ...valid.map(s => ({ ...s, size: s.size || "" }))];
      });
    }
    setShowOcrModal(false);
    setOcrPreview(null);
    setOcrSuggestions([]);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

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
          <button onClick={() => exportToCSV(filteredExpenses)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground border border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors">
            <Download size={15} /> Exportar CSV
          </button>
          <button onClick={() => setShowBudgetPanel(!showBudgetPanel)} className="flex items-center gap-2 text-sm font-medium bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-2 hover:bg-amber-500/20 transition-colors">
            <BarChart2 size={15} /> Orçamento Mensal
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total no Período", value: formatCurrency(totalExpenses),
            sub: changePercent !== 0 ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}% vs mês anterior` : "Primeiro registro",
            subColor: changePercent > 0 ? "text-rose-500" : "text-emerald-500",
            icon: "💰", bg: "from-rose-500/10 to-orange-500/10"
          },
          {
            label: "Maior Categoria", value: byCategory[0]?.icon + " " + byCategory[0]?.label || "—",
            sub: byCategory[0] ? formatCurrency(byCategory[0].total) : "Sem dados",
            subColor: "text-muted-foreground", icon: "📊", bg: "from-blue-500/10 to-purple-500/10"
          },
          {
            label: "Lançamentos", value: String(expenses.length),
            sub: filteredExpenses.length !== expenses.length ? `${filteredExpenses.length} filtrados` : "No período",
            subColor: "text-muted-foreground", icon: "📋", bg: "from-emerald-500/10 to-teal-500/10"
          },
          {
            label: "Média por Lançamento", value: expenses.length > 0 ? formatCurrency(totalExpenses / expenses.length) : "R$ 0,00",
            sub: "Valor médio gasto", subColor: "text-muted-foreground", icon: "📈", bg: "from-purple-500/10 to-pink-500/10"
          }
        ].map((kpi, i) => (
          <div key={i} className={`bg-gradient-to-br ${kpi.bg} border border-border rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-foreground leading-tight">{kpi.value}</p>
            <p className={`text-xs mt-1 ${kpi.subColor}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Budget Panel ── */}
      {showBudgetPanel && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart2 size={18} className="text-amber-500" /> Orçamento Mensal por Categoria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORIES.map(cat => {
              const spent = byCategory.find(b => b.id === cat.id)?.total || 0;
              const budget = budgets[cat.id] || 0;
              const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const overBudget = budget > 0 && spent > budget;
              return (
                <div key={cat.id} className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{cat.icon} {cat.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${overBudget ? "text-rose-500" : "text-muted-foreground"}`}>
                        {formatCurrency(spent)}{budget > 0 ? ` / ${formatCurrency(budget)}` : ""}
                      </span>
                      {overBudget && <AlertTriangle size={14} className="text-rose-500" />}
                    </div>
                  </div>
                  {budget > 0 && (
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${overBudget ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Orçamento R$</span>
                    <input
                      type="number"
                      step="10"
                      value={budgets[cat.id] || ""}
                      onChange={e => setBudgets(prev => ({ ...prev, [cat.id]: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00"
                      className="flex-1 text-xs border border-border rounded-lg p-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section Tabs ── */}
      <div className="flex border-b border-border gap-1">
        {[
          { id: "form", label: "Lançar Nota", icon: FileText },
          { id: "history", label: "Histórico", icon: Calendar },
          { id: "analytics", label: "Análise", icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => setActiveSection(id as typeof activeSection)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeSection === id ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: FORM                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeSection === "form" && (
        <div className="space-y-4">

          {/* ── Cabeçalho da Nota ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-rose-500/5 to-orange-500/5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow">
                <ShoppingBag className="text-white" size={18} />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Nova Requisição de Entrada</p>
                <p className="text-xs text-muted-foreground">Preencha o cabeçalho e depois adicione os itens da nota</p>
              </div>
              <div className="ml-auto flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                  <Camera size={14} /> Ler Nota
                </button>
                <button onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-800 px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                  <Sparkles size={14} /> Atalhos
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fornecedor */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 size={12} /> Fornecedor
                </label>
                <input
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="Ex: Atacadão, Mercado Leal..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
              {/* Data da Nota */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar size={12} /> Data da Nota
                </label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={e => setNoteDate(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Referência/NF */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Hash size={12} /> Referência / Nº NF
                </label>
                <input
                  value={noteRef}
                  onChange={e => setNoteRef(e.target.value)}
                  placeholder="Ex: NF-001, 03/08..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Atalhos rápidos */}
            {showQuickAdd && (
              <div className="mx-5 mb-5 bg-purple-500/5 border border-purple-200 dark:border-purple-900 rounded-xl p-4 animate-in fade-in slide-in-from-top-1">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-3">Clique para adicionar ao formulário:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ITEMS.map((item, i) => {
                    const cat = getCategoryInfo(item.category);
                    return (
                      <button key={i} onClick={() => addQuickItem(item)}
                        className="flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
                        <span>{cat.icon}</span> {item.description}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Tabela de Itens ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
              <div className="col-span-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</div>
              <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição *</div>
              <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tam. / Qtd.</div>
              <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor (R$) *</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-border">
              {formItems.map((item, idx) => {
                const cat = getCategoryInfo(item.category);
                const isValid = item.description.trim() && parseFloat(item.amount) > 0;
                return (
                  <div
                    key={item.id}
                    className={`group grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${
                      isValid ? "bg-emerald-500/2" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Categoria */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Categoria</label>
                      <select
                        value={item.category}
                        onChange={e => updateItem(item.id, "category", e.target.value)}
                        className="w-full border border-border rounded-xl px-2.5 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>

                    {/* Descrição */}
                    <div className="col-span-12 md:col-span-4">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Descrição *</label>
                      <input
                        value={item.description}
                        onChange={e => updateItem(item.id, "description", e.target.value)}
                        placeholder="Ex: Açaí, Nutella, Copos..."
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* Tamanho / Quantidade */}
                    <div className="col-span-5 md:col-span-2">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Tam./Qtd.</label>
                      <div className="relative">
                        <Scale size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={item.size}
                          onChange={e => updateItem(item.id, "size", e.target.value)}
                          placeholder="10kg"
                          className="w-full border border-border rounded-xl pl-7 pr-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="col-span-5 md:col-span-2">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Valor *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={e => updateItem(item.id, "amount", e.target.value)}
                          placeholder="0,00"
                          className="w-full border border-border rounded-xl pl-8 pr-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
                      {isValid && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                      <button
                        onClick={() => duplicateItem(item)}
                        title="Duplicar"
                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={formItems.length === 1}
                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-20 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé da tabela */}
            <div className="px-4 py-3 border-t border-border bg-muted/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={addEmptyItem}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 transition-colors"
                >
                  <Plus size={14} /> Adicionar Item
                </button>
                <span className="text-sm text-muted-foreground">
                  {formItems.filter(i => i.description && i.amount).length} item(ns) válido(s)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Total da Nota:</span>
                <span className="text-lg font-black text-foreground">{formatCurrency(formTotal)}</span>
              </div>
            </div>
          </div>

          {/* ── Ações da Nota ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button
              onClick={clearForm}
              className="text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-muted transition-colors"
            >
              Limpar tudo
            </button>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {saveMsg && (
                <span className={`text-sm font-semibold flex items-center gap-1.5 ${
                  saveMsg.type === "ok" ? "text-emerald-600" : "text-destructive"
                }`}>
                  {saveMsg.type === "ok" ? <CheckCircle2 size={15} /> : null}
                  {saveMsg.text}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-500/20"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Salvando..." : `Salvar Nota — ${formatCurrency(formTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: HISTORY                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeSection === "history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
              <Search size={15} className="text-muted-foreground" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar descrição ou nota..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none flex-1" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">Todas as categorias</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="date_desc">Mais recente</option>
              <option value="date_asc">Mais antigo</option>
              <option value="amount_desc">Maior valor</option>
              <option value="amount_asc">Menor valor</option>
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
              <span className="text-muted-foreground text-sm">até</span>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
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
                <p className="text-sm text-muted-foreground">Tente outro período ou lance uma nota na aba "Lançar Nota".</p>
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
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                              {cat.icon} {cat.label}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-foreground max-w-xs">{e.description}</td>
                          <td className="p-4 text-xs text-muted-foreground italic max-w-[140px] truncate">{e.note_ref || "—"}</td>
                          <td className="p-4 text-right font-bold" style={{ color: "#ef4444" }}>{formatCurrency(e.amount)}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDelete(e.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
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
      {/* SECTION 3: ANALYTICS                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeSection === "analytics" && (
        <div className="space-y-6">
          {/* Spending by Category Progress Bars */}
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
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: overBudget ? "#ef4444" : cat.color }} />
                    </div>
                    {budget > 0 && (
                      <p className="text-xs text-muted-foreground">Orçamento: {formatCurrency(budget)} · Restante: <span className={overBudget ? "text-rose-500 font-semibold" : "text-emerald-600 font-semibold"}>{formatCurrency(budget - cat.total)}</span></p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Chart */}
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
                    <Tooltip
                      formatter={(v: number) => [`R$ ${Number(v).toFixed(2)}`, "Gasto"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }} />
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

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-3">Comparativo Mensal</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mês Atual</span>
                  <span className="font-bold text-rose-500">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mês Anterior</span>
                  <span className="font-bold text-foreground">{formatCurrency(lastMonthTotal)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Variação</span>
                  <span className={`font-bold text-sm ${changePercent > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                    {changePercent > 0 ? "▲" : "▼"} {Math.abs(changePercent).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-3">Top 3 Maiores Gastos</p>
              <div className="space-y-2">
                {[...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3).map((e, i) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <span className="text-xs text-foreground flex-1 truncate">{e.description}</span>
                    <span className="text-xs font-bold text-rose-500">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
                {expenses.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-3">Frequência por Categoria</p>
              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const count = expenses.filter(e => getCategoryInfo(e.category).id === cat.id).length;
                  if (count === 0) return null;
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-xs text-foreground flex-1">{cat.label}</span>
                      <span className="text-xs font-bold" style={{ color: cat.color }}>{count} lançamento(s)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OCR Modal ── */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Camera className="text-amber-500" size={20} /> Leitura de Nota por Foto (OCR)
              </h3>
              <button onClick={() => { setShowOcrModal(false); setOcrPreview(null); setOcrSuggestions([]); }}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Preview */}
              {ocrPreview && (
                <div className="rounded-xl overflow-hidden border border-border max-h-48 flex items-center justify-center bg-muted/30">
                  <img src={ocrPreview} alt="Nota" className="max-h-48 w-auto object-contain" />
                </div>
              )}

              {/* Loading */}
              {ocrLoading && (
                <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
                  <Loader2 size={24} className="text-amber-500 animate-spin shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Processando imagem...</p>
                    <p className="text-xs text-amber-600/70 mt-0.5">{ocrPhase}</p>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {!ocrLoading && ocrSuggestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    ✨ {ocrSuggestions.length} item(ns) detectado(s). Revise e edite antes de confirmar:
                  </p>
                  {ocrSuggestions.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl p-3">
                      <select value={s.category} onChange={e => setOcrSuggestions(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}
                        className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none">
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                      <input value={s.description} onChange={e => setOcrSuggestions(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                        className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <input type="number" step="0.01" value={s.amount} onChange={e => setOcrSuggestions(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                          className="w-20 border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <button onClick={() => setOcrSuggestions(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button onClick={confirmOcr}
                      className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                      <Check size={16} /> Confirmar e Adicionar ao Formulário
                    </button>
                    <button onClick={() => { setShowOcrModal(false); setOcrPreview(null); setOcrSuggestions([]); }}
                      className="text-sm text-muted-foreground border border-border rounded-xl px-5 py-2.5 hover:bg-muted transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* No results */}
              {!ocrLoading && ocrSuggestions.length === 0 && ocrPreview && (
                <div className="bg-muted/30 rounded-xl p-5 text-center space-y-2">
                  <p className="font-semibold text-foreground">Não consegui detectar valores automaticamente.</p>
                  <p className="text-sm text-muted-foreground">Tente uma foto com mais luz e câmera mais próxima da nota. Você pode lançar os itens manualmente no formulário.</p>
                  <button onClick={() => { setShowOcrModal(false); setOcrPreview(null); }}
                    className="text-sm text-primary font-medium hover:underline">Fechar e lançar manualmente</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
