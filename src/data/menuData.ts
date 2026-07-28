import brigadeiroGourmet from "@/assets/brigadeiro-gourmet.png";
import beijinhoTrufado from "@/assets/beijinho-trufado.png";
import coxinhaMorango from "@/assets/coxinha-morango.png";
import boloPoteNinho from "@/assets/bolo-pote-ninho.png";
import boloPoteCenoura from "@/assets/bolo-pote-cenoura.png";
import copoFelicidade from "@/assets/copo-felicidade.png";
import croissantDoce from "@/assets/croissant-doce.png";
import capuccinoCream from "@/assets/capuccino-cream.png";
import pinkLemonade from "@/assets/pink-lemonade.png";
import espressoItaliano from "@/assets/espresso-italiano.png";

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API = {
  async post(path: string, data: any) { 
    const res = await fetch(API_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
    if (!res.ok) throw new Error('API Error');
    return res;
  },
  async put(path: string, data: any) { 
    const res = await fetch(API_URL + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
    if (!res.ok) throw new Error('API Error');
    return res;
  },
  async del(path: string) { 
    const res = await fetch(API_URL + path, { method: 'DELETE' }); 
    if (!res.ok) throw new Error('API Error');
    return res;
  }
};

export interface Addon {
  id: string;
  name: string;
  price: number;
  categoryIds: string[];
}

export interface SelectedAddon {
  addon: Addon;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  addons: Addon[];
  isPromo: boolean;
  originalPrice?: number;
  promoExpiry?: string;
  promoStock?: number;
  orderCount: number;
  isMadeToOrder?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedAddons: SelectedAddon[];
  notes: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type OrderStatus = "recebido" | "confirmado" | "preparando" | "pronto" | "despachado" | "entregue" | "cancelado";

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
}

export interface Order {
  id: string;
  number: number;
  items: {
    productName: string;
    productPrice: number;
    quantity: number;
    addons: { name: string; price: number; quantity: number }[];
    notes: string;
  }[];
  total: number;
  consumeType: string;
  paymentMethod: string;
  address: string;
  mesa: string;
  customerWhatsApp: string;
  customerCPF: string;
  status: OrderStatus;
  timeline: OrderTimeline[];
  createdAt: string;
  usedPoints?: number;
  discountAmount?: number;
  customerName?: string;
  changeNeededFor?: number;
  deliveryFee?: number;
  courierId?: number | null;
  courierName?: string | null;
  origin?: 'delivery' | 'pdv';
}

// ── Categories ──
export const defaultCategories: Category[] = [
  { id: "docinhos", name: "Docinhos Gourmet", icon: "ice-cream" },
  { id: "bolos", name: "Bolos & Tortas", icon: "cake-slice" },
  { id: "copos", name: "Copos da Felicidade", icon: "crown" },
  { id: "bebidas", name: "Cafés & Bebidas", icon: "coffee" },
];

const CATEGORIES_KEY = "digitalmenu_categories_v1";

export function getCategories(): Category[] {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallback */ }
  }
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
  return defaultCategories;
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error('Falha ao buscar categorias');
    return await res.json();
  } catch (error) {
    console.error(error);
    return getCategories();
  }
}

// ── Addons ──
export const defaultAddons: Addon[] = [
  { id: "nutella", name: "Nutella Extra", price: 4.0, categoryIds: ["docinhos", "bolos", "copos"] },
  { id: "morango", name: "Morango Extra", price: 3.0, categoryIds: ["docinhos", "bolos", "copos"] },
  { id: "leite-ninho", name: "Leite Ninho Extra", price: 2.0, categoryIds: ["docinhos", "bolos", "copos"] },
  { id: "kinder-bueno", name: "Kinder Bueno Extra", price: 5.0, categoryIds: ["bolos", "copos"] },
  { id: "calda-caramelo", name: "Calda de Caramelo", price: 1.5, categoryIds: ["bolos", "copos", "bebidas"] },
];

const ADDONS_KEY = "digitalmenu_addons_v1";

export function getAddons(): Addon[] {
  const stored = localStorage.getItem(ADDONS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallback */ }
  }
  localStorage.setItem(ADDONS_KEY, JSON.stringify(defaultAddons));
  return defaultAddons;
}

export function saveAddons(addons: Addon[]) {
  localStorage.setItem(ADDONS_KEY, JSON.stringify(addons));
}

export async function fetchAddons(): Promise<Addon[]> {
  try {
    const res = await fetch(`${API_URL}/addons`);
    if (!res.ok) throw new Error('Falha ao buscar adicionais');
    return await res.json();
  } catch (error) {
    console.error(error);
    return getAddons();
  }
}

export function getAddonsForCategory(categoryId: string): Addon[] {
  return getAddons().filter((a) => a.categoryIds.includes(categoryId));
}

// ── Products ──
const imageMap: Record<string, string> = {
  "1": brigadeiroGourmet, "2": beijinhoTrufado, "3": coxinhaMorango, "4": boloPoteNinho,
  "5": boloPoteCenoura, "6": copoFelicidade, "7": croissantDoce, "8": capuccinoCream,
  "9": pinkLemonade, "10": espressoItaliano,
};

export const defaultProducts: Product[] = [
  { id: "1", name: "Brigadeiro Gourmet Belga", description: "Brigadeiro tradicional feito com cacau belga 54% e granulado nobre", price: 4.5, image: brigadeiroGourmet, category: "docinhos", addons: defaultAddons.slice(0, 3), isPromo: true, orderCount: 412 },
  { id: "2", name: "Beijinho Trufado", description: "Doce de coco com textura cremosa e cobertura de coco ralado fino", price: 4.5, image: beijinhoTrufado, category: "docinhos", addons: defaultAddons.slice(0, 3), isPromo: false, orderCount: 289 },
  { id: "3", name: "Coxinha de Morango", description: "Morango inteiro fresco envolto em brigadeiro gourmet de leite ninho", price: 8.0, image: coxinhaMorango, category: "docinhos", addons: defaultAddons.slice(0, 3), isPromo: true, orderCount: 384 },
  { id: "4", name: "Bolo no Pote Ninho com Nutella", description: "Camadas de bolo de chocolate molhadinho com creme de leite Ninho e Nutella pura", price: 15.0, image: boloPoteNinho, category: "bolos", addons: defaultAddons, isPromo: true, orderCount: 512 },
  { id: "5", name: "Bolo no Pote Cenoura com Brigadeiro", description: "Bolo de cenoura fofinho com uma cobertura generosa de brigadeiro gourmet cremoso", price: 15.0, image: boloPoteCenoura, category: "bolos", addons: defaultAddons, isPromo: false, orderCount: 265 },
  { id: "6", name: "Copo da Felicidade Supremo", description: "Copo repleto de brigadeiro belga, creme de Ninho, morangos frescos e pedaços de Kinder Bueno", price: 18.0, image: copoFelicidade, category: "copos", addons: defaultAddons, isPromo: true, orderCount: 689 },
  { id: "7", name: "Croissant de Nutella e Morango", description: "Croissant folhado super crocante recheado com creme de avelã e fatias de morango", price: 16.5, image: croissantDoce, category: "bolos", addons: defaultAddons.slice(0, 3), isPromo: false, orderCount: 145 },
  { id: "8", name: "Capuccino Cream", description: "Espresso curto servido com leite vaporizado cremoso, chantilly e raspas de chocolate belga", price: 12.0, image: capuccinoCream, category: "bebidas", addons: [defaultAddons[4]], isPromo: false, orderCount: 320 },
  { id: "9", name: "Pink Lemonade", description: "Bebida refrescante com limão siciliano, água com gás e xarope de frutas vermelhas caseiro", price: 10.0, image: pinkLemonade, category: "bebidas", addons: [], isPromo: false, orderCount: 245 },
  { id: "10", name: "Espresso Italiano", description: "Café espresso tradicional tirado na hora com grãos selecionados", price: 6.0, image: espressoItaliano, category: "bebidas", addons: [], isPromo: false, orderCount: 189, isMadeToOrder: true },
];

const STORAGE_KEY = "digitalmenu_products_v3";

if (typeof window !== "undefined") {
  localStorage.removeItem("digitalmenu_products");
  localStorage.removeItem("digitalmenu_products_v2");
}

const BASE_URL = API_URL.replace(/\/api$/, '');
const fixUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('/uploads') ? `${BASE_URL}${url}` : url;
};

export function getProducts(): Product[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const products: Product[] = JSON.parse(stored);
      return products.map((p) => ({ 
        ...p, 
        image: imageMap[p.id] || fixUrl(p.image),
        images: p.images?.map(fixUrl)
      }));
    } catch { /* fallback */ }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
  return defaultProducts;
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error('Falha ao buscar produtos');
    const data = await res.json();
    return data.map((p: Product) => ({ 
      ...p, 
      image: imageMap[p.id] || fixUrl(p.image) || p.id,
      images: p.images?.map(fixUrl)
    })); // mapping images for mock data compatibility
  } catch (error) {
    console.error(error);
    return getProducts(); // fallback pro localStorage
  }
}


export function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// ── Orders ──
const ORDERS_KEY = "digitalmenu_orders_v1";
const ORDER_COUNTER_KEY = "digitalmenu_order_counter";

export function getOrders(): Order[] {
  const stored = localStorage.getItem(ORDERS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallback */ }
  }
  return [];
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_URL}/orders`);
    if (!res.ok) throw new Error('Falha ao buscar pedidos');
    return await res.json();
  } catch (error) {
    console.error(error);
    return getOrders();
  }
}

export function getNextOrderNumber(): number {
  const current = parseInt(localStorage.getItem(ORDER_COUNTER_KEY) || "0", 10);
  const next = current + 1;
  localStorage.setItem(ORDER_COUNTER_KEY, next.toString());
  return next;
}

export function addOrder(order: Order) {
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
}

export async function addOrderAsync(order: Order) {
  return API.post('/orders', order);
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = status;
    order.timeline.push({ status, timestamp: new Date().toISOString() });
    saveOrders(orders);
  }
  return orders;
}

// Get orders by CPF or WhatsApp/phone number lookup for customer view
export function getOrdersByLookup(term: string): Order[] {
  const cleanTerm = term.replace(/\D/g, "");
  if (!cleanTerm) return [];
  return getOrders().filter((o) => {
    const cleanCPF = o.customerCPF ? o.customerCPF.replace(/\D/g, "") : "";
    const cleanWA = o.customerWhatsApp ? o.customerWhatsApp.replace(/\D/g, "") : "";
    return (cleanCPF && cleanCPF === cleanTerm) || (cleanWA && (cleanWA.endsWith(cleanTerm) || cleanTerm.endsWith(cleanWA)));
  });
}

export async function fetchOrdersByLookup(term: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API_URL}/orders`);
    if (!res.ok) throw new Error('Falha ao buscar pedidos');
    const data = await res.json();
    const cleanTerm = term.replace(/\D/g, "");
    if (!cleanTerm) return [];
    return data.filter((o: Order) => {
      const cleanCPF = o.customerCPF ? String(o.customerCPF).replace(/\D/g, "") : "";
      const cleanWA = o.customerWhatsApp ? String(o.customerWhatsApp).replace(/\D/g, "") : "";
      return (cleanCPF && cleanCPF === cleanTerm) || (cleanWA && (cleanWA.endsWith(cleanTerm) || cleanTerm.endsWith(cleanWA)));
    });
  } catch (error) {
    console.error(error);
    return getOrdersByLookup(term);
  }
}

// Keep these for backward compatibility
export function getOrdersByCPF(cpf: string): Order[] {
  return getOrdersByLookup(cpf);
}

export async function fetchOrdersByCPF(cpf: string): Promise<Order[]> {
  return fetchOrdersByLookup(cpf);
}

// ── Loyalty ──
export interface LoyaltySettings {
  active: boolean | number;
  spent_amount: number;
  points_earned: number;
  points_for_discount: number;
  discount_amount: number;
}

export async function fetchLoyaltySettings(): Promise<LoyaltySettings> {
  try {
    const res = await fetch(`${API_URL}/loyalty/settings`);
    if (!res.ok) throw new Error('Falha ao buscar config fidelidade');
    return await res.json();
  } catch (e) {
    console.error(e);
    return { active: 0, spent_amount: 1, points_earned: 1, points_for_discount: 10, discount_amount: 1 };
  }
}

export async function saveLoyaltySettings(settings: LoyaltySettings) {
  return API.put('/loyalty/settings', settings);
}

export async function fetchCustomerPoints(cpf: string): Promise<number> {
  if (!cpf || cpf.replace(/\D/g, '').length !== 11) return 0;
  try {
    const res = await fetch(`${API_URL}/loyalty/customer/${cpf.replace(/\D/g, '')}`);
    if (!res.ok) throw new Error('Falha ao buscar pontos');
    const data = await res.json();
    return data.points || 0;
  } catch (e) {
    console.error(e);
    return 0;
  }
}

// ── Store Settings ──
export interface StoreSettings {
  has_delivery: boolean | number;
  has_table: boolean | number;
  has_pickup: boolean | number;
  accepts_pix: boolean | number;
  accepts_cash: boolean | number;
  accepts_card: boolean | number;
  opening_time: string;
  closing_time: string;
  delivery_fee: number;
  delivery_info_text?: string;
  is_open?: boolean | number;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${API_URL}/store/settings`);
    if (!res.ok) throw new Error('Falha ao buscar configurações da loja');
    return await res.json();
  } catch (e) {
    console.error(e);
    return {
      has_delivery: 1,
      has_table: 1,
      has_pickup: 1,
      accepts_pix: 1,
      accepts_cash: 1,
      accepts_card: 1,
      opening_time: "10:00",
      closing_time: "22:00",
      delivery_fee: 0.00,
      delivery_info_text: "Entregas apenas depois das 14:00"
    };
  }
}

export async function saveStoreSettings(settings: StoreSettings) {
  return API.put('/store/settings', settings);
}

// ── Coupons ──
export interface Coupon {
  id?: number;
  code: string;
  type: "Frete" | "Valor" | "Porcentagem";
  value?: number;
  is_active: boolean | number;
  created_at?: string;
  usage_count?: number;
}

export async function fetchCoupons(): Promise<Coupon[]> {
  try {
    const res = await fetch(`${API_URL}/coupons`);
    if (!res.ok) throw new Error('Falha ao buscar cupons');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
  try {
    const res = await API.post('/coupons/validate', { code });
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function saveCoupon(coupon: any) {
  if (coupon.id) {
    return API.put(`/coupons/${coupon.id}`, coupon);
  }
  return API.post('/coupons', coupon);
}

export async function deleteCoupon(id: string) {
  return API.del(`/coupons/${id}`);
}
