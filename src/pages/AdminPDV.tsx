import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, ShoppingCart, Trash2, Receipt, History, RefreshCw, Eye, Pencil, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProducts, fetchStoreSettings, API_URL, StoreSettings } from '@/data/menuData';
import { useAuth } from '@/contexts/AuthContext';
import PDVProductModal from '@/components/admin/PDVProductModal';
import PDVCheckoutModal from '@/components/admin/PDVCheckoutModal';
import EditOrderModal from '@/components/admin/EditOrderModal';
import type { Product, SelectedAddon, Order } from '@/data/menuData';

export default function AdminPDV() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const [activeTab, setActiveTab] = useState<'pdv' | 'history'>('pdv');
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { token } = useAuth();
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingOrderForModal, setEditingOrderForModal] = useState<Order | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [isBulkUpdatingHistory, setIsBulkUpdatingHistory] = useState(false);

  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings);
  }, []);

  const handleDeleteHistoryOrder = async (orderId: string) => {
    if (!token) return;
    if (!window.confirm("Deseja realmente excluir este lançamento do histórico?")) return;
    
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryOrders(historyOrders.filter(o => o.id !== orderId));
      } else {
        alert("Erro ao excluir o pedido.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao excluir.");
    }
  };

  const handleSaveOrderEdit = async (orderId: string, data: any) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchHistory();
      } else {
        alert("Erro ao salvar edição do pedido");
      }
    } catch (e) {
      alert("Erro de conexão ao editar");
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filtra apenas os finalizados ou de origem PDV, ou todos.
        // Vamos mostrar os do PDV ou todos que estão concluídos para ter um histórico geral de saídas.
        setHistoryOrders(data.filter((o: any) => o.origin === 'pdv' || o.status === 'entregue'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHistoryBulkUpdate = async () => {
    const ordersToUpdate = filteredHistoryOrders.filter(o => o.status !== "cancelado" && o.status !== "entregue");
    if (ordersToUpdate.length === 0) {
      alert("Nenhum pedido válido para marcar como entregue nesta visualização.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja marcar ${ordersToUpdate.length} pedido(s) filtrado(s) como 'Entregue'?\n\n(Pedidos cancelados ou já entregues serão ignorados).`)) return;

    setIsBulkUpdatingHistory(true);
    try {
      await Promise.all(ordersToUpdate.map(o => fetch(`${API_URL}/orders/${o.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: "entregue" })
      })));
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar pedidos no histórico.");
    } finally {
      setIsBulkUpdatingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const filteredHistoryOrders = historyOrders.filter((o) => {
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const matchName = o.customerName?.toLowerCase().includes(q);
      const matchPhone = o.customerWhatsApp?.includes(q);
      const matchId = o.id?.toString().includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  const openProductModal = (product: Product) => {
    if (product.addons && product.addons.length > 0) {
      setSelectedProduct(product);
    } else {
      handleAddProduct(product, 1, [], '');
    }
  };

  const handleAddProduct = (product: Product, quantity: number, addons: SelectedAddon[], notes: string) => {
    const newItemId = Date.now().toString(); // Use unique ID to allow multiple instances of same product with different addons
    
    setCart([...cart, {
      cartItemId: newItemId,
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      addons,
      notes
    }]);
    
    setSelectedProduct(null);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(cart.map(i => {
      if (i.cartItemId === cartItemId) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(cart.filter(i => i.cartItemId !== cartItemId));
  };

  const subtotal = cart.reduce((sum, item) => {
    const addonsTotal = item.addons.reduce((s: number, a: SelectedAddon) => s + (Number(a.addon.price) * a.quantity), 0);
    return sum + ((Number(item.price) + addonsTotal) * item.quantity);
  }, 0);
  
  const total = Math.max(0, subtotal - discount);

  const handleConfirmOrder = async (checkoutData: any) => {
    if (cart.length === 0) return;
    
    const orderData = {
      items: cart.map(item => ({
        productId: item.id,
        productName: item.name,
        productPrice: item.price,
        quantity: item.quantity,
        addons: item.addons.map((sa: SelectedAddon) => ({
          name: sa.addon.name,
          price: sa.addon.price,
          quantity: sa.quantity
        })),
        notes: item.notes
      })),
      total: total + (checkoutData.deliveryFee || 0),
      status: checkoutData.status || 'recebido',
      courierId: checkoutData.driverId || undefined,
      customerName: checkoutData.customerName,
      customerWhatsApp: checkoutData.customerWhatsApp,
      consumeType: checkoutData.consumeType.toLowerCase(),
      paymentMethod: checkoutData.paymentMethod,
      address: checkoutData.address,
      deliveryFee: checkoutData.deliveryFee,
      discountAmount: checkoutData.discountAmount,
      origin: 'pdv',
      customDate: checkoutData.customDate
    };

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (response.ok) {
        alert('Pedido registrado com sucesso no sistema!');
        setCart([]);
        setDiscount(0);
        setIsCheckoutOpen(false);
      } else {
        alert('Erro ao registrar pedido');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('pdv')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'pdv'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Receipt size={16} /> Lançar PDV
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <History size={16} /> Histórico de Saídas
        </button>
      </div>

      {activeTab === 'pdv' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold">Catálogo (Frente de Caixa)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openProductModal(p)}>
                  <div className="aspect-square bg-muted">
                    {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                    <p className="text-primary font-bold">R$ {p.price.toFixed(2)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
        <Card className="sticky top-4">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart size={20} /> Carrinho PDV
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Carrinho vazio</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => {
                  const addonsTotal = item.addons.reduce((s: number, a: SelectedAddon) => s + (Number(a.addon.price) * a.quantity), 0);
                  const itemTotal = (Number(item.price) + addonsTotal) * item.quantity;
                  
                  return (
                    <div key={item.cartItemId} className="flex flex-col text-sm border-b pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground font-bold">R$ {itemTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, -1)}>
                            <Minus size={12} />
                          </Button>
                          <span className="w-4 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cartItemId, 1)}>
                            <Plus size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCartItem(item.cartItemId)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      
                      {item.addons.length > 0 && (
                        <div className="mt-1 pl-2 border-l-2 border-muted">
                          {item.addons.map((a: SelectedAddon, idx: number) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              + {a.quantity}x {a.addon.name} (R$ {(Number(a.addon.price) * a.quantity).toFixed(2)})
                            </p>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="mt-1 text-xs text-orange-600 bg-orange-50 p-1 rounded">
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
                
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Desconto (R$):</span>
                    <input 
                      type="number" 
                      value={discount} 
                      onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} 
                      className="w-20 p-1 border rounded text-right bg-background focus:ring-primary"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button className="w-full mt-4" onClick={() => setIsCheckoutOpen(true)}>Avançar</Button>
                <Button variant="outline" className="w-full mt-2" onClick={() => setCart([])}>Cancelar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Histórico de Saídas do PDV</h2>
            <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loadingHistory}>
              <RefreshCw size={16} className={`mr-2 ${loadingHistory ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-2">
             <input 
               type="text" 
               placeholder="Buscar por nome, telefone ou endereço..." 
               value={historySearchQuery}
               onChange={e => setHistorySearchQuery(e.target.value)}
               className="flex-1 px-4 py-2 text-sm rounded-xl border border-border bg-card focus:ring-primary focus:border-primary outline-none transition-all"
             />
             <Button 
               onClick={handleHistoryBulkUpdate}
               disabled={isBulkUpdatingHistory}
               className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
             >
               Marcar visíveis como Entregue
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistoryOrders.length === 0 ? (
              <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                Nenhum pedido encontrado no histórico.
              </div>
            ) : (
              filteredHistoryOrders.map((order) => {
                // Montar string resumida dos itens
                const itemsSummary = order.items && Array.isArray(order.items) 
                  ? order.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ')
                  : 'Itens não detalhados';

                return (
                  <Card key={order.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 flex flex-col h-full">
                      {/* Topo: ID, Data e Status */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-bold text-primary text-base">#{order.number || order.id.slice(0,4)}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data Indisponível'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            order.status === 'entregue' ? 'bg-emerald-500/10 text-emerald-600' :
                            order.status === 'despachado' ? 'bg-blue-500/10 text-blue-600' :
                            'bg-amber-500/10 text-amber-600'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Corpo: Resumo dos itens */}
                      <p className="text-sm text-foreground mb-4 line-clamp-2 flex-1">
                        {itemsSummary}
                      </p>

                      {/* Rodapé: Valor, Cliente e Ações */}
                      <div className="flex justify-between items-end mt-auto pt-3 border-t border-border">
                        <span className="font-bold text-primary text-lg">
                          R$ {Number(order.total).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="text-sm">👤</span>
                              {order.customerName || 'Balcão'}
                            </span>
                            {order.customerWhatsApp && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-80">
                                📱 {order.customerWhatsApp}
                              </span>
                            )}
                          </div>
                          <div className="flex -mr-1 items-center gap-1">
                            {order.customerWhatsApp && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-green-600 hover:bg-green-600/10"
                                onClick={() => window.open(`https://wa.me/55${String(order.customerWhatsApp).replace(/\D/g, '')}`, '_blank')}
                                title="Falar no WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:bg-muted"
                              onClick={() => setEditingOrderForModal(order)}
                              title="Editar Lançamento"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteHistoryOrder(order.id)}
                              title="Excluir Lançamento"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'pdv' && (
        <>
          <PDVProductModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)}
            onAdd={handleAddProduct}
          />

          <PDVCheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onConfirm={handleConfirmOrder}
            total={total}
            discount={discount}
            storeSettings={storeSettings}
          />
        </>
      )}

      <EditOrderModal
        isOpen={editingOrderForModal !== null}
        onClose={() => setEditingOrderForModal(null)}
        order={editingOrderForModal}
        products={products}
        onSave={handleSaveOrderEdit}
      />
    </div>
  );
}
