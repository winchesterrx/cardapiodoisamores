import { useState, useEffect } from "react";
import { X, Trash2, Plus, Minus, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Order, Product, Addon } from "@/data/menuData";
import { Pencil } from "lucide-react";
import PDVProductModal from "./PDVProductModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, data: any) => Promise<void>;
  order: Order | null;
  products: Product[];
}

export default function EditOrderModal({ isOpen, onClose, onSave, order, products }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [modalConfig, setModalConfig] = useState<{
    product: Product;
    isEditing: boolean;
    initialQty: number;
    initialAddons: Record<string, number>;
    initialNotes: string;
    itemIdx?: number;
  } | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setItems(order.items.map((i: any) => ({
        ...i,
        id: Math.random().toString(), 
        addons: i.addons ? i.addons.map((a: any) => ({ ...a })) : []
      })));
      setDeliveryFee(order.deliveryFee || 0);
      setDiscountAmount(order.discountAmount || 0);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const totalItems = items.reduce((sum, item) => {
    const itemAddonsTotal = item.addons.reduce((asum: number, a: any) => asum + (Number(a.price) * Number(a.quantity)), 0);
    return sum + ((Number(item.productPrice) + itemAddonsTotal) * Number(item.quantity));
  }, 0);
  
  const finalTotal = totalItems + Number(deliveryFee) - Number(discountAmount);

  const handleSave = async () => {
    if (items.length === 0) {
      alert("O pedido deve ter pelo menos um item.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(order.id, {
        total: finalTotal,
        items,
        deliveryFee,
        discountAmount,
        status: order.status
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItemQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity += delta;
    if (newItems[index].quantity <= 0) {
      newItems.splice(index, 1);
    }
    setItems(newItems);
  };

  const handleAddProductClick = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (prod) {
      if (prod.addons && prod.addons.length > 0) {
        setModalConfig({
          product: prod,
          isEditing: false,
          initialQty: 1,
          initialAddons: {},
          initialNotes: ""
        });
      } else {
        setItems([...items, {
          id: Math.random().toString(),
          productId: prod.id,
          productName: prod.name,
          productPrice: prod.price,
          quantity: 1,
          addons: [],
          notes: ""
        }]);
        setShowAddProduct(false);
        setSelectedProductId("");
      }
    }
  };

  const handleEditItem = (idx: number) => {
    const item = items[idx];
    let prod = products.find(p => p.id === item.productId || p.name === item.productName);
    if (!prod) {
      prod = {
        id: item.productId || item.id,
        name: item.productName,
        price: item.productPrice,
        description: "",
        category: "",
        addons: item.addons.map((a: any) => ({
          id: a.name,
          name: a.name,
          price: a.price
        }))
      } as Product;
    }
    
    const initialAddons: Record<string, number> = {};
    if (item.addons) {
      item.addons.forEach((a: any) => {
        const addonInProd = prod?.addons?.find(pa => pa.name === a.name);
        if (addonInProd) {
          initialAddons[addonInProd.id] = a.quantity || 1;
        } else {
          initialAddons[a.name] = a.quantity || 1;
        }
      });
    }

    setModalConfig({
      product: prod,
      isEditing: true,
      initialQty: item.quantity,
      initialAddons,
      initialNotes: item.notes || "",
      itemIdx: idx
    });
  };

  const handleModalAdd = (prod: Product, qty: number, addons: any[], notes: string) => {
    if (modalConfig?.isEditing && modalConfig.itemIdx !== undefined) {
      const newItems = [...items];
      newItems[modalConfig.itemIdx] = {
        ...newItems[modalConfig.itemIdx],
        quantity: qty,
        addons: addons.map(a => ({
          name: a.addon.name,
          price: a.addon.price,
          quantity: a.quantity
        })),
        notes: notes
      };
      setItems(newItems);
    } else {
      setItems([...items, {
        id: Math.random().toString(),
        productId: prod.id,
        productName: prod.name,
        productPrice: prod.price,
        quantity: qty,
        addons: addons.map(a => ({
          name: a.addon.name,
          price: a.addon.price,
          quantity: a.quantity
        })),
        notes: notes
      }]);
      setShowAddProduct(false);
      setSelectedProductId("");
    }
    setModalConfig(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-card">
              <h2 className="font-bold text-lg">Editar Pedido #{order.number}</h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Itens do Pedido</h3>
                  <button onClick={() => setShowAddProduct(!showAddProduct)} className="text-primary text-sm font-medium flex items-center gap-1">
                    <Plus size={16} /> Adicionar Produto
                  </button>
                </div>
                
                {showAddProduct && (
                  <div className="flex gap-2 bg-muted/30 p-3 rounded-xl border border-border">
                    <select 
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                    >
                      <option value="">Selecione um produto</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                      ))}
                    </select>
                    <button onClick={handleAddProductClick} className="bg-primary text-primary-foreground px-4 rounded-lg font-medium">Adicionar</button>
                  </div>
                )}

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const itemAddonsTotal = item.addons.reduce((s: number, a: any) => s + (Number(a.price) * Number(a.quantity)), 0);
                    const itemTotal = (Number(item.productPrice) + itemAddonsTotal) * item.quantity;
                    return (
                      <div key={item.id} className="flex flex-col border border-border rounded-xl p-3 bg-card gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-primary font-bold">R$ {itemTotal.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateItemQuantity(idx, -1)} className="p-1 border border-border rounded hover:bg-muted"><Minus size={14} /></button>
                            <span className="w-6 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => updateItemQuantity(idx, 1)} className="p-1 border border-border rounded hover:bg-muted"><Plus size={14} /></button>
                            <button onClick={() => handleEditItem(idx)} className="p-1 border border-border rounded hover:bg-muted text-primary"><Pencil size={14} /></button>
                            <button onClick={() => {
                              const newItems = [...items];
                              newItems.splice(idx, 1);
                              setItems(newItems);
                            }} className="p-1 text-destructive hover:bg-destructive/10 rounded ml-2"><Trash2 size={16}/></button>
                          </div>
                        </div>
                        {item.addons.length > 0 && (
                          <div className="text-xs text-muted-foreground ml-2">
                            + {item.addons.map((a: any) => `${a.quantity}x ${a.name}`).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item no pedido.</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Frete (R$)</label>
                  <input type="number" step="0.01" min="0" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Desconto (R$)</label>
                  <input type="number" step="0.01" min="0" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/20 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Total do Pedido</span>
                <span className="text-2xl font-bold text-primary">R$ {finalTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? "Salvando..." : <><CheckCircle2 size={20} /> Salvar Alterações</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    
    {modalConfig && (
      <PDVProductModal 
        product={modalConfig.product}
        isEditing={modalConfig.isEditing}
        initialQuantity={modalConfig.initialQty}
        initialAddonQuantities={modalConfig.initialAddons}
        initialNotes={modalConfig.initialNotes}
        onClose={() => setModalConfig(null)}
        onAdd={handleModalAdd}
      />
    )}
    </>
  );
}
