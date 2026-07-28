import { motion } from "framer-motion";
import { Plus, Info } from "lucide-react";
import type { Product } from "@/data/menuData";

interface Props {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer active:scale-[0.97] transition-all"
      onClick={() => onSelect(product)}
    >
      <div className="h-32 bg-muted relative overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        {product.isPromo && !product.isMadeToOrder && (
          <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Promo
          </span>
        )}
        {product.isMadeToOrder && (
          <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            Sob Encomenda
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h4 className="font-semibold text-xs text-foreground truncate">{product.name}</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            {product.isPromo && product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[9px] text-muted-foreground line-through leading-none">
                R$ {product.originalPrice.toFixed(2)}
              </span>
            )}
            <span className="text-primary font-bold text-xs">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full active:scale-95 transition-transform flex items-center gap-0.5 ${product.isMadeToOrder ? 'bg-amber-500 text-white' : 'bg-accent text-accent-foreground'}`}
          >
            {product.isMadeToOrder ? (
              <><Info size={10} /> Encomendar</>
            ) : (
              <><Plus size={10} /> Pedir</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
