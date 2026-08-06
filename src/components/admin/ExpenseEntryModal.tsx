import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Camera, X, Save, ShoppingBag, Building2, Sparkles, Check, Copy, Loader2, Info, FileText, Settings } from "lucide-react";
import { ExpenseShortcut } from "@/pages/AdminExpenses";

interface ExternalExpenseFormItem {
  id: string;
  date: string;
  category: string;
  description: string;
  size: string;
  amount: string;
}

interface RichExpenseFormItem {
  id: string;
  category: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
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
  onSave: (supplier: string, noteRef: string, noteDate: string, validItems: ExternalExpenseFormItem[]) => Promise<void>;
  shortcuts: ExpenseShortcut[];
  categories: CategoryInfo[];
  saving: boolean;
  onOpenShortcutManager: () => void;
}

const MEASURE_UNITS = [
  "Unidade", 
  "Kg", 
  "Gramas", 
  "Litros", 
  "ml", 
  "Caixa", 
  "Bisnaga", 
  "Pote", 
  "Pacote", 
  "Fardo", 
  "Lata",
  "Garrafa"
];

function uid() { return Math.random().toString(36).slice(2, 9); }
function todayStr() { return new Date().toISOString().split("T")[0]; }

function CheckCircle2(props: any) {
  return <Check {...props} />;
}

export default function ExpenseEntryModal({ isOpen, onClose, onSave, shortcuts, categories, saving, onOpenShortcutManager }: Props) {
  const [formItems, setFormItems] = useState<RichExpenseFormItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [noteRef, setNoteRef] = useState("");
  const [noteDate, setNoteDate] = useState(todayStr());
  const [noteObservation, setNoteObservation] = useState(""); // Observação da nota inteira
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [noteDiscount, setNoteDiscount] = useState("");
  const [noteAddition, setNoteAddition] = useState("");

  const resetForm = () => {
    setFormItems([{ id: uid(), category: "materia-prima", description: "", unit: "Unidade", quantity: "1", unitPrice: "", amount: "" }]);
    setSupplier("");
    setNoteRef("");
    setNoteDate(todayStr());
    setNoteObservation("");
    setNoteDiscount("");
    setNoteAddition("");
    setOcrSuggestions([]);
    setOcrPreview(null);
  };

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen]);
  
  // OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPhase, setOcrPhase] = useState("");
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrSuggestions, setOcrSuggestions] = useState<ExternalExpenseFormItem[]>([]);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getCategoryInfo = (id: string) => categories.find(c => c.id === id) || categories[categories.length - 1];

  const updateItem = (id: string, field: keyof RichExpenseFormItem, value: string) => {
    setFormItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      
      if (field === "quantity" || field === "unitPrice") {
        const q = parseFloat(updated.quantity.replace(',', '.')) || 0;
        const u = parseFloat(updated.unitPrice.replace(',', '.')) || 0;
        if (q > 0 && u > 0) {
           updated.amount = (q * u).toFixed(2).replace('.', ',');
        } else if (u === 0 || q === 0) {
           updated.amount = "";
        }
      }
      return updated;
    }));
  };

  const addEmptyItem = () => {
    const last = formItems[formItems.length - 1];
    setFormItems(prev => [...prev, {
      id: uid(), category: last?.category || "materia-prima", description: "", unit: "Unidade", quantity: "1", unitPrice: "", amount: ""
    }]);
  };

  const removeItem = (id: string) => {
    if (formItems.length === 1) return;
    setFormItems(prev => prev.filter(i => i.id !== id));
  };

  const duplicateItem = (item: RichExpenseFormItem) => {
    setFormItems(prev => [...prev, { ...item, id: uid() }]);
  };

  const addQuickItem = (item: ExpenseShortcut) => {
    setFormItems(prev => {
      const last = prev[prev.length - 1];
      const sAmount = item.suggested_amount || "";
      const newItem = { id: uid(), category: item.category, description: item.description, unit: "Unidade", quantity: "1", unitPrice: sAmount, amount: sAmount };
      
      if (!last.description && !last.amount) {
        return prev.slice(0, -1).concat(newItem);
      }
      return [...prev, newItem];
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
      const parsed: ExternalExpenseFormItem[] = [];
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
        const mappedOcr = valid.map(s => ({
          id: uid(),
          category: s.category,
          description: s.description,
          unit: "Unidade",
          quantity: "1",
          unitPrice: s.amount,
          amount: s.amount
        }));
        return [...nonEmpty, ...mappedOcr];
      });
    }
    setShowOcrModal(false);
    setOcrPreview(null);
    setOcrSuggestions([]);
  };

  const formTotal = formItems.reduce((s, i) => s + (parseFloat(i.amount.replace(',','.')) || 0), 0);
  const finalTotal = formTotal + (parseFloat(noteAddition.replace(',','.')) || 0) - (parseFloat(noteDiscount.replace(',','.')) || 0);

  const handleSubmit = async () => {
    const validInternal = formItems.filter(i => i.description.trim() && parseFloat(i.amount.replace(',','.')) > 0);
    if (validInternal.length === 0) { alert("Preencha ao menos um item com descrição e valor total."); return; }
    
    const validExternal: ExternalExpenseFormItem[] = validInternal.map(i => {
       let fullDesc = i.description.trim();
       
       const qNum = parseFloat(i.quantity.replace(',','.'));
       const hasQuantity = qNum > 0 && qNum !== 1;
       const uPrice = parseFloat(i.unitPrice.replace(',','.'));
       
       if (hasQuantity || i.unit !== "Unidade") {
          fullDesc += ` (${qNum} ${i.unit})`;
       }

       if (uPrice > 0 && hasQuantity) {
          fullDesc += ` - Val. Unit: R$ ${uPrice.toFixed(2)}`;
       }

       if (noteObservation.trim()) {
          fullDesc += ` | Obs: ${noteObservation.trim()}`;
       }

       return {
         id: i.id,
         date: noteDate,
         category: i.category,
         description: fullDesc,
         size: "", 
         amount: parseFloat(i.amount.replace(',','.')).toString()
       };
    });

    if (parseFloat(noteDiscount.replace(',','.')) > 0) {
      validExternal.push({ id: uid(), date: noteDate, category: "outros", description: "Desconto na Nota", size: "", amount: (-parseFloat(noteDiscount.replace(',','.'))).toString() });
    }
    if (parseFloat(noteAddition.replace(',','.')) > 0) {
      validExternal.push({ id: uid(), date: noteDate, category: "outros", description: "Acréscimo na Nota", size: "", amount: noteAddition.replace(',','.') });
    }

    await onSave(supplier, noteRef, noteDate, validExternal);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-start pt-[4vh] pb-[4vh] px-2 md:px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
        
        {/* Header fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl text-foreground">Lançamento de Despesa</h2>
              <p className="text-sm text-muted-foreground font-medium">Cadastre compras, custos e notas fiscais facilmente.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-950/50">
          
          {/* Cabeçalho da Nota */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2"><Building2 size={18} className="text-primary" /> Informações da Nota / Fornecedor</h3>
              <div className="flex gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                  <Camera size={16} /> Ler Foto (OCR)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Fornecedor / Loja</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Ex: Atacadão"
                  className="w-full border border-border rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-950 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Data da Compra</label>
                <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-950 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="md:col-span-5 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Documento / Nº NF / Observação da Nota</label>
                <div className="flex gap-2">
                  <input value={noteRef} onChange={e => setNoteRef(e.target.value)} placeholder="Nº NF / Doc"
                    className="w-1/3 border border-border rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-slate-950 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  <div className="relative w-2/3">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input value={noteObservation} onChange={e => setNoteObservation(e.target.value)} placeholder="Observação geral da nota..."
                      className="w-full border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-950 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Itens da Nota */}
          <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-lg text-foreground">Itens da Despesa</h3>
             </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
              
              {/* Tabela Cabeçalho Desktop - Colunas bem definidas */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-border">
                <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Categoria</div>
                <div className="col-span-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Produto / Descrição</div>
                <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Unidade Medida</div>
                <div className="col-span-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Qtd</div>
                <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Valor Unitário</div>
                <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right pr-12">Valor Total</div>
              </div>

              <div className="divide-y divide-border">
                {formItems.map((item) => {
                  const isValid = item.description.trim() && parseFloat(item.amount.replace(',','.')) > 0;
                  return (
                    <div key={item.id} className={`grid grid-cols-1 lg:grid-cols-12 gap-3 px-4 py-3 items-center transition-colors ${isValid ? "bg-emerald-500/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                      
                      {/* Categoria */}
                      <div className="col-span-1 lg:col-span-2">
                        <label className="lg:hidden text-xs font-bold text-muted-foreground uppercase mb-1 block">Categoria</label>
                        <select value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)}
                          className="w-full border border-border rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-slate-950 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                      </div>

                      {/* Descrição */}
                      <div className="col-span-1 lg:col-span-3">
                        <label className="lg:hidden text-xs font-bold text-muted-foreground uppercase mb-1 block">Produto / Descrição</label>
                        <input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)}
                          placeholder="Ex: Açaí, Polpa, Copos..."
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                        
                        {/* Atalhos Rápidos */}
                        {!item.description && shortcuts.length > 0 && (
                          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                onOpenShortcutManager();
                              }}
                              className="whitespace-nowrap flex items-center gap-1 text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-muted/80 px-2.5 py-1 rounded-full border border-border transition-colors"
                            >
                              <Settings size={10} /> Configurar
                            </button>
                            {shortcuts.map(s => (
                              <button
                                key={s.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateItem(item.id, "description", s.description);
                                  updateItem(item.id, "category", s.category);
                                  if (s.suggested_amount) {
                                    updateItem(item.id, "unitPrice", s.suggested_amount);
                                    updateItem(item.id, "amount", s.suggested_amount);
                                  }
                                }}
                                className="whitespace-nowrap text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-full border border-primary/20 transition-colors"
                              >
                                {s.description}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Medida */}
                      <div className="col-span-1 lg:col-span-2">
                         <label className="lg:hidden text-xs font-bold text-muted-foreground uppercase mb-1 block">Unidade de Medida</label>
                         <select value={item.unit} onChange={e => updateItem(item.id, "unit", e.target.value)}
                            className="w-full border border-border rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-slate-950 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                            {MEASURE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                         </select>
                      </div>

                      {/* Quantidade */}
                      <div className="col-span-1 lg:col-span-1">
                        <label className="lg:hidden text-xs font-bold text-muted-foreground uppercase mb-1 block">Qtd</label>
                        <input type="number" step="0.01" min="0" value={item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)}
                          className="w-full border border-border rounded-lg px-2 py-2 text-sm bg-white dark:bg-slate-950 text-center font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                      </div>

                      {/* Val Unitario */}
                      <div className="col-span-1 lg:col-span-2">
                        <label className="lg:hidden text-xs font-bold text-muted-foreground uppercase mb-1 block">Valor Unitário</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <input type="text" value={item.unitPrice} onChange={e => updateItem(item.id, "unitPrice", e.target.value)}
                            placeholder="0,00"
                            className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-950 text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                        </div>
                      </div>

                      {/* Val Total & Actions */}
                      <div className="col-span-1 lg:col-span-2 flex items-center gap-2">
                         <div className="flex-1">
                           <label className="lg:hidden text-xs font-bold text-muted-foreground uppercase mb-1 block">Valor Total</label>
                           <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-600 dark:text-emerald-400 text-sm">R$</span>
                             <input type="text" value={item.amount} onChange={e => updateItem(item.id, "amount", e.target.value)}
                               placeholder="0,00"
                               className="w-full border border-emerald-500/50 rounded-lg pl-8 pr-3 py-2 text-sm bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-400 text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" />
                           </div>
                         </div>
                         <div className="flex items-center gap-1">
                            <button onClick={() => duplicateItem(item)} title="Duplicar Linha"
                               className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"><Copy size={16} /></button>
                            {formItems.length > 1 && (
                              <button onClick={() => removeItem(item.id)} title="Remover Linha"
                                className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={16} /></button>
                            )}
                         </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-border">
                <button onClick={addEmptyItem} className="flex items-center gap-2 text-sm font-semibold bg-white dark:bg-slate-900 border border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground px-5 py-2.5 rounded-lg transition-colors">
                  <Plus size={16} /> Nova Linha de Produto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixed: Resumo Financeiro */}
        <div className="px-6 py-4 border-t border-border bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
          
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                <span className="text-base font-bold text-foreground">R$ {formTotal.toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="w-px h-8 bg-border hidden md:block"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Desconto (-)</span>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input type="text" value={noteDiscount} onChange={e => setNoteDiscount(e.target.value)} placeholder="0,00"
                      className="w-20 text-base font-bold bg-transparent text-foreground pl-6 outline-none border-b border-dashed border-border focus:border-primary transition-colors" />
                </div>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Acréscimo (+)</span>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input type="text" value={noteAddition} onChange={e => setNoteAddition(e.target.value)} placeholder="0,00"
                      className="w-20 text-base font-bold bg-transparent text-foreground pl-6 outline-none border-b border-dashed border-border focus:border-primary transition-colors" />
                </div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="text-right">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-0.5">Total a Pagar</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
             </div>

             <div className="flex gap-2">
               <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border font-semibold text-foreground hover:bg-muted transition-colors">
                 Cancelar
               </button>
               <button onClick={handleSubmit} disabled={saving}
                 className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-70">
                 {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Salvar Nota</>}
               </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
