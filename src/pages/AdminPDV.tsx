import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProducts } from '@/data/menuData';

export default function AdminPDV() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);

  const addToCart = (product: any) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1, addons: [], notes: '' }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const orderData = {
      items: cart.map(item => ({
        productId: item.id,
        productName: item.name,
        productPrice: item.price,
        quantity: item.quantity,
        addons: [],
        notes: ''
      })),
      total,
      status: 'pronto',
      customerName: 'Balcão',
      customerWhatsApp: '',
      consumeType: 'Balcão',
      paymentMethod: 'Dinheiro',
      deliveryFee: 0,
      discountAmount: discount,
      origin: 'balcao'
    };

    try {
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (response.ok) {
        alert('Pedido de balcão registrado!');
        setCart([]);
        setDiscount(0);
      } else {
        alert('Erro ao registrar pedido');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Catálogo (Frente de Caixa)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(p)}>
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
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus size={12} />
                      </Button>
                      <span>{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t space-y-2">
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
                      className="w-20 p-1 border rounded text-right"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" onClick={handleCheckout}>Finalizar Venda (Balcão)</Button>
                <Button variant="outline" className="w-full mt-2" onClick={() => setCart([])}>Cancelar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
