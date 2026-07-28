import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

interface Props {
  onOpen: () => void;
}

export default function FloatingCart({ onOpen }: Props) {
  const { itemCount, total } = useCart();

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={onOpen}
          className="fixed left-3 right-3 bg-primary text-primary-foreground rounded-2xl py-3.5 px-4 shadow-elevated flex items-center justify-between z-40 active:scale-[0.98] transition-transform"
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground text-[9px] font-bold w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <span className="font-medium text-sm">Ver carrinho</span>
          </div>
          <span className="font-bold text-sm">R$ {total.toFixed(2)}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
