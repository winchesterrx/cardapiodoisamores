import { useState, useEffect } from "react";
import { X, Minus, Plus, ChevronLeft, ChevronRight, Package, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, SelectedAddon } from "@/data/menuData";
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
  const [selectedComboSizeIdx, setSelectedComboSizeIdx] = useState<number>(0);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const safeParse = (data: any) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
  };

  const comboSizes = product?.comboSizes ? safeParse(product.comboSizes) : [];
  const comboAddons = product?.comboAddons ? safeParse(product.comboAddons) : [];

  useEffect(() => {
    if (product?.isCombo && comboAddons.length > 0) {
      const initialAddons: Record<string, number> = {};
      comboAddons.forEach((ca: any) => {
        initialAddons[ca.addonId] = ca.quantity;
      });
      setAddonQuantities(initialAddons);
      setSelectedComboSizeIdx(0);
    } else {
      setAddonQuantities({});
    }
  }, [product]);

  if (!product) return null;

  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);

  const availableAddons = Array.isArray(product.addons) ? product.addons : [];

  const setAddonQty = (addonId: string, qty: number) => {
    setAddonQuantities((prev) => {
      if (qty <= 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addonId]: qty };
    });
  };

  const isAddonFree = (addonId: string) => {
    if (!product?.isCombo || !comboAddons) return false;
    const ca = comboAddons.find((a: any) => a.addonId === addonId);
    return ca ? (ca.isFree !== false) : false;
  };

  const selectedAddons: SelectedAddon[] = [];
  
  if (product?.isBarca) {
    let freeCremesLeft = 1;
    let freeAdicionaisLeft = 5;

    availableAddons.forEach((a) => {
      let qty = addonQuantities[a.id] || 0;
      if (qty > 0) {
        let freeQty = 0;
        if (a.type === 'creme' && freeCremesLeft > 0) {
          freeQty = Math.min(qty, freeCremesLeft);
          freeCremesLeft -= freeQty;
        } else if (a.type === 'adicional' && freeAdicionaisLeft > 0) {
          freeQty = Math.min(qty, freeAdicionaisLeft);
          freeAdicionaisLeft -= freeQty;
        }

        if (freeQty > 0) {
          selectedAddons.push({ addon: { ...a, price: 0, name: `${a.name} (Incluso)` }, quantity: freeQty });
        }
        
        let paidQty = qty - freeQty;
        if (paidQty > 0) {
          selectedAddons.push({ addon: a, quantity: paidQty });
        }
      }
    });
  } else {
    availableAddons
      .filter((a) => (addonQuantities[a.id] || 0) > 0)
      .forEach((a) => {
        const qty = addonQuantities[a.id] || 0;
        if (isAddonFree(a.id)) {
          const freeAddon = { addon: { ...a, price: 0, name: `${a.name} (Incluso)` }, quantity: 1 };
          if (qty > 1) {
             selectedAddons.push(freeAddon, { addon: a, quantity: qty - 1 });
          } else {
             selectedAddons.push(freeAddon);
          }
        } else {
          selectedAddons.push({ addon: a, quantity: qty });
        }
      });
  }

  const addonTotal = selectedAddons.reduce((s, sa) => s + (Number(sa.addon.price) || 0) * (Number(sa.quantity) || 0), 0);
  
  const basePrice = product.isCombo && comboSizes.length > 0
    ? Number(comboSizes[selectedComboSizeIdx]?.price) || 0
    : Number(product.price) || 0;
    
  const itemTotal = (basePrice + addonTotal) * (Number(quantity) || 1);



  const handleAdd = () => {
    const productToAdd = { ...product };
    if (product.isCombo && comboSizes.length > 0) {
       const selectedSize = comboSizes[selectedComboSizeIdx];
       if (selectedSize) {
         productToAdd.name = `${product.name} (${selectedSize.name})`;
         productToAdd.price = selectedSize.price;
       }
    }
    
    for (let i = 0; i < quantity; i++) {
      addItem(productToAdd, selectedAddons, notes);
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
                  <img src={images[currentImageIdx]} alt={product.name} className="w-full h-full object-contain bg-white transition-opacity duration-300" />
                  
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
                {product.isPromo && product.originalPrice && product.originalPrice !== product.price && !product.isCombo && (
                  <span className="text-sm text-muted-foreground line-through mr-1">
                    R$ {Number(Math.max(product.originalPrice, product.price)).toFixed(2)}
                  </span>
                )}
                <span className="text-primary font-bold text-lg">
                  {product.isCombo && comboSizes.length > 0 ? (
                    `A partir de R$ ${Math.min(...comboSizes.map((s: any) => Number(s.price) || 0)).toFixed(2)}`
                  ) : (
                    `R$ ${Number(product.isPromo && product.originalPrice ? Math.min(product.originalPrice, product.price) : product.price).toFixed(2)}`
                  )}
                </span>
              </div>

              {!product.isMadeToOrder ? (
                <>
                  {product.isCombo && comboSizes.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-foreground text-sm mb-2">Selecione o Tamanho</h3>
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
                    <div className="mt-4">
                      {product.isCombo && availableAddons.some(a => isAddonFree(a.id)) && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-foreground text-sm mb-2">Itens Inclusos</h3>
                          <p className="text-xs text-muted-foreground mb-2">Os itens abaixo fazem parte do combo (1 unidade grátis).</p>
                          <div className="space-y-1.5">
                            {availableAddons.filter(a => isAddonFree(a.id)).map((addon) => {
                              const qty = addonQuantities[addon.id] || 0;
                              return (
                                <div
                                  key={addon.id}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                                    qty > 0 ? "border-primary bg-primary/5" : "border-border"
                                  }`}
                                >
                                  <div className="flex items-center justify-between flex-1 mr-4 gap-2 min-w-0">
                                    <span className="text-sm font-medium text-foreground truncate">{addon.name}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm ${qty <= 1 ? "bg-green-100 text-green-700" : "bg-accent text-accent-foreground"}`}>
                                      {qty > 1 ? `+ R$ ${Number(addon.price).toFixed(2)} (Extra)` : "Incluso"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {qty > 0 && (
                                      <button onClick={() => setAddonQty(addon.id, qty - 1)} className="bg-muted rounded-full p-1.5 active:bg-muted/70">
                                        <Minus size={12} />
                                      </button>
                                    )}
                                    {qty > 0 && <span className="text-sm font-bold w-5 text-center text-foreground">{qty}</span>}
                                    <button onClick={() => setAddonQty(addon.id, qty + 1)} className="bg-primary text-primary-foreground rounded-full p-1.5 active:opacity-80">
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {product.isBarca && availableAddons.length > 0 && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-foreground text-sm mb-2">Monte sua Barca</h3>
                          <p className="text-xs text-muted-foreground mb-4">Você tem direito a <strong>1 Creme</strong> e <strong>5 Adicionais</strong> gratuitos!</p>
                          
                          {/* Cremes Section */}
                          {availableAddons.filter(a => a.type === 'creme').length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-foreground text-xs mb-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg inline-block">Cremes (1 Grátis)</h4>
                              <div className="space-y-1.5 mt-2">
                                {availableAddons.filter(a => a.type === 'creme').map((addon) => {
                                  const qty = addonQuantities[addon.id] || 0;
                                  return (
                                    <div
                                      key={addon.id}
                                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                                        qty > 0 ? "border-primary bg-primary/5" : "border-border"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between flex-1 mr-4 gap-2 min-w-0">
                                        <span className="text-sm font-medium text-foreground truncate">{addon.name}</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm bg-accent text-accent-foreground">
                                          + R$ {Number(addon.price).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {qty > 0 && (
                                          <button onClick={() => setAddonQty(addon.id, qty - 1)} className="bg-muted rounded-full p-1.5 active:bg-muted/70">
                                            <Minus size={12} />
                                          </button>
                                        )}
                                        {qty > 0 && <span className="text-sm font-bold w-5 text-center text-foreground">{qty}</span>}
                                        <button onClick={() => setAddonQty(addon.id, qty + 1)} className="bg-primary text-primary-foreground rounded-full p-1.5 active:opacity-80">
                                          <Plus size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Adicionais Section */}
                          {availableAddons.filter(a => a.type === 'adicional' || a.type === 'normal').length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-foreground text-xs mb-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg inline-block">Adicionais (5 Grátis)</h4>
                              <div className="space-y-1.5 mt-2">
                                {availableAddons.filter(a => a.type === 'adicional' || a.type === 'normal').map((addon) => {
                                  const qty = addonQuantities[addon.id] || 0;
                                  return (
                                    <div
                                      key={addon.id}
                                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                                        qty > 0 ? "border-primary bg-primary/5" : "border-border"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between flex-1 mr-4 gap-2 min-w-0">
                                        <span className="text-sm font-medium text-foreground truncate">{addon.name}</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm bg-accent text-accent-foreground">
                                          + R$ {Number(addon.price).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {qty > 0 && (
                                          <button onClick={() => setAddonQty(addon.id, qty - 1)} className="bg-muted rounded-full p-1.5 active:bg-muted/70">
                                            <Minus size={12} />
                                          </button>
                                        )}
                                        {qty > 0 && <span className="text-sm font-bold w-5 text-center text-foreground">{qty}</span>}
                                        <button onClick={() => setAddonQty(addon.id, qty + 1)} className="bg-primary text-primary-foreground rounded-full p-1.5 active:opacity-80">
                                          <Plus size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!product.isBarca && availableAddons.some(a => !isAddonFree(a.id)) && (
                        <div>
                          <h3 className="font-semibold text-foreground text-sm mb-2">Adicionais</h3>
                          <div className="space-y-1.5">
                            {availableAddons.filter(a => !isAddonFree(a.id)).map((addon) => {
                              const qty = addonQuantities[addon.id] || 0;
                              return (
                                <div
                                  key={addon.id}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                                    qty > 0 ? "border-primary bg-primary/5" : "border-border"
                                  }`}
                                >
                                  <div className="flex items-center justify-between flex-1 mr-4 gap-2 min-w-0">
                                    <span className="text-sm font-medium text-foreground truncate">{addon.name}</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm bg-accent text-accent-foreground">
                                      + R$ {Number(addon.price).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {qty > 0 && (
                                      <button onClick={() => setAddonQty(addon.id, qty - 1)} className="bg-muted rounded-full p-1.5 active:bg-muted/70">
                                        <Minus size={12} />
                                      </button>
                                    )}
                                    {qty > 0 && <span className="text-sm font-bold w-5 text-center text-foreground">{qty}</span>}
                                    <button onClick={() => setAddonQty(addon.id, qty + 1)} className="bg-primary text-primary-foreground rounded-full p-1.5 active:opacity-80">
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
