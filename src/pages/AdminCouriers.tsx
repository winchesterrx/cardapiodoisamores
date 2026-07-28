import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminCouriers() {
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');

  const { data: couriers = [], refetch } = useQuery({
    queryKey: ['admin-couriers'],
    queryFn: async () => {
      try {
        const res = await fetch('http://localhost:3000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro');
        const all = await res.json();
        return all.filter((u: any) => u.role === 'courier');
      } catch (e) {
        // Fallback
        const local = JSON.parse(localStorage.getItem('digitalmenu_users_v1') || '[]');
        return local.filter((u: any) => u.role === 'courier');
      }
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPassword('');
    setDeliveryFee('');
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      phone,
      password: password || undefined,
      role: 'courier',
      delivery_fee: parseFloat(deliveryFee) || 0
    };
    
    try {
      let ok = false;
      try {
        if (editingId) {
          const res = await fetch(`http://localhost:3000/api/users/${editingId}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          ok = res.ok;
        } else {
          const res = await fetch('http://localhost:3000/api/users', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          ok = res.ok;
        }
        if (!ok) throw new Error('API failed');
      } catch (e) {
        // Fallback
        let local = JSON.parse(localStorage.getItem('digitalmenu_users_v1') || '[]');
        if (editingId) {
          local = local.map((u: any) => String(u.id) === String(editingId) ? { ...u, ...payload, password: payload.password || u.password } : u);
        } else {
          local.push({ ...payload, id: Date.now() });
        }
        localStorage.setItem('digitalmenu_users_v1', JSON.stringify(local));
      }

      refetch();
      resetForm();
    } catch (err) {
      alert('Erro ao salvar entregador');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      try {
        const res = await fetch(`http://localhost:3000/api/users/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('API failed');
      } catch (e) {
        // Fallback
        let local = JSON.parse(localStorage.getItem('digitalmenu_users_v1') || '[]');
        local = local.filter((u: any) => String(u.id) !== String(id));
        localStorage.setItem('digitalmenu_users_v1', JSON.stringify(local));
      }
      refetch();
    }
  };

  const openEdit = (courier: any) => {
    setEditingId(courier.id);
    setName(courier.name);
    setPhone(courier.phone);
    setPassword('');
    setDeliveryFee(courier.delivery_fee?.toString() || '0');
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display text-foreground">Gerenciar Entregadores</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1">
          <Plus size={16} /> Novo
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-card rounded-xl shadow-card p-5 mb-4 space-y-3">
          <h3 className="font-semibold text-foreground">{editingId ? 'Editar' : 'Novo'} Entregador</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Telefone (Login)</Label>
              <Input required value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{editingId ? 'Nova Senha (opcional)' : 'Senha'}</Label>
              <Input type="password" required={!editingId} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Taxa Fixa (R$)</Label>
              <Input type="number" step="0.01" required value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">Salvar</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {couriers.map((courier: any) => (
          <div key={courier.id} className="bg-card rounded-lg shadow-card p-4 flex items-center gap-3">
            <div className="flex-1">
              <h4 className="font-semibold">{courier.name}</h4>
              <p className="text-sm text-muted-foreground">Tel: {courier.phone} | Taxa: R$ {Number(courier.delivery_fee).toFixed(2)}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(courier)}><Pencil size={16} /></Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(courier.id)}><Trash2 size={16} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
