import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

const PHONE = "5519999500807";
const MESSAGE = encodeURIComponent(
  "Olá! 😊\nGostaria de fazer um pedido na *Docinhos Gourmet*! 🍰🧁\nPoderia me ajudar?"
);

export default function WhatsAppButton() {
  const { itemCount } = useCart();
  
  const bottomPosition = itemCount > 0 
    ? "calc(142px + env(safe-area-inset-bottom))" 
    : "calc(78px + env(safe-area-inset-bottom))";

  return (
    <motion.a
      href={`https://wa.me/${PHONE}?text=${MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar pelo WhatsApp"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed right-4 z-50 w-14 h-14 rounded-full bg-[hsl(142,70%,45%)] text-white flex items-center justify-center shadow-elevated"
      style={{ bottom: bottomPosition }}
    >
      <MessageCircle size={28} fill="white" strokeWidth={0} />
    </motion.a>
  );
}
