import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Save } from "lucide-react";
import { ExpenseShortcut } from "@/pages/AdminExpenses";
import { API_URL } from "@/data/menuData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ExpenseShortcut[];
  token: string | null;
  onUpdated: () => void;
  categories: { id: string; label: string; icon: string }[];
}

export default function ShortcutManagerModal({ isOpen, onClose, shortcuts, token, onUpdated, categories }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("materia-prima");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setIsAdding(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getAuthHeader = () => ({ "Authorization": `Bearer ${token}`, "Content-Type": "application/json" });

  const handleSave = async () => {
    if (!description) {
      alert("A descrição é obrigatória.");
      return;
    }
    setLoading(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_URL}/expense-shortcuts/${editingId}` : `${API_URL}/expense-shortcuts`;
      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify({ 
          description, 
          category, 
          suggested_amount: suggestedAmount ? parseFloat(suggestedAmount) : 0 
        })
      });
      if (!res.ok) throw new Error();
      onUpdated();
      setEditingId(null);
      setIsAdding(false);
      setDescription("");
      setSuggestedAmount("");
    } catch {
      alert("Erro ao salvar atalho.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este atalho?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/expense-shortcuts/${id}`, {
        method: "DELETE",
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error();
      onUpdated();
    } catch {
      alert("Erro ao excluir atalho.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: ExpenseShortcut) => {
    setEditingId(item.id);
    setDescription(item.description);
    setCategory(item.category);
    setSuggestedAmount(item.suggested_amount || "");
    setIsAdding(true);
  };

  const startAdd = () => {
    setEditingId(null);
    setDescription("");
    setCategory("materia-prima");
    setSuggestedAmount("");
    setIsAdding(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-transparent">
          <h2 className="font-bold text-lg text-foreground">Gerenciar Atalhos</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {!isAdding && (
            <button onClick={startAdd} className="w-full flex items-center justify-center gap-2 border border-dashed border-primary/50 text-primary py-3 rounded-xl hover:bg-primary/5 transition-colors font-medium text-sm">
              <Plus size={16} /> Novo Atalho
            </button>
          )}

          {isAdding && (
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{editingId ? "Editar Atalho" : "Novo Atalho"}</h3>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background focus:ring-1 focus:ring-primary" placeholder="Ex: Açaí 10kg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background focus:ring-1 focus:ring-primary">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Valor Sugerido (opcional)</label>
                  <input type="number" step="0.01" value={suggestedAmount} onChange={e => setSuggestedAmount(e.target.value)} className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background focus:ring-1 focus:ring-primary" placeholder="0.00" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Save size={14} /> Salvar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 mt-4">
            {shortcuts.map(s => {
              const cat = categories.find(c => c.id === s.category);
              return (
                <div key={s.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-card hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><span>{cat?.icon}</span> {s.description}</p>
                    <p className="text-xs text-muted-foreground">{cat?.label} {s.suggested_amount ? ` • Sugerido: R$ ${Number(s.suggested_amount).toFixed(2)}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(s)} className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
