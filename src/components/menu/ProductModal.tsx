import { useState } from "react";
import { X, Minus, Plus, ChevronLeft, ChevronRight, Package, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, SelectedAddon } from "@/data/menuData";
import { getAddonsForCategory } from "@/data/menuData";
import { useCart } from "@/contexts/CartContext";
import PromoTimer from "./PromoTimer";

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const { addItem } = useCart();
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  if (!product) return null;

  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);

  const availableAddons = getAddonsForCategory(product.category);

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
    for (let i = 0; i < quantity; i++) {
      addItem(product, selectedAddons, notes);
    }
    setAddonQuantities({});
    setNotes("");
    setQuantity(1);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pb-[72px] sm:pb-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card w-full sm:w-auto sm:min-w-[500px] sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[calc(100dvh-4.75rem)] sm:max-h-[85vh] flex flex-col overscroll-contain shadow-2xl overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            <div className="relative h-56 sm:h-64 bg-muted overflow-hidden rounded-t-3xl">
              {/* Mobile grab handle floating over image */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 sm:hidden">
                <div className="w-12 h-1.5 rounded-full bg-black/20 backdrop-blur-md" />
              </div>

              {images.length > 0 ? (
                <div className="w-full h-full relative group">
                  <img src={images[currentImageIdx]} alt={product.name} className="w-full h-full object-cover transition-opacity duration-300" />
                  
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1)); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1)); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(idx); }}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentImageIdx ? "bg-white scale-125" : "bg-white/50 hover:bg-white/75"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
              )}
              <button onClick={onClose} className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-full p-2 shadow-card">
                <X size={18} />
              </button>
              {product.isPromo && !product.isMadeToOrder && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shadow-md">
                    Promoção
                  </span>
                  {product.promoExpiry && (
                    <div className="shadow-md rounded-full overflow-hidden">
                      <PromoTimer expiry={product.promoExpiry} />
                    </div>
                  )}
                </div>
              )}
              {product.isMadeToOrder && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shadow-md">
                    Sob Encomenda
                  </span>
                </div>
              )}
            </div>

            <div className="p-4">
              <h2 className="text-xl font-display text-foreground">{product.name}</h2>
              <p className="text-muted-foreground text-xs mt-0.5 mb-1">{product.description}</p>
              
              {product.isPromo && product.promoStock !== undefined && product.promoStock !== null && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500 mb-2">
                  <Package size={12} /> Apenas {product.promoStock} unidades disponíveis!
                </div>
              )}

              <div className="mt-1.5 flex items-baseline gap-2">
                {product.isPromo && product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    R$ {Number(product.originalPrice).toFixed(2)}
                  </span>
                )}
                <span className="text-primary font-bold text-lg">
                  R$ {Number(product.price).toFixed(2)}
                </span>
              </div>

              {!product.isMadeToOrder ? (
                <>
                  {availableAddons.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-foreground text-sm mb-2">Adicionais</h3>
                  <div className="space-y-1.5">
                    {availableAddons.map((addon) => {
                      const qty = addonQuantities[addon.id] || 0;
                      return (
                        <div
                          key={addon.id}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            qty > 0 ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-foreground">{addon.name}</span>
                            <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded-full">
                              + R$ {Number(addon.price).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {qty > 0 && (
                              <button
                                onClick={() => setAddonQty(addon.id, qty - 1)}
                                className="bg-muted rounded-full p-1.5 active:bg-muted/70"
                              >
                                <Minus size={12} />
                              </button>
                            )}
                            {qty > 0 && (
                              <span className="text-sm font-bold w-5 text-center text-foreground">{qty}</span>
                            )}
                            <button
                              onClick={() => setAddonQty(addon.id, qty + 1)}
                              className="bg-primary text-primary-foreground rounded-full p-1.5 active:opacity-80"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">Observações</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tirar cebola, ponto da carne..."
                  className="w-full border border-border rounded-xl p-3 text-xs bg-background text-foreground placeholder:text-muted-foreground resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
                </>
              ) : (
                <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <h3 className="font-semibold text-amber-700 text-sm mb-1.5">Produto Indisponível para Pronta Entrega</h3>
                  <p className="text-xs text-amber-700/80">Este item no momento encontra-se esgotado ou é feito apenas sob encomenda. Entre em contato conosco para verificar a disponibilidade de produção!</p>
                </div>
              )}
            </div>
          </div>

          {!product.isMadeToOrder ? (
            <div className="border-t border-border bg-card px-4 pt-3 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] shrink-0 sm:rounded-b-3xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="bg-muted rounded-full p-2.5 active:bg-muted/70 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-lg text-foreground w-7 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="bg-muted rounded-full p-2.5 active:bg-muted/70 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="w-full bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl text-sm shadow-card active:scale-95 transition-transform"
            >
              Adicionar R$ {itemTotal.toFixed(2)}
            </button>
            </div>
          ) : (
            <div className="border-t border-border bg-card px-4 pt-3 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] shrink-0 sm:rounded-b-3xl">
               <button
                  onClick={() => {
                     const message = encodeURIComponent(`Olá, gostaria de saber mais informações e fazer a encomenda do produto: *${product.name}*.`);
                     window.open(`https://wa.me/5519999500807?text=${message}`, '_blank');
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-5 py-3 rounded-xl text-sm shadow-card active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} /> Encomendar via WhatsApp
                </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
