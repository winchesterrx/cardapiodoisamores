import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import type { Product } from "@/data/menuData";

interface Props {
  products: Product[];
  onSelect: (product: Product) => void;
}

export default function ComboCarousel({ products, onSelect }: Props) {
  const combos = products.filter((p) => p.isCombo);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (combos.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % combos.length), 4500);
    return () => clearInterval(timer);
  }, [combos.length]);

  if (combos.length === 0) return null;

  return (
    <div className="px-3 mt-4 relative z-10 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl shadow-elevated overflow-hidden border border-primary/20 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex items-center p-3 gap-3 cursor-pointer active:bg-muted/30 transition-colors"
            onClick={() => onSelect(combos[current])}
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-card">
              {combos[current].image ? (
                <img
                  src={combos[current].image}
                  alt={combos[current].name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-2xl">🍔</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="flex items-center gap-1">
                  <Crown className="text-primary fill-primary" size={12} />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Combinados da Semana
                  </span>
                </div>
              </div>
              <h3 className="text-base font-display text-foreground leading-tight truncate">
                {combos[current].name}
              </h3>
              <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">
                {combos[current].description}
              </p>
              
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="inline-block text-primary font-bold text-sm">
                  R$ {Number(combos[current].price).toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {combos.length > 1 && (
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex gap-1.5">
              {combos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    current === i ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrent((c) => (c - 1 + combos.length) % combos.length)}
                className="p-1 rounded bg-muted/50 text-muted-foreground active:bg-muted"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrent((c) => (c + 1) % combos.length)}
                className="p-1 rounded bg-muted/50 text-muted-foreground active:bg-muted"
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
