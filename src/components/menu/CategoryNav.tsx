import { useQuery } from "@tanstack/react-query";
import { Drumstick, Beef, Crown, CupSoda, CakeSlice, LayoutGrid, Pizza, Salad, Fish, Coffee, IceCream, Sandwich, Soup, Wine, Utensils } from "lucide-react";
import { fetchCategories } from "@/data/menuData";
import type { Category } from "@/data/menuData";

const iconMap: Record<string, React.ElementType> = {
  drumstick: Drumstick,
  beef: Beef,
  crown: Crown,
  "cup-soda": CupSoda,
  "cake-slice": CakeSlice,
  pizza: Pizza,
  salad: Salad,
  fish: Fish,
  coffee: Coffee,
  "ice-cream": IceCream,
  sandwich: Sandwich,
  soup: Soup,
  wine: Wine,
  utensils: Utensils,
};

interface Props {
  active: string;
  onSelect: (id: string) => void;
}

export default function CategoryNav({ active, onSelect }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const sortedCategories = [...categories].sort((a, b) => {
    const isAAcai = a.id === "acai";
    const isBAcai = b.id === "acai";
    const isACombo = a.id.startsWith("combinados");
    const isBCombo = b.id.startsWith("combinados");

    if (isAAcai) return -1;
    if (isBAcai) return 1;
    if (isACombo) return -1;
    if (isBCombo) return 1;
    
    return 0; // maintain original order for others
  });

  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shadow-card">
      <div
        className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {sortedCategories.map((cat) => {
          const Icon = iconMap[cat.icon] || Utensils;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                active === cat.id
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "bg-muted text-muted-foreground active:bg-muted/70"
              }`}
            >
              <Icon size={13} />
              {cat.name}
            </button>
          );
        })}
        <button
          onClick={() => onSelect("todos")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            active === "todos"
              ? "bg-primary text-primary-foreground shadow-card"
              : "bg-muted text-muted-foreground active:bg-muted/70"
          }`}
        >
          <LayoutGrid size={13} />
          Todos
        </button>
      </div>
    </div>
  );
}
