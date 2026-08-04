import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Camera, FileText, X, Save, Loader2, Receipt, TrendingDown, PackageSearch, Tag } from "lucide-react";
import { API_URL } from "@/data/menuData";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = ["Matéria-Prima", "Embalagem", "Utensílios", "Higiene/Limpeza", "Outros"];

interface ExpenseItem {
  date: string;
  category: string;
  description: string;
  amount: string;
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

async function deleteExpense(id: number, token: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE", headers: getAuthHeader(token) });
  if (!res.ok) throw new Error("Erro ao excluir despesa");
}

async function saveExpenses(items: ExpenseItem[], noteRef: string, token: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: getAuthHeader(token),
    body: JSON.stringify({ items: items.map(i => ({ ...i, amount: parseFloat(i.amount) || 0 })), note_ref: noteRef || null })
  });
  if (!res.ok) throw new Error("Erro ao salvar despesas");
}

const emptyItem = (): ExpenseItem => ({
  date: new Date().toISOString().split("T")[0],
  category: "Matéria-Prima",
  description: "",
  amount: ""
});

export default function AdminExpenses() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [items, setItems] = useState<ExpenseItem[]>([emptyItem()]);
  const [noteRef, setNoteRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuggestions, setOcrSuggestions] = useState<ExpenseItem[]>([]);
  const [showOcr, setShowOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History filter
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const [filterStart, setFilterStart] = useState(firstDay);
  const [filterEnd, setFilterEnd] = useState(lastDay);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", filterStart, filterEnd],
    queryFn: () => fetchExpenses(token, filterStart, filterEnd),
  });

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  // ─── Form handlers ───
  const updateItem = (idx: number, field: keyof ExpenseItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const valid = items.filter(i => i.description.trim() && parseFloat(i.amount) > 0);
    if (valid.length === 0) { setSaveMsg("Preencha ao menos um item com descrição e valor."); return; }
    setSaving(true); setSaveMsg("");
    try {
      await saveExpenses(valid, noteRef, token);
      setSaveMsg(`✅ ${valid.length} item(ns) lançado(s) com sucesso!`);
      setItems([emptyItem()]);
      setNoteRef("");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch {
      setSaveMsg("❌ Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja excluir este lançamento?")) return;
    await deleteExpense(id, token);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  // ─── OCR handler ───
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setShowOcr(true);
    setOcrSuggestions([]);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Parse lines for "description - R$ value" or "description value"
      const lines = text.split("\n").filter(l => l.trim().length > 3);
      const parsed: ExpenseItem[] = [];
      const today = new Date().toISOString().split("T")[0];

      // Simple heuristic: look for lines with currency numbers
      const moneyRegex = /R?\$?\s*(\d+[\.,]\d{2})/gi;
      for (const line of lines) {
        const matches = [...line.matchAll(moneyRegex)];
        if (matches.length > 0) {
          const rawAmount = matches[matches.length - 1][1].replace(",", ".");
          const desc = line.replace(moneyRegex, "").replace(/[-:]/g, "").trim();
          if (desc.length > 1 && parseFloat(rawAmount) > 0) {
            parsed.push({
              date: today,
              category: "Matéria-Prima",
              description: desc,
              amount: rawAmount
            });
          }
        }
      }
      setOcrSuggestions(parsed.length > 0 ? parsed : []);
    } catch (err) {
      console.error("OCR error:", err);
      setOcrSuggestions([]);
    } finally {
      setOcrLoading(false);
    }
  }, []);

  const acceptOcrSuggestions = () => {
    if (ocrSuggestions.length > 0) {
      setItems(prev => {
        const filtered = prev.filter(i => i.description.trim());
        return [...filtered, ...ocrSuggestions];
      });
    }
    setShowOcr(false);
    setOcrSuggestions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  const formatCurrency = (v: number) => `R$ ${Number(v).toFixed(2)}`;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
          <Receipt size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Controle de Despesas</h2>
          <p className="text-sm text-muted-foreground">Lance notas de compra e acompanhe seus custos.</p>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl">
          <p className="text-xs text-muted-foreground font-medium mb-1">Total no Período</p>
          <p className="text-2xl font-bold text-rose-500">{formatCurrency(totalExpenses)}</p>
        </div>
        {Object.entries(expenseByCategory).slice(0, 3).map(([cat, val]) => (
          <div key={cat} className="bg-card border border-border p-4 rounded-xl">
            <p className="text-xs text-muted-foreground font-medium mb-1 truncate">{cat}</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(val)}</p>
          </div>
        ))}
      </div>

      {/* Entry form */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={20} />
            <h3 className="font-semibold text-lg text-foreground">Lançar Nova Nota</h3>
          </div>
          {/* OCR button */}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors px-4 py-2 rounded-xl text-sm font-medium"
            >
              <Camera size={16} />
              📷 Ler Nota (OCR)
            </button>
          </div>
        </div>

        {/* OCR Overlay */}
        {showOcr && (
          <div className="p-5 bg-amber-500/5 border-b border-amber-200 dark:border-amber-900">
            {ocrLoading ? (
              <div className="flex items-center gap-3 text-amber-600 font-medium">
                <Loader2 size={18} className="animate-spin" />
                Analisando a imagem da nota... Aguarde.
              </div>
            ) : ocrSuggestions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  ✨ {ocrSuggestions.length} item(ns) detectado(s) na foto. Revise antes de confirmar:
                </p>
                <div className="space-y-2">
                  {ocrSuggestions.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2 text-sm">
                      <span className="flex-1 text-foreground font-medium">{s.description}</span>
                      <span className="text-emerald-600 font-bold">R$ {s.amount}</span>
                      <button onClick={() => setOcrSuggestions(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={acceptOcrSuggestions} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
                    <Save size={14} /> Confirmar e Adicionar ao Formulário
                  </button>
                  <button onClick={() => { setShowOcr(false); setOcrSuggestions([]); }} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl border border-border">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Não consegui detectar valores automáticos na foto. A iluminação ou qualidade pode ter interferido. Lance os itens manualmente abaixo.
                </p>
                <button onClick={() => setShowOcr(false)} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl border border-border">
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Note reference */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Referência da Nota (Opcional)</label>
            <input
              value={noteRef}
              onChange={e => setNoteRef(e.target.value)}
              placeholder="Ex: Nota Mercado Central 01/08"
              className="w-full md:w-1/2 border border-border rounded-xl p-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Items list */}
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-muted/30 p-3 rounded-xl border border-border">
                <div className="col-span-12 md:col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Data</label>
                  <input type="date" value={item.date} onChange={e => updateItem(idx, "date", e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-12 md:col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
                  <select value={item.category} onChange={e => updateItem(idx, "category", e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className="text-xs text-muted-foreground block mb-1">Descrição do Item</label>
                  <input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)}
                    placeholder="Ex: Açaí 10kg, Nutella 1kg, Copos 200ml (100un)..."
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-10 md:col-span-1">
                  <label className="text-xs text-muted-foreground block mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(idx, "amount", e.target.value)}
                    placeholder="0,00"
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-end justify-end pb-0.5">
                  <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between pt-2">
            <button onClick={addItem} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <Plus size={16} /> Adicionar mais um item
            </button>
            <div className="flex items-center gap-3">
              {saveMsg && <p className={`text-sm font-medium ${saveMsg.startsWith("✅") ? "text-emerald-600" : "text-destructive"}`}>{saveMsg}</p>}
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Salvando..." : "Salvar Nota"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-rose-500" size={20} />
            <h3 className="font-semibold text-lg text-foreground">Histórico de Lançamentos</h3>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
            <span className="text-muted-foreground text-sm">até</span>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Carregando...
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-10 text-center">
              <PackageSearch className="mx-auto text-muted-foreground mb-3" size={40} />
              <p className="text-muted-foreground">Nenhum lançamento no período.</p>
              <p className="text-xs text-muted-foreground mt-1">Lance a primeira nota usando o formulário acima!</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-4 font-medium text-muted-foreground">Data</th>
                  <th className="p-4 font-medium text-muted-foreground">Categoria</th>
                  <th className="p-4 font-medium text-muted-foreground">Descrição</th>
                  <th className="p-4 font-medium text-muted-foreground">Referência</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">Valor</th>
                  <th className="p-4 font-medium text-muted-foreground text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="p-4">
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">{e.category}</span>
                    </td>
                    <td className="p-4 font-medium text-foreground">{e.description}</td>
                    <td className="p-4 text-xs text-muted-foreground italic">{e.note_ref || "—"}</td>
                    <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(e.amount)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={4} className="p-4 font-semibold text-foreground">Total do Período</td>
                  <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400 text-base">{formatCurrency(totalExpenses)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
