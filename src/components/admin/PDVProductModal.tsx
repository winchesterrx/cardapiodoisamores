import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, SelectedAddon } from "@/data/menuData";
import { Button } from "@/components/ui/button";

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, addons: SelectedAddon[], notes: string) => void;
  initialQuantity?: number;
  initialAddonQuantities?: Record<string, number>;
  initialNotes?: string;
  isEditing?: boolean;
}

export default function PDVProductModal({ 
  product, 
  onClose, 
  onAdd,
  initialQuantity = 1,
  initialAddonQuantities = {},
  initialNotes = "",
  isEditing = false
}: Props) {
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>(initialAddonQuantities);
  const [notes, setNotes] = useState(initialNotes);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedComboSizeIdx, setSelectedComboSizeIdx] = useState<number>(0);

  const safeParse = (data: any) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
  };

  const comboSizes = product?.comboSizes ? safeParse(product.comboSizes) : [];

  if (!product) return null;

  const availableAddons = product.addons || [];

  const setAddonQty = (addonId: string, qty: number) => {
    setAddonQuantities((prev) => {
      if (qty <= 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addonId]: qty };
    });
  };

  const selectedAddons: SelectedAddon[] = availableAddons
    .filter((a) => (addonQuantities[a.id] || 0) > 0)
    .map((a) => ({ addon: a, quantity: addonQuantities[a.id] }));

  const addonTotal = selectedAddons.reduce((s, sa) => s + Number(sa.addon.price) * Number(sa.quantity), 0);
  
  const basePrice = (product?.isCombo || comboSizes.length > 0) && comboSizes.length > 0
    ? Number(comboSizes[selectedComboSizeIdx]?.price) || 0
    : Number(product?.price) || 0;
    
  const itemTotal = (basePrice + addonTotal) * Number(quantity);

  const handleAdd = () => {
    const productToAdd = { ...product };
    if ((product.isCombo || comboSizes.length > 0) && comboSizes.length > 0) {
       const selectedSize = comboSizes[selectedComboSizeIdx];
       if (selectedSize) {
         productToAdd.name = `${product.name} (${selectedSize.name})`;
         productToAdd.price = selectedSize.price;
       }
    }

    onAdd(productToAdd as Product, quantity, selectedAddons, notes);
    setAddonQuantities({});
    setNotes("");
    setQuantity(1);
    setSelectedComboSizeIdx(0);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="pdv-product-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex justify-center items-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="pdv-product-modal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-bold text-lg">{product.name}</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <p className="text-muted-foreground text-sm">{product.description}</p>
            <p className="text-xl font-bold text-primary">
              {comboSizes.length > 0 ? (
                `A partir de R$ ${Math.min(...comboSizes.map((s: any) => Number(s.price) || 0)).toFixed(2)}`
              ) : (
                `R$ ${Number(product.price).toFixed(2)}`
              )}
            </p>

            {comboSizes.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Tamanho</h3>
                <div className="grid grid-cols-3 gap-2">
                  {comboSizes.map((size: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedComboSizeIdx(idx)}
                      className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center text-center ${
                        selectedComboSizeIdx === idx ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium text-sm">{isNaN(Number(size.name)) ? size.name : `${size.name}ml`}</span>
                      <span className="text-[10px]">R$ {Number(size.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableAddons.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Adicionais</h3>
                <div className="space-y-3">
                  {availableAddons.map((addon) => {
                    const qty = addonQuantities[addon.id] || 0;
                    return (
                      <div key={addon.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{addon.name}</p>
                          <p className="text-sm text-primary">+ R$ {Number(addon.price).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            disabled={qty === 0}
                            onClick={() => setAddonQty(addon.id, qty - 1)}
                            className="w-8 h-8 rounded-full border border-primary text-primary flex items-center justify-center disabled:opacity-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-4 text-center font-medium">{qty}</span>
                          <button
                            onClick={() => setAddonQty(addon.id, qty + 1)}
                            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold border-b pb-2">Observações</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Tirar cebola, ponto da carne..."
                className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-background resize-none focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-background border rounded-lg overflow-hidden h-12">
                <button
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                  className="px-4 h-full flex items-center justify-center hover:bg-muted disabled:opacity-50"
                >
                  <Minus size={18} />
                </button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 h-full flex items-center justify-center hover:bg-muted"
                >
                  <Plus size={18} />
                </button>
              </div>
              <Button onClick={handleAdd} className="flex-1 h-12 text-lg">
                {isEditing ? `Salvar (R$ ${itemTotal.toFixed(2)})` : `Adicionar (R$ ${itemTotal.toFixed(2)})`}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
