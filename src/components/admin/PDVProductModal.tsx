import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, SelectedAddon } from "@/data/menuData";
import { Button } from "@/components/ui/button";

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, addons: SelectedAddon[], notes: string) => void;
}

export default function PDVProductModal({ product, onClose, onAdd }: Props) {
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

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
  const itemTotal = (Number(product.price) + addonTotal) * Number(quantity);

  const handleAdd = () => {
    onAdd(product, quantity, selectedAddons, notes);
    setAddonQuantities({});
    setNotes("");
    setQuantity(1);
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
            <p className="text-xl font-bold text-primary">R$ {Number(product.price).toFixed(2)}</p>

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
                Adicionar (R$ {itemTotal.toFixed(2)})
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
