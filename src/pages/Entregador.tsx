import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, MapPin, Phone } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/data/menuData';

export default function Entregador() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'entregue' })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
      } else {
        alert("Erro ao marcar como entregue. Tente novamente.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'courier') {
      navigate('/login');
    }
  }, [user, navigate]);

  const [activeTab, setActiveTab] = useState<'pendentes' | 'desempenho'>('pendentes');

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['courier-orders'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders`);
      if (!res.ok) throw new Error('Erro ao buscar pedidos');
      const data = await res.json();
      return data.filter((o: any) => Number(o.courierId) === Number(user?.id));
    },
    refetchInterval: 10000,
    enabled: !!user
  });

  const pendingOrders = allOrders.filter((o: any) => String(o.status).toLowerCase() === 'despachado');
  const completedOrders = allOrders.filter((o: any) => String(o.status).toLowerCase() === 'entregue');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Calculos de Desempenho
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  // Start of Week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekTime = startOfWeek.getTime();

  // Start of Month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const ordersToday = completedOrders.filter(o => new Date(o.createdAt).getTime() >= startOfDay);
  const ordersWeek = completedOrders.filter(o => new Date(o.createdAt).getTime() >= startOfWeekTime);
  const ordersMonth = completedOrders.filter(o => new Date(o.createdAt).getTime() >= startOfMonth);

  const fee = Number(user.delivery_fee) || 0;
  const earningsToday = ordersToday.length * fee;
  const earningsWeek = ordersWeek.length * fee;
  const earningsMonth = ordersMonth.length * fee;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Painel do Entregador</h1>
          <p className="text-sm text-gray-500">Olá, {user.name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b flex px-4">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pendentes' ? 'border-primary text-primary' : 'border-transparent text-gray-500'
          }`}
        >
          Pendentes
          {pendingOrders.length > 0 && (
            <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('desempenho')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'desempenho' ? 'border-primary text-primary' : 'border-transparent text-gray-500'
          }`}
        >
          Meu Desempenho
        </button>
      </div>

      <main className="p-4 space-y-4">
        {activeTab === 'pendentes' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Entregas Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{pendingOrders.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Taxa por Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">R$ {fee.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <h2 className="font-bold text-lg mt-6 mb-2">Suas Entregas de Hoje</h2>

            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Carregando entregas...</p>
            ) : pendingOrders.length === 0 ? (
              <Card className="bg-gray-100 border-dashed">
                <CardContent className="py-8 text-center text-gray-500">
                  Nenhuma entrega pendente no momento.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order: any) => (
                  <Card key={order.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">Pedido #{order.number}</CardTitle>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          Pagar: {order.paymentMethod}
                        </span>
                      </div>
                      <p className="text-sm font-medium">Cliente: {order.customerName || 'Não informado'}</p>
                      <p className="text-sm font-bold text-green-600">Total: R$ {Number(order.total).toFixed(2)}</p>
                      {order.changeNeededFor && (
                        <div className="mt-2 text-sm font-medium bg-amber-50 p-2 rounded border border-amber-200 text-amber-800">
                          Levar troco para R$ {Number(order.changeNeededFor).toFixed(2)}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-md text-sm border flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                        <span>{order.address}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`, '_blank')}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Maps
                        </Button>
                        {order.customerWhatsApp ? (
                          <Button 
                            variant="outline" 
                            className="w-full border-green-200 text-green-700 hover:bg-green-50"
                            onClick={() => window.open(`https://wa.me/55${order.customerWhatsApp.replace(/\D/g, '')}`, '_blank')}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" disabled>
                            <Phone className="h-4 w-4 mr-2" />
                            S/ Número
                          </Button>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-bold py-6"
                        onClick={() => handleMarkAsDelivered(order.id)}
                      >
                        ✓ Marcar como Entregue
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="font-bold text-lg mb-4">Ganhos com Entregas</h2>
            
            <div className="space-y-4">
              <Card className="bg-primary text-primary-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary-foreground/80">Hoje</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold">R$ {earningsToday.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary-foreground/80">{ordersToday.length} entregas</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Esta Semana</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-foreground">R$ {earningsWeek.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ordersWeek.length} entregas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Este Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-foreground">R$ {earningsMonth.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ordersMonth.length} entregas</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Histórico Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  {completedOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma entrega finalizada ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {completedOrders.slice(0, 5).map((o: any) => (
                        <div key={o.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium">Pedido #{o.number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="font-bold text-green-600">+ R$ {fee.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
