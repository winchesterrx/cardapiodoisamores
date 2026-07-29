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

const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const API_URL = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;

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

export interface KitItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

export interface Product {\n  kitItems?: {productId: string, quantity: number}[];
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  brand?: string;
  addons: Addon[];
  isPromo: boolean;
  originalPrice?: number;
  promoExpiry?: string;
  promoStock?: number;
  orderCount: number;
  isMadeToOrder?: boolean;
  kitItems?: KitItem[];
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
  { id: "kits", name: "Kits / Combos", icon: "gift" },
  { id: "essencias", name: "Essências", icon: "flame" },
  { id: "carvoes", name: "Carvões", icon: "package" },
  { id: "aluminio", name: "Papel Alumínio", icon: "disc" },
  { id: "narguiles", name: "Narguiles", icon: "coffee" },
  { id: "outros", name: "Outros", icon: "plus-circle" },
];

const CATEGORIES_KEY = "digitalmenu_categories_v2";

export function getCategories(): Category[] {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallback */ }
  }
  localStorage.removeItem("digitalmenu_categories_v1");
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
  { id: "gelo", name: "Gelo", price: 2.0, categoryIds: ["essencias", "outros"] },
];

const ADDONS_KEY = "digitalmenu_addons_v2";

export function getAddons(): Addon[] {
  const stored = localStorage.getItem(ADDONS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fallback */ }
  }
  localStorage.removeItem("digitalmenu_addons_v1");
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
const imageMap: Record<string, string> = {};

export const defaultProducts: Product[] = [
  // Zomo
  { id: "1", name: "Zomo Strong Mint", description: "Menta extremamente refrescante", price: 15.0, image: "/uploads/zomo_mint.png", category: "essencias", brand: "Zomo", addons: defaultAddons, isPromo: false, orderCount: 200 },
  { id: "2", name: "Zomo Alfajor", description: "Sabor doce do famoso doce argentino", price: 15.0, image: "/uploads/zomo_alfajor.png", category: "essencias", brand: "Zomo", addons: defaultAddons, isPromo: false, orderCount: 150 },
  { id: "3", name: "Zomo Swiss Alp", description: "Chiclete de menta", price: 15.0, image: "/uploads/zomo_swiss.png", category: "essencias", brand: "Zomo", addons: defaultAddons, isPromo: false, orderCount: 180 },
  // Ziggy
  { id: "4", name: "Ziggy Happy Frut", description: "Balinha tutti-frutti", price: 18.0, image: "/uploads/ziggy_happy.png", category: "essencias", brand: "Ziggy", addons: defaultAddons, isPromo: false, orderCount: 300 },
  { id: "5", name: "Ziggy Tropical", description: "Mix de frutas tropicais", price: 18.0, image: "/uploads/ziggy_tropical.png", category: "essencias", brand: "Ziggy", addons: defaultAddons, isPromo: true, originalPrice: 20.0, orderCount: 250 },
  // Nay
  { id: "6", name: "Nay Melon Blend", description: "Melão suave", price: 17.0, image: "/uploads/nay_melon.png", category: "essencias", brand: "Nay", addons: defaultAddons, isPromo: false, orderCount: 90 },
  { id: "7", name: "Nay Strawberry", description: "Morango intenso", price: 17.0, image: "/uploads/nay_strawberry.png", category: "essencias", brand: "Nay", addons: defaultAddons, isPromo: false, orderCount: 110 },
  // Onix
  { id: "8", name: "Onix Grape", description: "Uva gelada", price: 16.0, image: "/uploads/onix_grape.png", category: "essencias", brand: "Onix", addons: defaultAddons, isPromo: false, orderCount: 140 },
  // Adalya
  { id: "9", name: "Adalya Love 66", description: "Maracujá, melão, melancia e menta", price: 25.0, image: "/uploads/adalya_love.png", category: "essencias", brand: "Adalya", addons: defaultAddons, isPromo: false, orderCount: 400 },
  
  // Carvões
  { id: "10", name: "Carvão Zomo 1kg", description: "Carvão de coco hexagonal", price: 35.0, image: "/uploads/carvao_zomo.png", category: "carvoes", addons: [], isPromo: false, orderCount: 500 },
  { id: "11", name: "Carvão Art Coco 1kg", description: "Carvão de coco tradicional", price: 38.0, image: "/uploads/carvao_art.png", category: "carvoes", addons: [], isPromo: false, orderCount: 450 },

  // Alumínio
  { id: "12", name: "Alumínio Predator 50 un", description: "Folhas pré-cortadas, espessura grossa", price: 15.0, image: "/uploads/alum_predator.png", category: "aluminio", addons: [], isPromo: false, orderCount: 300 },
  
  // Narguiles
  { id: "13", name: "Narguile Triton Zip", description: "Narguile pequeno completo (Cores variadas)", price: 250.0, image: "/uploads/triton.png", category: "narguiles", addons: [], isPromo: false, orderCount: 20 },
];

const STORAGE_KEY = "digitalmenu_products_v5";

if (typeof window !== "undefined") {
  localStorage.removeItem("digitalmenu_products");
  localStorage.removeItem("digitalmenu_products_v2");
  localStorage.removeItem("digitalmenu_products_v3");
  localStorage.removeItem("digitalmenu_products_v4");
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

export async function deleteCoupon(id: number) {
  return API.del(`/coupons/${id}`);
}

// ── Brands ──
export async function fetchBrands(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/brands`);
    if (!res.ok) throw new Error('Falha ao buscar marcas');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}
