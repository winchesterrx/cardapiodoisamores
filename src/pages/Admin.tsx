import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  LogIn, LogOut, Plus, Pencil, Trash2, BarChart3, Package, Star, Settings,
  ChevronLeft, LayoutGrid, ListPlus, ClipboardList, CheckCircle2, Clock,
  Truck, XCircle, Printer, MessageCircle, Eye, Award, X, Tag, Store, Users, TrendingDown, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProducts, saveProducts, getCategories, saveCategories,
  getAddons, saveAddons, getOrders, updateOrderStatus,
  fetchProducts, fetchCategories, fetchAddons, fetchOrders, API,
  fetchLoyaltySettings, saveLoyaltySettings, fetchStoreSettings, saveStoreSettings, fetchCoupons, fetchBrands
} from "@/data/menuData";
import type { Product, Addon, Category, Order, OrderStatus, LoyaltySettings, StoreSettings } from "@/data/menuData";
import AdminCoupons from "./AdminCoupons";
import AdminReports from "./AdminReports";
import AdminCouriers from "./AdminCouriers";
import AdminPDV from "./AdminPDV";
import AdminExpenses from "./AdminExpenses";
import EditOrderModal from "@/components/admin/EditOrderModal";
import { printOrder } from "@/utils/printUtils";

const availableIcons = [
  { id: "drumstick", label: "Frango" }, { id: "beef", label: "Carne" },
  { id: "crown", label: "Especial" }, { id: "cup-soda", label: "Bebida" },
  { id: "cake-slice", label: "Bolo" }, { id: "pizza", label: "Pizza" },
  { id: "salad", label: "Salada" }, { id: "fish", label: "Peixe" },
  { id: "coffee", label: "Café" }, { id: "ice-cream", label: "Sorvete" },
  { id: "sandwich", label: "Sanduíche" }, { id: "soup", label: "Sopa" },
  { id: "wine", label: "Vinho" }, { id: "utensils", label: "Geral" },
];

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  recebido: { label: "Recebido", icon: ClipboardList, color: "text-blue-500 bg-blue-500/10" },
  confirmado: { label: "Confirmado", icon: CheckCircle2, color: "text-cyan-500 bg-cyan-500/10" },
  preparando: { label: "Preparando", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  pronto: { label: "Pronto", icon: Package, color: "text-emerald-500 bg-emerald-500/10" },
  despachado: { label: "Despachado", icon: Truck, color: "text-slate-500 bg-slate-500/10" },
  entregue: { label: "Entregue", icon: CheckCircle2, color: "text-muted-foreground bg-muted" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "text-destructive bg-destructive/10" },
};

const statusFlow: OrderStatus[] = ["recebido", "confirmado", "preparando", "pronto", "despachado", "entregue"];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Admin() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();

  const { data: products = [], refetch: refetchProducts } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: categories = [], refetch: refetchCategories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: couriers = [] } = useQuery({ queryKey: ['couriers'], queryFn: async () => {
    const res = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const all = await res.json();
    return all.filter((u: any) => u.role === 'courier');
  }});
  const { data: addons = [], refetch: refetchAddons } = useQuery({ queryKey: ['addons'], queryFn: fetchAddons });
  const { data: orders = [], refetch: refetchOrders } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders, refetchInterval: 15000 });
  const { data: coupons = [] } = useQuery({ queryKey: ['coupons'], queryFn: fetchCoupons });
  const { data: brands = [], refetch: refetchBrands } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "categories" | "addons" | "promos" | "loyalty" | "settings" | "coupons" | "reports" | "couriers" | "pdv" | "expenses">("orders");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingOrderForModal, setEditingOrderForModal] = useState<Order | null>(null);
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [orderFilter, setOrderFilter] = useState<OrderStatus | "todos">("todos");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  
  // Dashboard & UX State
  const [isCompactView, setIsCompactView] = useState(false);
  const [showDashboardMetrics, setShowDashboardMetrics] = useState(true);
  const [viewLayout, setViewLayout] = useState<"kanban" | "list">("kanban");
  const [now, setNow] = useState(Date.now());
  const [prevReceivedCount, setPrevReceivedCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const receivedCount = orders.filter(o => o.status === "recebido").length;
    if (receivedCount > prevReceivedCount) {
      // Toca um som de notificação (sino suave) quando chega pedido novo
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
      audio.play().catch(e => console.log("Audio block pelo navegador:", e));
    }
    setPrevReceivedCount(receivedCount);
  }, [orders, prevReceivedCount]);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("utensils");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Addon form
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [addonCategoryIds, setAddonCategoryIds] = useState<string[]>([]);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  // Product form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState(categories[0]?.id || "frango");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formIsPromo, setFormIsPromo] = useState(false);
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formPromoExpiry, setFormPromoExpiry] = useState("");
  const [formPromoStock, setFormPromoStock] = useState("");
  const [formAddons, setFormAddons] = useState<string[]>([]);
  const [formKitItems, setFormKitItems] = useState<{productId: string, quantity: number}[]>([]);
  const [formIsMadeToOrder, setFormIsMadeToOrder] = useState(false);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formBrand, setFormBrand] = useState("");
  const [isNewBrand, setIsNewBrand] = useState(false);
  const [formIsCombo, setFormIsCombo] = useState(false);
  const [formComboSizes, setFormComboSizes] = useState<{name: string, price: number}[]>([]);
  const [formComboAddons, setFormComboAddons] = useState<{addonId: string, quantity: number, isFree?: boolean}[]>([]);

  // Loyalty form
  const [loyaltyData, setLoyaltyData] = useState<LoyaltySettings | null>(null);

  const loadLoyaltyData = async () => {
    const data = await fetchLoyaltySettings();
    setLoyaltyData(data);
  };

  const handleSaveLoyalty = async () => {
    if (loyaltyData) {
      await saveLoyaltySettings({
        ...loyaltyData,
        active: Boolean(loyaltyData.active) ? 1 : 0
      });
      alert("Configurações de fidelidade salvas com sucesso!");
    }
  };

  // Store settings form
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const loadStoreSettings = async () => {
    const data = await fetchStoreSettings();
    setStoreSettings(data);
  };

  const handleSaveStoreSettings = async () => {
    if (storeSettings) {
      await saveStoreSettings({
        ...storeSettings,
        has_delivery: Boolean(storeSettings.has_delivery) ? 1 : 0,
        has_table: Boolean(storeSettings.has_table) ? 1 : 0,
        has_pickup: Boolean(storeSettings.has_pickup) ? 1 : 0,
        accepts_pix: Boolean(storeSettings.accepts_pix) ? 1 : 0,
        accepts_cash: Boolean(storeSettings.accepts_cash) ? 1 : 0,
        accepts_card: Boolean(storeSettings.accepts_card) ? 1 : 0,
        is_open: Boolean(storeSettings.is_open) ? 1 : 0,
        delivery_fee: Number(storeSettings.delivery_fee) || 0,
        store_address: storeSettings.store_address,
        delivery_fee_per_km: Number(storeSettings.delivery_fee_per_km) || 0,
        delivery_fee_minimum: Number(storeSettings.delivery_fee_minimum) || 0
      });
      alert("Configurações da loja salvas com sucesso!");
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/");
  };

  // ── Product CRUD ──
  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormPrice("");
    setFormCategory(categories[0]?.id || "frango");
    setFormImages([]); setFormIsPromo(false); setFormOriginalPrice(""); setFormPromoExpiry(""); setFormPromoStock(""); setFormAddons([]);
    setFormIsCombo(false); setFormComboSizes([]); setFormComboAddons([]);
    setFormKitItems([]);
    setFormIsMadeToOrder(false); setFormBrand(""); setIsNewBrand(false);
    setFormIsPopular(false);
    setEditingProduct(null); setShowForm(false);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product); setFormName(product.name);
    setFormDesc(product.description); setFormPrice(product.price.toString());
    setFormCategory(product.category);
    setFormImages(product.images?.length ? product.images : (product.image ? [product.image] : []));
    setFormIsPromo(product.isPromo || false);
    setFormIsCombo(product.isCombo || false);
    setFormComboSizes(product.comboSizes || []);
    setFormComboAddons(product.comboAddons || []);
    setFormOriginalPrice(product.originalPrice ? product.originalPrice.toString() : "");
    setFormPromoExpiry(product.promoExpiry ? new Date(product.promoExpiry).toISOString().slice(0, 16) : "");
    setFormPromoStock(product.promoStock !== undefined && product.promoStock !== null ? product.promoStock.toString() : "");
    setFormAddons(product.addons.map((a) => a.id));
    setFormIsMadeToOrder(product.isMadeToOrder || false);
    setFormIsPopular(product.isPopular || false);
    setFormBrand(product.brand || "");
    setIsNewBrand(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    const selectedAddons: Addon[] = addons.filter((a) => formAddons.includes(a.id));
    const newProduct: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: formName, description: formDesc,
      price: parseFloat(formPrice) || 0, image: formImages[0] || "",
      images: formImages,
      category: formCategory, addons: selectedAddons,
      isPromo: formIsPromo,
      isCombo: formIsCombo,
      comboSizes: formIsCombo ? formComboSizes : undefined,
      comboAddons: formIsCombo ? formComboAddons : undefined,
      originalPrice: parseFloat(formOriginalPrice) || undefined,
      promoExpiry: formPromoExpiry ? new Date(formPromoExpiry).toISOString() : undefined,
      promoStock: formPromoStock !== "" ? parseInt(formPromoStock) : undefined,
      orderCount: editingProduct?.orderCount || 0,
      isMadeToOrder: formIsMadeToOrder,
      isPopular: formIsPopular,
      brand: formBrand,
    };
    try {
      if (editingProduct) {
        await API.put(`/products/${editingProduct.id}`, newProduct);
      } else {
        await API.post('/products', newProduct);
      }
    } catch (err) {
      // Fallback para localStorage
      const currentProducts = getProducts();
      if (editingProduct) {
        saveProducts(currentProducts.map(p => p.id === editingProduct.id ? newProduct : p));
      } else {
        saveProducts([...currentProducts, newProduct]);
      }
    }
    await refetchProducts();
    await refetchBrands();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      await API.del(`/products/${id}`);
      await refetchProducts();
    }
  };

  const togglePromo = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      await API.put(`/products/${id}`, { ...product, isPromo: !product.isPromo });
      await refetchProducts();
    }
  };

  // ── Category CRUD ──
  const resetCatForm = () => { setCatName(""); setCatIcon("utensils"); setEditingCat(null); setShowCatForm(false); };
  const openEditCat = (cat: Category) => { setEditingCat(cat); setCatName(cat.name); setCatIcon(cat.icon); setShowCatForm(true); };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    const id = editingCat?.id || catName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const newCat: Category = { id, name: catName.trim(), icon: catIcon };
    if (editingCat) {
      await API.put(`/categories/${editingCat.id}`, newCat);
    } else {
      await API.post('/categories', newCat);
    }
    await refetchCategories();
    resetCatForm();
  };

  const handleDeleteCat = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta seção?")) {
      await API.del(`/categories/${id}`);
      await refetchCategories();
    }
  };

  // ── Addon CRUD ──
  const resetAddonForm = () => { setAddonName(""); setAddonPrice(""); setAddonCategoryIds([]); setEditingAddon(null); setShowAddonForm(false); };
  const openEditAddon = (addon: Addon) => { setEditingAddon(addon); setAddonName(addon.name); setAddonPrice(addon.price.toString()); setAddonCategoryIds(addon.categoryIds); setShowAddonForm(true); };

  const handleSaveAddon = async () => {
    if (!addonName.trim() || !addonPrice) return;
    const id = editingAddon?.id || addonName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const newAddon: Addon = { id, name: addonName.trim(), price: parseFloat(addonPrice) || 0, categoryIds: addonCategoryIds };
    if (editingAddon) {
      await API.put(`/addons/${editingAddon.id}`, newAddon);
    } else {
      await API.post('/addons', newAddon);
    }
    await refetchAddons();
    resetAddonForm();
  };

  const handleDeleteAddon = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este adicional?")) {
      await API.del(`/addons/${id}`);
      await refetchAddons();
    }
  };

  // ── Order management ──
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus, extraData?: any) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.origin === 'ifood') {
      try {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        if (newStatus === 'confirmado') {
          await fetch(`${API_URL}/ifood/confirm/${orderId}`, { method: 'POST', headers, body: JSON.stringify({}) });
        } else if (newStatus === 'despachado') {
          await fetch(`${API_URL}/ifood/dispatch/${orderId}`, { method: 'POST', headers, body: JSON.stringify({}) });
        } else if (newStatus === 'cancelado') {
          await fetch(`${API_URL}/ifood/cancel/${orderId}`, { method: 'POST', headers, body: JSON.stringify({}) });
        }
      } catch (err) {
        console.error("Erro na API do iFood:", err);
      }
    }
    await API.put(`/orders/${orderId}/status`, { status: newStatus, ...extraData });
    await refetchOrders();
  };

  const handleBulkUpdate = async (newStatus: OrderStatus) => {
    const ordersToUpdate = filteredOrders.filter(o => o.status !== "cancelado" && o.status !== newStatus);
    if (ordersToUpdate.length === 0) {
      alert("Nenhum pedido válido para alterar nesta visualização.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja alterar ${ordersToUpdate.length} pedido(s) filtrado(s) para '${statusConfig[newStatus].label}'?\n\n(Pedidos cancelados serão ignorados).`)) return;

    setIsBulkUpdating(true);
    try {
      await Promise.all(ordersToUpdate.map(async o => {
        if (o.origin === 'ifood') {
          const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
          if (newStatus === 'confirmado') await fetch(`${API_URL}/ifood/confirm/${o.id}`, { method: 'POST', headers, body: JSON.stringify({}) }).catch(()=>{});
          else if (newStatus === 'despachado') await fetch(`${API_URL}/ifood/dispatch/${o.id}`, { method: 'POST', headers, body: JSON.stringify({}) }).catch(()=>{});
        }
        return API.put(`/orders/${o.id}/status`, { status: newStatus });
      }));
      await refetchOrders();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar pedidos em massa.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleSaveOrderEdit = async (orderId: string, data: any) => {
    await API.put(`/orders/${orderId}`, data);
    await refetchOrders();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este pedido permanentemente? Esta ação não pode ser desfeita.")) {
      await API.del(`/orders/${orderId}`);
      await refetchOrders();
    }
  };

  const handleSendConfirmation = (order: Order) => {
    const message = encodeURIComponent(
      `✅ *Pedido #${order.number} Confirmado!*\n\nOlá! Seu pedido foi aceito e está sendo preparado.\n\n📋 Itens:\n${order.items.map((i) => `• ${i.quantity}x ${i.productName}`).join("\n")}\n\n💰 Total: R$ ${order.total.toFixed(2).replace('.', ',')}\n\nObrigado pela preferência! 🍔`
    );
    window.open(`https://wa.me/55${order.customerWhatsApp}?text=${message}`, "_blank");
  };

  // Auto-print logic
  const lastPrintedOrderRef = useRef<number | null>(null);

  useEffect(() => {
    if (orders && orders.length > 0) {
      const highestId = Math.max(...orders.map(o => o.id || 0));
      
      // Initialize on first load without printing everything
      if (lastPrintedOrderRef.current === null) {
        lastPrintedOrderRef.current = highestId;
        return;
      }
      
      // If there are new orders, print them
      if (highestId > lastPrintedOrderRef.current) {
        const newOrders = orders.filter(o => (o.id || 0) > lastPrintedOrderRef.current!);
        newOrders.forEach(order => {
          if (order.status === 'novo' || order.status === 'recebido') {
            printOrder(order);
          }
        });
        lastPrintedOrderRef.current = highestId;
      }
    }
  }, [orders]);

  const handlePrintOrder = (order: Order) => {
    printOrder(order);
  };

  const refreshOrders = () => refetchOrders();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return isToday ? `Hoje, ${time}` : `${d.toLocaleDateString("pt-BR")}, ${time}`;
  };

  const filteredOrders = orders.filter((o) => {
    const orderDate = getLocalDateString(new Date(o.createdAt));
    if (orderDate !== selectedDate) return false;

    if (orderFilter !== "todos" && o.status !== orderFilter) return false;
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchName = o.customerName?.toLowerCase().includes(q);
      const matchPhone = o.customerWhatsApp?.includes(q);
      const matchAddress = o.address?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchAddress) return false;
    }
    return true;
  });

  const renderOrderList = (orderList: Order[]) => {
    if (orderList.length === 0) {
      return (
        <div className="text-center py-8 bg-card rounded-2xl border border-border/50">
          <ClipboardList size={32} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground text-sm">Nenhum pedido</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {orderList.map((order) => {
          const st = statusConfig[order.status];
          const StatusIcon = st.icon;
          const isExpanded = expandedOrder === order.id;
          const currentIdx = statusFlow.indexOf(order.status);
          const nextStatus = currentIdx >= 0 && currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

          // Elapsed time and borders
          const elapsedMins = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
          const isNew = elapsedMins < 5 && order.status === "recebido";
          const isDelayed = elapsedMins >= 30 && ["recebido", "confirmado", "preparando"].includes(order.status);
          
          let borderColorClass = "border-border";
          if (order.status === "recebido") borderColorClass = "border-l-blue-500 border-l-4";
          else if (order.status === "confirmado") borderColorClass = "border-l-cyan-500 border-l-4";
          else if (order.status === "preparando") borderColorClass = "border-l-amber-500 border-l-4";
          else if (order.status === "pronto") borderColorClass = "border-l-emerald-500 border-l-4";
          else if (order.status === "despachado") borderColorClass = "border-l-slate-500 border-l-4";
          else if (order.status === "entregue") borderColorClass = "border-l-border";
          else if (order.status === "cancelado") borderColorClass = "border-l-red-500 border-l-4";

          if (isDelayed) borderColorClass += " border-red-500 animate-pulse";

          return (
            <div key={order.id} className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${borderColorClass} transition-all`}>
              <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full p-4 text-left">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-primary">#{order.number}</span>
                      {order.origin === 'ifood' && (
                        <span className="ml-2 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">iFood</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-2">{formatDate(order.createdAt)}</span>
                    </div>
                    {order.origin === 'ifood' && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 opacity-80 select-all font-mono">
                        ID: {order.id}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${st.color}`}>
                    {isNew && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                    <StatusIcon size={12} /> {st.label}
                  </span>
                </div>
                {!isCompactView && (
                  <p className="text-sm text-foreground mb-1">{order.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}</p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-primary font-bold text-sm">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      👤 {order.customerName || "Não informado"}
                    </span>
                    {order.customerWhatsApp && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground opacity-80">
                          · 📱 {order.customerWhatsApp}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-green-600 hover:bg-green-600/10 ml-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/55${String(order.customerWhatsApp).replace(/\\D/g, '')}`, '_blank');
                          }}
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                  {elapsedMins > 0 && order.status !== "entregue" && order.status !== "cancelado" && (
                    <span className={`text-[10px] font-bold ${isDelayed ? 'text-red-500' : 'text-muted-foreground'}`}>
                      ⏳ {elapsedMins} min
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-3">
                  {/* Items */}
                  {order.items.map((item, i) => (
                    <div key={i} className="text-sm text-foreground">
                      <span className="font-medium">{item.quantity}x {item.productName}</span>
                      <span className="text-muted-foreground ml-1">R$ {(item.productPrice * item.quantity).toFixed(2).replace('.', ',')}</span>
                      {item.addons.length > 0 && (
                        <p className="text-xs text-muted-foreground ml-4">+ {item.addons.map((a) => `${a.quantity}x ${a.name}`).join(", ")}</p>
                      )}
                      {item.notes && <p className="text-xs text-muted-foreground ml-4 italic">"{item.notes}"</p>}
                    </div>
                  ))}

                  <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
                    <p>👤 **Cliente:** {order.customerName || "Não informado"}</p>
                    <p>🛒 **Tipo:** {order.consumeType}{order.address && ` · Endereço: ${order.address}`}{order.mesa && ` · Mesa: ${order.mesa}`}</p>
                    <p>💳 **Pagamento:** {order.paymentMethod}</p>
                    {order.customerCPF && <p>🪪 **CPF:** {order.customerCPF}</p>}
                    {order.deliveryFee > 0 && <p>🛵 **Taxa de Entrega:** R$ {order.deliveryFee.toFixed(2).replace('.', ',')}</p>}
                    {order.couponId && (
                      <p>🏷️ **Cupom Usado:** {coupons.find(c => c.id === order.couponId)?.code || order.couponId} (Desconto: R$ {order.discountAmount?.toFixed(2).replace('.', ',') || '0.00'})</p>
                    )}
                    {order.changeNeededFor !== undefined && order.changeNeededFor !== null && order.changeNeededFor > 0 && (
                      <p>💵 **Troco para:** R$ {order.changeNeededFor.toFixed(2).replace('.', ',')} (Troco a levar: R$ {(order.changeNeededFor - order.total).toFixed(2).replace('.', ',')})</p>
                    )}
                    {order.courierId && (
                      <p className="text-slate-600 font-medium">📦 **Entregador:** {couriers.find((c: any) => c.id === order.courierId)?.name || "Desconhecido"}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {order.status === "pronto" ? (
                      <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1 bg-muted/20">
                        <span className="text-xs text-muted-foreground font-medium">Despachar com:</span>
                        <select 
                          className="text-xs bg-transparent border-none focus:outline-none py-1 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleUpdateOrderStatus(order.id, "despachado", { courierId: Number(e.target.value) });
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Selecione um entregador</option>
                          {couriers.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : nextStatus && (
                      <button onClick={() => handleUpdateOrderStatus(order.id, nextStatus)}
                        className="bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={14} /> {statusConfig[nextStatus].label}
                      </button>
                    )}
                    {order.status === "recebido" && (
                      <button onClick={() => { handleUpdateOrderStatus(order.id, "confirmado"); handleSendConfirmation(order); }}
                        className="bg-secondary text-secondary-foreground text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                        <MessageCircle size={14} /> Confirmar & Notificar
                      </button>
                    )}
                    <button onClick={() => handlePrintOrder(order)}
                      className="bg-muted text-muted-foreground text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                      <Printer size={14} /> Imprimir
                    </button>
                    <button onClick={() => setEditingOrderForModal(order)}
                      className="bg-muted text-muted-foreground text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                      <Pencil size={14} /> Editar
                    </button>
                    {order.status !== "cancelado" && order.status !== "entregue" && (
                      <button onClick={() => handleUpdateOrderStatus(order.id, "cancelado")}
                        className="bg-destructive/10 text-destructive text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                        <XCircle size={14} /> Cancelar
                      </button>
                    )}
                    <button onClick={() => handleDeleteOrder(order.id)}
                      className="bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1 ml-auto">
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Login block removed since route is protected by App.tsx

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-lg p-2"><Settings size={20} /></div>
          <h1 className="text-xl font-display text-foreground">Tamires</h1>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
          <LogOut size={16} /> Sair
        </button>
      </header>

      <div className="flex border-b border-border bg-card overflow-x-auto">
        {[
          { key: "orders", label: "Pedidos", icon: ClipboardList },
          { key: "pdv", label: "PDV (Frente de Caixa)", icon: Store },
          { key: "couriers", label: "Entregadores", icon: Users },
          { key: "products", label: "Produtos", icon: Package },
          { key: "categories", label: "Seções", icon: LayoutGrid },
          { key: "addons", label: "Adicionais", icon: ListPlus },
          { key: "promos", label: "Promoções", icon: Star },
          { key: "loyalty", label: "Fidelidade", icon: Award },
          { key: "coupons", label: "Cupons", icon: Tag },
          { key: "expenses", label: "Despesas", icon: TrendingDown },
          { key: "reports", label: "Relatórios", icon: BarChart3 },
          { key: "settings", label: "Configurações", icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => {
            setActiveTab(key as typeof activeTab);
            if (key === "orders") refreshOrders();
            if (key === "loyalty" && !loyaltyData) loadLoyaltyData();
            if (key === "settings") loadStoreSettings();
          }}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors whitespace-nowrap px-3 ${activeTab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-7xl mx-auto w-full">
        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <h2 className="text-xl font-display text-foreground">Pedidos Recebidos</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-muted p-1 rounded-lg">
                  <button 
                    onClick={() => setViewLayout("kanban")} 
                    title="Visão Kanban"
                    className={`p-1.5 rounded-md transition-colors ${viewLayout === "kanban" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                    onClick={() => setViewLayout("list")} 
                    title="Lista Clássica"
                    className={`p-1.5 rounded-md transition-colors ${viewLayout === "list" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <ClipboardList size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => setIsCompactView(!isCompactView)} 
                  title={isCompactView ? "Ver Detalhes" : "Ocultar Detalhes"}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button 
                  onClick={() => setShowDashboardMetrics(!showDashboardMetrics)} 
                  title={showDashboardMetrics ? "Ocultar Métricas" : "Ver Métricas"}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BarChart3 size={16} />
                </button>
                <button 
                  onClick={refreshOrders} 
                  title="Atualizar Pedidos"
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary hover:text-primary transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Dashboard Metrics */}
            {showDashboardMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-center">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><TrendingDown size={14} className="rotate-180 text-green-500"/> Faturamento Hoje</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">
                    R$ {filteredOrders.filter(o => o.status === "entregue").reduce((acc, o) => acc + o.total, 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-center">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Package size={14} className="text-primary"/> Total de Pedidos</p>
                  <p className="text-xl md:text-2xl font-bold text-primary">{filteredOrders.length}</p>
                </div>
                <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-center">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500"/> Concluídos</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">
                    {filteredOrders.filter(o => o.status === "entregue").length}
                  </p>
                </div>
                <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col justify-center">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Clock size={14} className="text-orange-500"/> Em Andamento</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-500">
                    {filteredOrders.filter(o => !["entregue", "cancelado"].includes(o.status)).length}
                  </p>
                </div>
              </div>
            )}

            {/* Busca e Ações em Massa */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
               <input 
                 type="text" 
                 placeholder="Buscar por nome, telefone ou endereço..." 
                 value={orderSearchQuery}
                 onChange={e => setOrderSearchQuery(e.target.value)}
                 className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:ring-primary focus:border-primary outline-none transition-all"
               />
               <div className="flex gap-2">
                 <select 
                   className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground cursor-pointer focus:ring-primary outline-none"
                   onChange={(e) => {
                     if (e.target.value) {
                       handleBulkUpdate(e.target.value as OrderStatus);
                       e.target.value = ""; 
                     }
                   }}
                   disabled={isBulkUpdating}
                 >
                   <option value="">Ação em Massa (Todos da tela)...</option>
                   {statusFlow.map(s => (
                     <option key={s} value={s}>Mover filtrados para {statusConfig[s].label}</option>
                   ))}
                 </select>
               </div>
            </div>

            {/* Filter and Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-muted/20 p-4 rounded-xl border border-border">
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                {(["todos", ...statusFlow, "cancelado"] as (OrderStatus | "todos")[]).map((s) => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${orderFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                    {s === "todos" ? "Todos" : statusConfig[s].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-medium text-muted-foreground">Data:</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
            </div>

            {/* Layout Toggle Render */}
            {viewLayout === "list" ? (
              <div className="mt-2">
                {renderOrderList(filteredOrders)}
              </div>
            ) : (
              <div className="flex flex-nowrap lg:grid lg:grid-cols-3 gap-4 xl:gap-6 overflow-x-auto pb-4 snap-x">
                {/* PDV Column */}
                <div className="flex flex-col gap-3 min-w-[300px] sm:min-w-[350px] lg:min-w-0 shrink-0 snap-start">
                  <div className="bg-slate-700 text-white p-3 rounded-xl font-bold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={18} />
                      <span>PDV</span>
                    </div>
                    <span className="bg-black/20 text-white text-xs px-2.5 py-0.5 rounded-full">
                      {filteredOrders.filter(o => o.origin === 'pdv').length}
                    </span>
                  </div>
                  {renderOrderList(filteredOrders.filter(o => o.origin === 'pdv'))}
                </div>

                {/* iFood Column */}
                <div className="flex flex-col gap-3 min-w-[300px] sm:min-w-[350px] lg:min-w-0 shrink-0 snap-start">
                  <div className="bg-red-600 text-white p-3 rounded-xl font-bold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <Store size={18} />
                      <span>iFood</span>
                    </div>
                    <span className="bg-black/20 text-white text-xs px-2.5 py-0.5 rounded-full">
                      {filteredOrders.filter(o => o.origin === 'ifood').length}
                    </span>
                  </div>
                  {renderOrderList(filteredOrders.filter(o => o.origin === 'ifood'))}
                </div>

                {/* Site Column */}
                <div className="flex flex-col gap-3 min-w-[300px] sm:min-w-[350px] lg:min-w-0 shrink-0 snap-start">
                  <div className="bg-primary text-primary-foreground p-3 rounded-xl font-bold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <Package size={18} />
                      <span>Site / App</span>
                    </div>
                    <span className="bg-background/20 text-primary-foreground text-xs px-2.5 py-0.5 rounded-full">
                      {filteredOrders.filter(o => !o.origin || o.origin === 'delivery').length}
                    </span>
                  </div>
                  {renderOrderList(filteredOrders.filter(o => !o.origin || o.origin === 'delivery'))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === "products" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display text-foreground">Gerenciar Produtos</h2>
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                <Plus size={16} /> Novo
              </button>
            </div>

            {showForm && (
              <div className="bg-card rounded-xl shadow-card p-5 mb-4 space-y-3">
                <h3 className="font-semibold text-foreground">{editingProduct ? "Editar Produto" : "Novo Produto"}</h3>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descrição"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="Preço" type="number" step="0.01"
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  {!isNewBrand ? (
                    <select value={formBrand} onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setIsNewBrand(true);
                        setFormBrand("");
                      } else {
                        setFormBrand(e.target.value);
                      }
                    }}
                      className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Selecione uma Marca (Opcional)</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                      <option value="NEW" className="font-bold text-primary">+ Adicionar nova marca</option>
                    </select>
                  ) : (
                    <div className="flex w-full gap-2">
                      <input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} placeholder="Nova Marca"
                        className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button type="button" onClick={() => { setIsNewBrand(false); setFormBrand(""); }} className="p-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Upload de Imagens */}
                <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Imagens do Produto ({formImages.length}/7)</label>
                    <label className={`text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${formImages.length >= 7 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={formImages.length >= 7}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;

                          const remainingSlots = 7 - formImages.length;
                          const filesToProcess = files.slice(0, remainingSlots);

                          filesToProcess.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX_WIDTH = 800;
                                  const MAX_HEIGHT = 800;
                                  let width = img.width;
                                  let height = img.height;

                                  if (width > height) {
                                    if (width > MAX_WIDTH) {
                                      height *= MAX_WIDTH / width;
                                      width = MAX_WIDTH;
                                    }
                                  } else {
                                    if (height > MAX_HEIGHT) {
                                      width *= MAX_HEIGHT / height;
                                      height = MAX_HEIGHT;
                                    }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  ctx?.drawImage(img, 0, 0, width, height);
                                  setFormImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.6)]);
                                };
                                img.src = ev.target.result as string;
                              }
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = ""; // reset input
                        }}
                      />
                      Adicionar Fotos
                    </label>
                  </div>

                  {formImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formImages.map((img, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-border group">
                          <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">A primeira imagem será a foto principal. Máximo de 7 imagens.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Adicionais</label>
                  <div className="flex flex-wrap gap-2">
                    {addons.map((addon) => (
                      <button key={addon.id} type="button"
                        onClick={() => setFormAddons((prev) => prev.includes(addon.id) ? prev.filter((a) => a !== addon.id) : [...prev, addon.id])}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${formAddons.includes(addon.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>{addon.name}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-4 border-t border-border pt-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <input type="checkbox" checked={formIsCombo} onChange={(e) => setFormIsCombo(e.target.checked)} className="accent-primary" />
                    É um Combinado (Combo)?
                  </label>
                  {formIsCombo && (
                    <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-4 mt-2">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Tamanhos Disponíveis (Ex: 300ml, 400ml)</label>
                        {formComboSizes.map((size, idx) => (
                          <div key={idx} className="flex gap-2 mb-2">
                            <input type="text" value={size.name} onChange={(e) => {
                              const newSizes = [...formComboSizes];
                              newSizes[idx].name = e.target.value;
                              setFormComboSizes(newSizes);
                            }} placeholder="Tamanho" className="w-1/2 border border-border rounded-lg p-2 text-sm bg-background text-foreground" />
                            <input type="number" step="0.01" value={size.price || ""} onChange={(e) => {
                              const newSizes = [...formComboSizes];
                              newSizes[idx].price = parseFloat(e.target.value) || 0;
                              setFormComboSizes(newSizes);
                            }} placeholder="Preço (R$)" className="w-1/2 border border-border rounded-lg p-2 text-sm bg-background text-foreground" />
                            <button type="button" onClick={() => setFormComboSizes(prev => prev.filter((_, i) => i !== idx))} className="bg-destructive/10 text-destructive p-2 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setFormComboSizes(prev => [...prev, { name: "", price: 0 }])} className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                          <Plus size={14} /> Adicionar Tamanho
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Adicionais Padrão (Gratuitos no Combo)</label>
                        <p className="text-xs text-muted-foreground mb-3">O cliente poderá desmarcar estes itens ou adicionar outros extras que serão cobrados separadamente.</p>
                        <div className="flex flex-wrap gap-2">
                          {addons.map((addon) => {
                            const isSelected = formComboAddons.some(a => a.addonId === addon.id);
                            return (
                              <button key={`combo-addon-${addon.id}`} type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setFormComboAddons(prev => prev.filter(a => a.addonId !== addon.id));
                                  } else {
                                    setFormComboAddons(prev => [...prev, { addonId: addon.id, quantity: 1, isFree: true }]);
                                  }
                                }}
                                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${isSelected ? "bg-primary text-primary-foreground border border-primary" : "bg-muted text-muted-foreground border border-border hover:border-primary/50"}`}
                              >
                                {isSelected && <CheckCircle2 size={12} />} {addon.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 mt-4 border-t border-border pt-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={formIsPopular} onChange={(e) => setFormIsPopular(e.target.checked)} className="accent-primary" />
                    Destacar em "Mais Pedidos"
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={formIsPromo} onChange={(e) => setFormIsPromo(e.target.checked)} className="accent-primary" />
                    Ativar como promoção
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={formIsMadeToOrder} onChange={(e) => setFormIsMadeToOrder(e.target.checked)} className="accent-primary" />
                    Esgotado / Apenas Sob Encomenda (Redireciona para o WhatsApp)
                  </label>
                </div>
                {formIsPromo && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-3 mt-2">
                    <label className="block text-sm font-medium text-foreground">Configurações da Promoção (Opcionais)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Preço na Promoção (Por R$)</label>
                        <input value={formOriginalPrice} onChange={(e) => setFormOriginalPrice(e.target.value)} placeholder="0.00" type="number" step="0.01"
                          className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Validade (Expira em)</label>
                        <input value={formPromoExpiry} onChange={(e) => setFormPromoExpiry(e.target.value)} type="datetime-local"
                          className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground block mb-1">Estoque da Promoção (Qtd de itens)</label>
                        <input value={formPromoStock} onChange={(e) => setFormPromoStock(e.target.value)} placeholder="Ex: 5" type="number" step="1"
                          className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleSave} className="bg-primary text-primary-foreground text-sm font-medium px-6 py-2 rounded-lg">Salvar</button>
                  <button onClick={resetForm} className="bg-muted text-muted-foreground text-sm font-medium px-6 py-2 rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="bg-card rounded-lg shadow-card p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-foreground">{product.name}</h4>
                      {product.isPromo && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">PROMO</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <span className="text-sm font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded inline-block mt-1">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(product)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg bg-muted text-destructive"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === "categories" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display text-foreground">Gerenciar Seções</h2>
              <button onClick={() => { resetCatForm(); setShowCatForm(true); }}
                className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                <Plus size={16} /> Nova Seção
              </button>
            </div>

            {showCatForm && (
              <div className="bg-card rounded-xl shadow-card p-5 mb-4 space-y-3">
                <h3 className="font-semibold text-foreground">{editingCat ? "Editar Seção" : "Nova Seção"}</h3>
                <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nome da seção (ex: Pizzas)"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {availableIcons.map((icon) => (
                      <button key={icon.id} type="button" onClick={() => setCatIcon(icon.id)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${catIcon === icon.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {icon.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveCat} className="bg-primary text-primary-foreground text-sm font-medium px-6 py-2 rounded-lg">Salvar</button>
                  <button onClick={resetCatForm} className="bg-muted text-muted-foreground text-sm font-medium px-6 py-2 rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-card rounded-lg shadow-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{cat.icon}</span>
                    <h4 className="font-semibold text-sm text-foreground">{cat.name}</h4>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditCat(cat)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                    <button onClick={() => handleDeleteCat(cat.id)} className="p-2 rounded-lg bg-muted text-destructive"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ADDONS TAB ── */}
        {activeTab === "addons" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display text-foreground">Gerenciar Adicionais</h2>
              <button onClick={() => { resetAddonForm(); setShowAddonForm(true); }}
                className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1">
                <Plus size={16} /> Novo Adicional
              </button>
            </div>

            {showAddonForm && (
              <div className="bg-card rounded-xl shadow-card p-5 mb-4 space-y-3">
                <h3 className="font-semibold text-foreground">{editingAddon ? "Editar Adicional" : "Novo Adicional"}</h3>
                <input value={addonName} onChange={(e) => setAddonName(e.target.value)} placeholder="Nome do adicional (ex: Bacon Extra)"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={addonPrice} onChange={(e) => setAddonPrice(e.target.value)} placeholder="Preço (ex: 4.00)" type="number" step="0.01"
                  className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Seções onde este adicional estará disponível</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button key={cat.id} type="button"
                        onClick={() => setAddonCategoryIds((prev) => prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id])}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${addonCategoryIds.includes(cat.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>{cat.name}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveAddon} className="bg-primary text-primary-foreground text-sm font-medium px-6 py-2 rounded-lg">Salvar</button>
                  <button onClick={resetAddonForm} className="bg-muted text-muted-foreground text-sm font-medium px-6 py-2 rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {addons.map((addon) => (
                <div key={addon.id} className="bg-card rounded-lg shadow-card p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{addon.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      R$ {addon.price.toFixed(2).replace('.', ',')} · {addon.categoryIds.map((cid) => categories.find((c) => c.id === cid)?.name || cid).join(", ")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditAddon(addon)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                    <button onClick={() => handleDeleteAddon(addon.id)} className="p-2 rounded-lg bg-muted text-destructive"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PROMOS TAB ── */}
        {activeTab === "promos" && (
          <>
            <h2 className="text-xl font-display text-foreground mb-4">Gerenciar Promoções</h2>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="bg-card rounded-lg shadow-card p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{product.name}</h4>
                    <span className="text-xs text-muted-foreground">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <button onClick={() => togglePromo(product.id)}
                    className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${product.isPromo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>{product.isPromo ? "Ativo" : "Inativo"}</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── LOYALTY TAB ── */}
        {activeTab === "loyalty" && loyaltyData && (
          <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
            <div>
              <h2 className="text-xl font-display text-foreground mb-1">Configurar Fidelidade</h2>
              <p className="text-sm text-muted-foreground">Defina as regras de acúmulo e resgate de pontos para seus clientes.</p>
            </div>

            <label className="flex items-center gap-3 p-4 border border-primary/20 bg-primary/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(loyaltyData.active)}
                onChange={(e) => setLoyaltyData({ ...loyaltyData, active: e.target.checked })}
                className="w-5 h-5 accent-primary rounded"
              />
              <div>
                <span className="block font-semibold text-foreground">Sistema Ativo</span>
                <span className="text-xs text-muted-foreground">Ativar e mostrar programa de fidelidade para clientes</span>
              </div>
            </label>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Regra de Acúmulo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Valor gasto (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={loyaltyData.spent_amount}
                    onChange={(e) => setLoyaltyData({ ...loyaltyData, spent_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Ex: A cada R$ 1.00 pago.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Ganha pontos (Qtd)</label>
                  <input
                    type="number"
                    value={loyaltyData.points_earned}
                    onChange={(e) => setLoyaltyData({ ...loyaltyData, points_earned: parseInt(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Ex: Ganha 1 ponto.</p>
                </div>
              </div>

              <h3 className="font-semibold text-foreground border-b border-border pb-2 pt-4">Regra de Resgate</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">A cada pontos (Qtd)</label>
                  <input
                    type="number"
                    value={loyaltyData.points_for_discount}
                    onChange={(e) => setLoyaltyData({ ...loyaltyData, points_for_discount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Ex: A cada 10 pontos de saldo.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Ganha Desconto (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={loyaltyData.discount_amount}
                    onChange={(e) => setLoyaltyData({ ...loyaltyData, discount_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Ex: Abate R$ 1.00 no carrinho.</p>
                </div>
              </div>
            </div>

            <button onClick={handleSaveLoyalty} className="w-full bg-primary text-primary-foreground font-semibold py-3 flex items-center justify-center gap-2 rounded-xl mt-4">
              Salvar Configurações
            </button>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && storeSettings && (
          <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
            <div>
              <h2 className="text-xl font-display text-foreground mb-1">Configurações Gerais da Loja</h2>
              <p className="text-sm text-muted-foreground">Gerencie o funcionamento básico da doceria, como taxas, horários e formas de pagamento.</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Status da Loja</h3>
              <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(storeSettings.is_open)}
                  onChange={(e) => setStoreSettings({ ...storeSettings, is_open: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 accent-primary rounded"
                />
                <div>
                  <span className="block text-sm font-semibold text-foreground">Loja Aberta para Pedidos</span>
                  <span className="text-xs text-muted-foreground font-normal">Se desmarcado, os clientes não poderão finalizar pedidos.</span>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Canais de Consumo</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings.has_delivery)}
                    onChange={(e) => setStoreSettings({ ...storeSettings, has_delivery: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-foreground">Entrega</span>
                    <span className="text-xs text-muted-foreground font-normal">Permite pedidos para entrega em domicílio</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings.has_pickup)}
                    onChange={(e) => setStoreSettings({ ...storeSettings, has_pickup: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-foreground">Retirada</span>
                    <span className="text-xs text-muted-foreground font-normal">Permite que o cliente retire o pedido no local</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings.has_table)}
                    onChange={(e) => setStoreSettings({ ...storeSettings, has_table: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-foreground">Mesa (Consumo Local)</span>
                    <span className="text-xs text-muted-foreground font-normal">Permite pedidos para consumo no estabelecimento informando o número da mesa</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Formas de Pagamento Aceitas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-semibold text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings.accepts_pix)}
                    onChange={(e) => setStoreSettings({ ...storeSettings, accepts_pix: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <span>Pix</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-semibold text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings.accepts_cash)}
                    onChange={(e) => setStoreSettings({ ...storeSettings, accepts_cash: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <span>Dinheiro</span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/10 transition-colors font-semibold text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings.accepts_card)}
                    onChange={(e) => setStoreSettings({ ...storeSettings, accepts_card: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-primary rounded"
                  />
                  <span>Cartão (Crédito/Débito)</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Taxas, Endereço e Horários</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Taxa de Entrega Fixa (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={storeSettings.delivery_fee}
                    onChange={(e) => setStoreSettings({ ...storeSettings, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Opcional. Substituída se calcular por Km.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Taxa por Km (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={storeSettings.delivery_fee_per_km || ""}
                    onChange={(e) => setStoreSettings({ ...storeSettings, delivery_fee_per_km: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Cálculo dinâmico baseado na distância.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Taxa Mínima (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={storeSettings.delivery_fee_minimum || ""}
                    onChange={(e) => setStoreSettings({ ...storeSettings, delivery_fee_minimum: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Valor mínimo a ser cobrado na entrega por Km.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Endereço Base da Loja (ou CEP)</label>
                  <input
                    type="text" placeholder="Ex: 01001-000 ou Rua X, 123"
                    value={storeSettings.store_address || ""}
                    onChange={(e) => setStoreSettings({ ...storeSettings, store_address: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Horário de Abertura</label>
                  <input
                    type="text" placeholder="10:00"
                    value={storeSettings.opening_time}
                    onChange={(e) => setStoreSettings({ ...storeSettings, opening_time: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Horário de Fechamento</label>
                  <input
                    type="text" placeholder="22:00"
                    value={storeSettings.closing_time}
                    onChange={(e) => setStoreSettings({ ...storeSettings, closing_time: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <label className="text-sm font-medium text-foreground mb-1 block">Aviso de Entrega</label>
                  <input
                    type="text" placeholder="Ex: Entregas apenas após as 14:00 (Deixe em branco para não exibir)"
                    value={storeSettings.delivery_info_text || ""}
                    onChange={(e) => setStoreSettings({ ...storeSettings, delivery_info_text: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            <button onClick={handleSaveStoreSettings} className="w-full bg-primary text-primary-foreground font-semibold py-3 flex items-center justify-center gap-2 rounded-xl mt-4">
              Salvar Configurações Gerais
            </button>
          </div>
        )}

        {/* ── COUPONS TAB ── */}
        {activeTab === "coupons" && (
          <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
            <AdminCoupons />
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === "reports" && (
          <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
            <AdminReports />
          </div>
        )}
        {activeTab === "couriers" && <AdminCouriers />}
        {activeTab === "pdv" && <AdminPDV />}
        {activeTab === "expenses" && (
          <div className="bg-card rounded-xl shadow-card p-6">
            <AdminExpenses />
          </div>
        )}
      </div>
      <EditOrderModal
        isOpen={editingOrderForModal !== null}
        onClose={() => setEditingOrderForModal(null)}
        order={editingOrderForModal}
        products={products}
        onSave={handleSaveOrderEdit}
      />
    </div>
  );
}

