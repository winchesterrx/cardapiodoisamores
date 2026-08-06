import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProducts, fetchStoreSettings, API_URL, StoreSettings } from '@/data/menuData';
import PDVProductModal from '@/components/admin/PDVProductModal';
import PDVCheckoutModal from '@/components/admin/PDVCheckoutModal';
import type { Product, SelectedAddon } from '@/data/menuData';

export default function AdminPDV() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings);
  }, []);

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
      status: 'recebido',
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
    </div>
  );
}
