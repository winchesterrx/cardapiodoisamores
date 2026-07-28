import { Clock, Bike, ShoppingBag, ShoppingCart } from "lucide-react";
import confeitariaBg from "@/assets/confeitaria-bg.png";
import logoImg from "@/assets/logo.png";
import { useCart } from "@/contexts/CartContext";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchStoreSettings } from "@/data/menuData";

function getIsOpen(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 10 && hour < 23;
}

interface Props {
  onCartOpen?: () => void;
}

export default function HeroHeader({ onCartOpen }: Props) {
  const { data: storeSettings } = useQuery({ queryKey: ["storeSettings"], queryFn: fetchStoreSettings });
  const isOpen = getIsOpen();
  const { itemCount } = useCart();
  return (
    <header className="relative">
      <div className="relative pb-14 pt-8 px-4 overflow-hidden">
        <img
          src={confeitariaBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2C1A11]/70 via-[#2C1A11]/55 to-[#2C1A11]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(44,26,17,0.3)_0%,rgba(44,26,17,0.6)_100%)]" />

        {/* Desktop Navigation */}
        <div className="hidden lg:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-card/90 backdrop-blur-md px-6 py-3 rounded-full shadow-elevated items-center gap-8">
          <NavLink to="/" className={({isActive}) => `font-semibold text-sm transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-foreground'}`}>Início</NavLink>
          <NavLink to="/pedidos" className={({isActive}) => `font-semibold text-sm transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-foreground'}`}>Pedidos</NavLink>
          <NavLink to="/fidelidade" className={({isActive}) => `font-semibold text-sm transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-foreground'}`}>Fidelidade</NavLink>
          <NavLink to="/admin" className={({isActive}) => `font-semibold text-sm transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-foreground'}`}>Admin</NavLink>
        </div>

        {/* Cart icon - top right */}
        {onCartOpen && (
          <button
            onClick={onCartOpen}
            className="absolute top-4 right-4 lg:right-8 lg:top-6 z-30 bg-card/95 backdrop-blur-md rounded-full p-3 shadow-elevated active:scale-95 transition-all hover:bg-card flex items-center gap-2"
          >
            <ShoppingCart size={22} className="text-primary" />
            <span className="hidden lg:inline font-bold text-sm text-foreground pr-1">Meu Carrinho</span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 lg:-top-1.5 lg:-right-1.5 bg-primary text-primary-foreground text-[10px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1 shadow-sm">
                {itemCount}
              </span>
            )}
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-[50px]" preserveAspectRatio="none">
            <path
              d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center mb-4 mt-6 lg:mt-16">
          {/* Logo with solid background card */}
          <div className="w-52 h-52 lg:w-64 lg:h-64 rounded-3xl bg-[#EFE0D3] shadow-[0_8px_32px_rgba(44,26,17,0.35)] overflow-hidden mb-4 transition-transform hover:scale-105 duration-300 p-3">
            <img
              src={logoImg}
              alt="Docinhos Gourmet Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
              isOpen
                ? "bg-[#8D5A34] text-white"
                : "bg-muted text-muted-foreground"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-destructive"}`} />
              {isOpen ? "Aberto Agora" : "Fechado"}
            </span>

            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#EFE0D3] text-[#2C1A11] shadow-sm hover:opacity-90 transition-opacity">
              <Bike size={14} />
              Entrega
            </span>

            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-card text-[#2C1A11] shadow-sm hover:opacity-90 transition-opacity">
              <ShoppingBag size={14} />
              Retirada
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 text-white font-medium bg-[#2C1A11]/60 px-4 py-2 rounded-2xl backdrop-blur-sm text-center">
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span className="text-sm">Seg a Dom • {storeSettings?.opening_time || "10:00"} – {storeSettings?.closing_time || "22:00"}</span>
            </div>
            {storeSettings?.delivery_info_text && (
              <span className="text-[11px] text-[#EFE0D3] italic border-t border-white/20 pt-1.5 w-full">
                * {storeSettings.delivery_info_text}
              </span>
            )}
          </div>
        </div>

        {/* Slogan — bare text, no background rectangle */}
        <div className="relative z-10 text-center mt-2 mb-6 lg:mb-10">
          <p className="text-lg lg:text-2xl font-signature text-[#EFE0D3] italic leading-relaxed" style={{ textShadow: '0 2px 16px rgba(44,26,17,0.8), 0 1px 4px rgba(0,0,0,0.6)' }}>
            "Cada doce é feito com amor, para adoçar o seu dia" 💕
          </p>
        </div>
      </div>
    </header>
  );
}
