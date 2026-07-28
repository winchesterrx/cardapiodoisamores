import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, Plus, Trash2, Edit2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { fetchCoupons, saveCoupon, deleteCoupon, Coupon } from '@/data/menuData';

export default function AdminCoupons() {
  const { data: coupons = [], refetch, isLoading } = useQuery({ queryKey: ['coupons'], queryFn: fetchCoupons });
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  const [code, setCode] = useState('');
  const [type, setType] = useState<'fixed' | 'percentage' | 'free_shipping'>('fixed');
  const [value, setValue] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setCode('');
    setType('fixed');
    setValue('');
    setIsActive(true);
    setEditingCoupon(null);
    setShowForm(false);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value.toString());
    setIsActive(Boolean(coupon.is_active));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!code) return alert('Código é obrigatório');
    
    try {
      await saveCoupon({
        id: editingCoupon?.id,
        code,
        type,
        value: parseFloat(value) || 0,
        is_active: isActive
      });
      await refetch();
      resetForm();
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar cupom');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este cupom?')) {
      await deleteCoupon(id);
      await refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-display text-foreground">Gerenciar Cupons</h2>
          <p className="text-sm text-muted-foreground">Crie e gerencie cupons de desconto para os clientes.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1">
          <Plus size={16} /> Novo Cupom
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl shadow-card p-5 mb-4 space-y-4">
          <h3 className="font-semibold text-foreground">{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Código</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex: BEMVINDO10"
                className="w-full border border-border rounded-lg p-2.5 text-sm bg-background uppercase" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de Desconto</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}
                className="w-full border border-border rounded-lg p-2.5 text-sm bg-background">
                <option value="fixed">Valor Fixo (R$)</option>
                <option value="percentage">Porcentagem (%)</option>
                <option value="free_shipping">Frete Grátis</option>
              </select>
            </div>
          </div>

          {type !== 'free_shipping' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor {type === 'percentage' ? '(%)' : '(R$)'}</label>
              <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00"
                className="w-full border border-border rounded-lg p-2.5 text-sm bg-background" />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary" />
            Cupom Ativo
          </label>

          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">Salvar</button>
            <button onClick={resetForm} className="bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium">Cancelar</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-lg font-bold text-primary">{coupon.code}</span>
                  {coupon.is_active ? (
                    <span className="flex items-center text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full"><CheckCircle size={10} className="mr-1"/> Ativo</span>
                  ) : (
                    <span className="flex items-center text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full"><XCircle size={10} className="mr-1"/> Inativo</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {coupon.type === 'fixed' && `Desconto de R$ ${Number(coupon.value).toFixed(2)}`}
                  {coupon.type === 'percentage' && `Desconto de ${Number(coupon.value)}%`}
                  {coupon.type === 'free_shipping' && `Frete Grátis`}
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Tag size={12} />
                    Usado {coupon.usage_count || 0} vez(es)
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button onClick={() => openEdit(coupon)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(coupon.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && !showForm && (
            <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
              Nenhum cupom cadastrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
