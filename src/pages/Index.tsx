import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories } from "@/data/menuData";
import type { Product, Category } from "@/data/menuData";
import HeroHeader from "@/components/menu/HeroHeader";
import PromoCarousel from "@/components/menu/PromoCarousel";
import ComboCarousel from "@/components/menu/ComboCarousel";
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
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const [activeCategory, setActiveCategory] = useState("acai");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (activeCategory === "todos") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(`category-${activeCategory}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [activeCategory]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const isAAcai = a.id === "acai";
      const isBAcai = b.id === "acai";
      const isACombo = a.id.startsWith("combinados");
      const isBCombo = b.id.startsWith("combinados");

      if (isAAcai) return -1;
      if (isBAcai) return 1;
      if (isACombo) return -1;
      if (isBCombo) return 1;
      
      return 0;
    });
  }, [categories]);

  return (
    <div className="min-h-screen bg-background pb-[150px] lg:pb-0 w-full overflow-x-hidden">
      <HeroHeader onCartOpen={() => setShowCheckout(true)} />
      
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        <PromoCarousel products={products} onSelect={setSelectedProduct} />
        <ComboCarousel products={products} onSelect={setSelectedProduct} />
        <PopularSection products={products} onSelect={setSelectedProduct} />

        <CategoryNav active={activeCategory} onSelect={setActiveCategory} />

        <div className="px-3 sm:px-0 mt-4 md:mt-8 space-y-12">
          {sortedCategories.map(category => {
            const catProducts = products.filter(p => p.category === category.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={category.id} id={`category-${category.id}`} className="scroll-mt-[100px]">
                <h2 className="text-xl md:text-2xl font-display text-foreground mb-4">
                  {category.name}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
                  {catProducts.map((p) => (
                    <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
                  ))}
                </div>
              </div>
            );
          })}
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
