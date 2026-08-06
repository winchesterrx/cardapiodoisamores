import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, Camera, X, Save, ShoppingBag, Building2, Calendar, Hash, Sparkles, Check, Copy, Loader2 } from "lucide-react";
import { ExpenseShortcut } from "@/pages/AdminExpenses";

// Reusing types from AdminExpenses
interface ExpenseFormItem {
  id: string;
  date: string;
  category: string;
  description: string;
  size: string;
  amount: string;
}

interface CategoryInfo {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: string, noteRef: string, noteDate: string, validItems: ExpenseFormItem[]) => Promise<void>;
  shortcuts: ExpenseShortcut[];
  categories: CategoryInfo[];
  saving: boolean;
  onOpenShortcutManager: () => void;
}

function uid() { return Math.random().toString(36).slice(2, 9); }
function todayStr() { return new Date().toISOString().split("T")[0]; }

export default function ExpenseEntryModal({ isOpen, onClose, onSave, shortcuts, categories, saving, onOpenShortcutManager }: Props) {
  const [formItems, setFormItems] = useState<ExpenseFormItem[]>([
    { id: uid(), date: todayStr(), category: "materia-prima", description: "", size: "", amount: "" }
  ]);
  const [supplier, setSupplier] = useState("");
  const [noteRef, setNoteRef] = useState("");
  const [noteDate, setNoteDate] = useState(todayStr());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [noteDiscount, setNoteDiscount] = useState("");
  const [noteAddition, setNoteAddition] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormItems([{ id: uid(), date: todayStr(), category: "materia-prima", description: "", size: "", amount: "" }]);
      setSupplier("");
      setNoteRef("");
      setNoteDate(todayStr());
      setNoteDiscount("");
      setNoteAddition("");
      setOcrSuggestions([]);
      setOcrPreview(null);
    }
  }, [isOpen]);
  
  // OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPhase, setOcrPhase] = useState("");
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrSuggestions, setOcrSuggestions] = useState<ExpenseFormItem[]>([]);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getCategoryInfo = (id: string) => categories.find(c => c.id === id) || categories[categories.length - 1];

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

  const duplicateItem = (item: ExpenseFormItem) => {
    setFormItems(prev => [...prev, { ...item, id: uid() }]);
  };

  const addQuickItem = (item: ExpenseShortcut) => {
    setFormItems(prev => {
      const last = prev[prev.length - 1];
      if (!last.description && !last.amount) {
        return prev.slice(0, -1).concat({ id: uid(), date: noteDate, category: item.category, description: item.description, size: "", amount: item.suggested_amount || "" });
      }
      return [...prev, { id: uid(), date: noteDate, category: item.category, description: item.description, size: "", amount: item.suggested_amount || "" }];
    });
    setShowQuickAdd(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

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

  const formTotal = formItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const finalTotal = formTotal + (parseFloat(noteAddition) || 0) - (parseFloat(noteDiscount) || 0);

  const handleSubmit = async () => {
    let valid = formItems.filter(i => i.description.trim() && parseFloat(i.amount) > 0);
    if (valid.length === 0) { alert("Preencha ao menos um item com descrição e valor."); return; }
    
    if (parseFloat(noteDiscount) > 0) {
      valid.push({ id: uid(), date: noteDate, category: "outros", description: "Desconto na Nota", size: "", amount: (-parseFloat(noteDiscount)).toString() });
    }
    if (parseFloat(noteAddition) > 0) {
      valid.push({ id: uid(), date: noteDate, category: "outros", description: "Acréscimo na Nota", size: "", amount: noteAddition.toString() });
    }

    await onSave(supplier, noteRef, noteDate, valid);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-start pt-[5vh] pb-[5vh] px-2 md:px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
        
        {/* Header fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow">
              <ShoppingBag className="text-white" size={18} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground leading-tight">Incluir Nota / Despesa</h2>
              <p className="text-xs text-muted-foreground">Preencha o cabeçalho e adicione itens</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-muted/10">
          
          {/* Cabeçalho da Nota */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2"><Building2 size={16} className="text-primary" /> Dados da Nota</h3>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                  <Camera size={14} /> Ler Foto (OCR)
                </button>
                <button onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                  <Sparkles size={14} /> Usar Atalho
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Fornecedor</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Ex: Atacadão"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Data da Nota</label>
                <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Ref / Nº NF</label>
                <input value={noteRef} onChange={e => setNoteRef(e.target.value)} placeholder="Ex: NF-001"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {/* Atalhos rápidos */}
            {showQuickAdd && (
              <div className="bg-purple-500/5 border border-purple-200 dark:border-purple-900 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-top-1">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-semibold text-purple-600 uppercase">Itens Rápidos:</p>
                  <button onClick={onOpenShortcutManager} className="text-xs font-medium text-purple-600 hover:underline flex items-center gap-1">
                    <Sparkles size={12} /> Gerenciar Atalhos
                  </button>
                </div>
                {shortcuts.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhum atalho cadastrado.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {shortcuts.map((item) => {
                      const cat = getCategoryInfo(item.category);
                      return (
                        <button key={item.id} onClick={() => addQuickItem(item)}
                          className="flex items-center gap-1.5 text-xs font-medium bg-background border border-border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors">
                          <span>{cat.icon}</span> {item.description}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Itens da Nota */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
              <div className="col-span-3 text-xs font-semibold text-muted-foreground uppercase">Categoria</div>
              <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase">Descrição *</div>
              <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Tam/Qtd</div>
              <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Valor (R$) *</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-border">
              {formItems.map((item, idx) => {
                const isValid = item.description.trim() && parseFloat(item.amount) > 0;
                return (
                  <div key={item.id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${isValid ? "bg-emerald-500/5" : "hover:bg-muted/30"}`}>
                    <div className="col-span-12 md:col-span-3">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Categoria</label>
                      <select value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)}
                        className="w-full border border-border rounded-xl px-2.5 py-2 text-sm bg-background focus:ring-2 focus:ring-ring">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Descrição</label>
                      <input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)}
                        placeholder="Ex: Açaí 10kg, Copo 300ml..."
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Tamanho / Qtd</label>
                      <input value={item.size} onChange={e => updateItem(item.id, "size", e.target.value)}
                        placeholder="Ex: 5kg, 100un"
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="md:hidden text-xs text-muted-foreground block mb-1">Valor Total (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <input type="number" step="0.01" min="0" value={item.amount} onChange={e => updateItem(item.id, "amount", e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-border rounded-xl pl-8 pr-3 py-2 text-sm bg-background font-medium focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-center justify-end md:justify-center gap-1 mt-2 md:mt-0">
                      <button onClick={() => duplicateItem(item)} title="Duplicar item"
                        className="p-1.5 text-muted-foreground hover:bg-muted hover:text-primary rounded-lg transition-colors"><Copy size={16} /></button>
                      {formItems.length > 1 && (
                        <button onClick={() => removeItem(item.id)} title="Remover item"
                          className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-muted/30 p-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
              <button onClick={addEmptyItem} className="flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors w-full md:w-auto justify-center">
                <Plus size={16} /> Adicionar Novo Item
              </button>
              <div className="flex gap-4 flex-wrap justify-end">
                <div className="text-right w-full md:w-auto">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Desconto (R$)</p>
                  <input type="number" step="0.01" min="0" value={noteDiscount} onChange={e => setNoteDiscount(e.target.value)}
                    className="w-24 text-right border border-border rounded-xl px-2 py-1 text-sm bg-background focus:ring-1 focus:ring-ring" placeholder="0.00" />
                </div>
                <div className="text-right w-full md:w-auto">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Acréscimo (R$)</p>
                  <input type="number" step="0.01" min="0" value={noteAddition} onChange={e => setNoteAddition(e.target.value)}
                    className="w-24 text-right border border-border rounded-xl px-2 py-1 text-sm bg-background focus:ring-1 focus:ring-ring" placeholder="0.00" />
                </div>
                <div className="text-right w-full md:w-auto">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total da Nota</p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">R$ {finalTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixed */}
        <div className="px-6 py-4 border-t border-border bg-card flex justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity min-w-[140px] disabled:opacity-70">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Salvar Nota</>}
          </button>
        </div>

        {/* OCR MODAL ENCAPSULATED HERE */}
        {showOcrModal && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg flex items-center gap-2"><Camera size={18} className="text-primary"/> Leitura de Nota</h3>
              <button onClick={() => { setShowOcrModal(false); setOcrPreview(null); }} className="p-2 hover:bg-muted rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
              {ocrPreview && (
                <div className="md:w-1/3 flex-shrink-0 bg-muted/30 rounded-2xl overflow-hidden border border-border flex items-center justify-center min-h-[200px]">
                  <img src={ocrPreview} alt="Nota" className="max-w-full max-h-[60vh] object-contain" />
                </div>
              )}
              <div className="flex-1 space-y-4">
                {ocrLoading && (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 text-center text-muted-foreground p-10">
                    <Loader2 size={40} className="animate-spin text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Analisando Imagem...</p>
                      <p className="text-sm mt-1">{ocrPhase}</p>
                    </div>
                  </div>
                )}
                {!ocrLoading && ocrSuggestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                      <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-emerald-700 dark:text-emerald-400">Sucesso!</p>
                        <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Encontramos os valores abaixo. Revise e confirme.</p>
                      </div>
                    </div>
                    {/* List of items ... we keep it simple for now */}
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                      {ocrSuggestions.map((s, i) => (
                        <div key={i} className="flex gap-2 items-center bg-card border border-border rounded-xl p-2">
                          <input value={s.description} onChange={e => setOcrSuggestions(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="flex-1 text-sm bg-transparent outline-none border border-border p-1 rounded" />
                          R$ <input type="number" value={s.amount} onChange={e => setOcrSuggestions(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} className="w-20 text-sm bg-transparent outline-none border border-border p-1 rounded" />
                          <button onClick={() => setOcrSuggestions(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={confirmOcr} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium">Confirmar e Adicionar</button>
                      <button onClick={() => { setShowOcrModal(false); setOcrPreview(null); }} className="px-5 border border-border rounded-xl">Cancelar</button>
                    </div>
                  </div>
                )}
                {!ocrLoading && ocrSuggestions.length === 0 && ocrPreview && (
                  <div className="text-center p-10 bg-muted/20 rounded-xl border border-dashed border-border">
                    <p className="font-medium">Não foi possível detectar valores.</p>
                    <p className="text-sm text-muted-foreground mt-2">Tente uma foto mais nítida ou adicione os itens manualmente.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Add the icon that is missing
function CheckCircle2(props: any) {
  return <Check {...props} />;
}
