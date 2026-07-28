import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { API_URL } from '@/data/menuData';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data: any = null;
      let ok = false;
      
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        
        if (response.ok) {
          data = await response.json();
          ok = true;
        } else {
          // If backend returns 500 (e.g. DB down), throw to trigger fallback
          throw new Error('Backend failed');
        }
      } catch (e) {
        // Fallback to local storage / hardcoded if backend is off or returns 500
        if (phone === 'admin' && password === '123') {
          data = { 
            token: 'mock-admin-token', 
            user: { id: 1, name: 'Admin', role: 'admin', phone: 'admin', delivery_fee: 0 } 
          };
          ok = true;
        } else {
          // Check local couriers
          const localUsers = JSON.parse(localStorage.getItem('digitalmenu_users_v1') || '[]');
          const cleanPhone = phone.trim();
          const user = localUsers.find((u: any) => 
            String(u.phone).trim() === cleanPhone
          );
          if (user) {
            data = { token: 'mock-courier-token', user };
            ok = true;
          }
          console.error("Local Users Array:", localUsers); // Para debug se falhar
        }
      }

      if (!ok) {
        throw new Error(data?.error || 'Credenciais inválidas ou erro no login');
      }

      login(data.token, data.user);
      
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/entregador');
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Acesso ao Sistema</CardTitle>
          <CardDescription>
            Insira suas credenciais para acessar o painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (Usuário)</Label>
              <Input
                id="phone"
                type="text"
                placeholder="Ex: admin ou 11999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
