import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, fetchProducts } from "@/data/menuData";
import type { Product } from "@/data/menuData";
import HeroHeader from "@/components/menu/HeroHeader";
import PromoCarousel from "@/components/menu/PromoCarousel";
import CategoryNav from "@/components/menu/CategoryNav";
import PopularSection from "@/components/menu/PopularSection";
import ProductCard from "@/components/menu/ProductCard";
import ProductModal from "@/components/menu/ProductModal";
import FloatingCart from "@/components/menu/FloatingCart";
import CheckoutModal from "@/components/menu/CheckoutModal";
import BottomNav from "@/components/menu/BottomNav";
import WhatsAppButton from "@/components/menu/WhatsAppButton";

const Index = () => {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const [activeCategory, setActiveCategory] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const filteredProducts = useMemo(
    () =>
      activeCategory === "todos"
        ? products
        : products.filter((p) => p.category === activeCategory),
    [products, activeCategory]
  );

  return (
    <div className="min-h-screen bg-background pb-[150px] lg:pb-0 w-full overflow-x-hidden">
      <HeroHeader onCartOpen={() => setShowCheckout(true)} />
      
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        <PromoCarousel products={products} onSelect={setSelectedProduct} />
        <PopularSection products={products} onSelect={setSelectedProduct} />

        <CategoryNav active={activeCategory} onSelect={setActiveCategory} />

        <div className="px-3 sm:px-0 mt-4 md:mt-8">
          <h2 className="text-xl md:text-2xl font-display text-foreground mb-4">
            {activeCategory === "todos"
              ? "Cardápio Completo"
              : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
            ))}
          </div>
        </div>
      </div>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <FloatingCart onOpen={() => setShowCheckout(true)} />
      <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} />
      <WhatsAppButton />
      <BottomNav />
    </div>
  );
};

export default Index;
