import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap, Package } from "lucide-react";
import type { Product } from "@/data/menuData";
import PromoTimer from "./PromoTimer";

interface Props {
  products: Product[];
  onSelect: (product: Product) => void;
}

export default function PromoCarousel({ products, onSelect }: Props) {
  const promos = products.filter((p) => p.isPromo);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (promos.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % promos.length), 4000);
    return () => clearInterval(timer);
  }, [promos.length]);

  if (promos.length === 0) return null;

  return (
    <div className="px-3 -mt-5 relative z-10 max-w-3xl mx-auto">
      <div className="bg-card rounded-2xl shadow-elevated overflow-hidden border border-border/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex items-center p-3 gap-3 cursor-pointer active:bg-muted/30 transition-colors"
            onClick={() => onSelect(promos[current])}
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-card">
              {promos[current].image ? (
                <img
                  src={promos[current].image}
                  alt={promos[current].name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-2xl">🍔</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="flex items-center gap-1">
                  <Zap className="text-accent fill-accent" size={12} />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Promoção
                  </span>
                  {promos[current].isMadeToOrder && (
                    <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 uppercase">
                      Sob Encomenda
                    </span>
                  )}
                </div>
                {promos[current].promoExpiry && (
                  <PromoTimer expiry={promos[current].promoExpiry!} />
                )}
              </div>
              <h3 className="text-base font-display text-foreground leading-tight truncate">
                {promos[current].name}
              </h3>
              <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">
                {promos[current].description}
              </p>
              
              {promos[current].promoStock !== undefined && promos[current].promoStock !== null && (
                <div className="flex items-center gap-1 text-[10px] font-medium text-amber-500 mt-1">
                  <Package size={10} /> Apenas {promos[current].promoStock} unidades!
                </div>
              )}

              <div className="mt-1 flex items-baseline gap-1.5">
                {promos[current].originalPrice && promos[current].originalPrice! > promos[current].price && (
                  <span className="text-[11px] text-muted-foreground line-through">
                    R$ {promos[current].originalPrice!.toFixed(2)}
                  </span>
                )}
                <span className="inline-block text-primary font-bold text-sm">
                  R$ {promos[current].price.toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {promos.length > 1 && (
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex gap-1.5">
              {promos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrent((c) => (c - 1 + promos.length) % promos.length)}
                className="p-1.5 rounded-full bg-muted text-muted-foreground active:bg-primary active:text-primary-foreground transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrent((c) => (c + 1) % promos.length)}
                className="p-1.5 rounded-full bg-muted text-muted-foreground active:bg-primary active:text-primary-foreground transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
