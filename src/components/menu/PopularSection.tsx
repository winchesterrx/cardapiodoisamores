import { useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/data/menuData";

interface Props {
  products: Product[];
  onSelect: (product: Product) => void;
}

export default function PopularSection({ products, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const popular = [...products].sort((a, b) => b.orderCount - a.orderCount).slice(0, 6);

  if (popular.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -180 : 180;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="mt-3 mb-3">
      <div className="flex items-center justify-between px-3 mb-2">
        <h2 className="text-lg font-display text-foreground flex items-center gap-1.5">
          <Star className="text-accent fill-accent" size={18} />
          Mais Pedidos
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-full bg-muted text-muted-foreground active:bg-primary active:text-primary-foreground transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-full bg-muted text-muted-foreground active:bg-primary active:text-primary-foreground transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto px-3 pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {popular.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="min-w-[160px] max-w-[160px] bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer group active:scale-[0.97] transition-all snap-start flex-shrink-0"
            onClick={() => onSelect(p)}
          >
            <div className="relative">
              <div className="h-28 overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-3xl">🍽️</div>
                )}
              </div>
              {p.isMadeToOrder ? (
                <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                  Sob Encomenda
                </span>
              ) : (
                <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={9} className="fill-current" />
                  Mais Pedido
                </span>
              )}
            </div>

            <div className="p-2.5">
              <h4 className="font-semibold text-xs text-foreground truncate">{p.name}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-primary font-bold text-xs">
                  R$ {p.price.toFixed(2)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(p);
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-transform ${
                    p.isMadeToOrder
                      ? "bg-amber-500 text-white"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {p.isMadeToOrder ? "Encomendar" : "+ Pedir"}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
