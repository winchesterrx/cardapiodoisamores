import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchCoupons, API_URL } from "@/data/menuData";
import { useAuth } from "@/contexts/AuthContext";
import type { Order, Coupon } from "@/data/menuData";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Calendar, Ticket,
  Percent, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Clock,
  Award, Star, Target, Download, AlertCircle, Bike, Printer, ChevronDown, CheckCircle2, Package
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
  AreaChart, Area, ComposedChart, ReferenceLine
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const EXPENSE_CATEGORIES = [
  { id: "materia-prima", label: "Matéria-Prima", color: "#10b981", icon: "🥤" },
  { id: "embalagem", label: "Embalagem", color: "#3b82f6", icon: "📦" },
  { id: "utensilios", label: "Utensílios", color: "#f59e0b", icon: "🥄" },
  { id: "higiene", label: "Higiene/Limpeza", color: "#8b5cf6", icon: "🧴" },
  { id: "marketing", label: "Marketing", color: "#ec4899", icon: "📢" },
  { id: "energia", label: "Energia/Água", color: "#14b8a6", icon: "⚡" },
  { id: "outros", label: "Outros", color: "#64748b", icon: "📋" },
];

// ─── Helper Types ─────────────────────────────────────────────────────────────

interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  note_ref: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) { return `R$ ${Number(v).toFixed(2)}`; }

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function dayOfWeekKey(iso: string) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days[new Date(iso).getDay()];
}

function hourKey(iso: string) { return new Date(iso).getHours(); }

function getTrendIcon(change: number) {
  if (change > 0) return <ArrowUpRight size={14} className="text-emerald-500" />;
  if (change < 0) return <ArrowDownRight size={14} className="text-rose-500" />;
  return null;
}

function exportOrdersCSV(orders: Order[]) {
  const header = "Número,Data,Cliente,WhatsApp,Status,Forma Pagamento,Total\n";
  const rows = orders.map(o =>
    `${o.number},${new Date(o.createdAt).toLocaleDateString("pt-BR")},"${o.customerName}",${o.customerWhatsApp},${o.status},${o.paymentMethod || ""},${o.total}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `relatorio_vendas_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`;
  a.click();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminReports() {
  const { token } = useAuth();
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const { data: coupons = [] } = useQuery({ queryKey: ["coupons"], queryFn: fetchCoupons });

  const [datePreset, setDatePreset] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // ─── Date Range ──────────────────────────────────────────────────────────────

  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (datePreset === "today") { start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); }
    else if (datePreset === "yesterday") { start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0); end = new Date(start); end.setHours(23, 59, 59, 999); }
    else if (datePreset === "7d") { start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); }
    else if (datePreset === "30d") { start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); }
    else if (datePreset === "this_month") { start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); end.setHours(23, 59, 59, 999); }
    else if (datePreset === "last_month") { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); }
    else if (datePreset === "custom") {
      if (customStart) start = new Date(customStart + "T00:00:00");
      if (customEnd) end = new Date(customEnd + "T23:59:59.999");
    }
    return { start, end };
  }, [datePreset, customStart, customEnd]);

  // Previous period (same duration) for comparison
  const prevRange = useMemo(() => {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return { start: new Date(dateRange.start.getTime() - duration), end: new Date(dateRange.start.getTime() - 1) };
  }, [dateRange]);

  // ─── Fetch Expenses ───────────────────────────────────────────────────────────

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["expenses", dateRange.start.toISOString().split("T")[0], dateRange.end.toISOString().split("T")[0]],
    queryFn: async () => {
      const s = dateRange.start.toISOString().split("T")[0];
      const e = dateRange.end.toISOString().split("T")[0];
      const res = await fetch(`${API_URL}/expenses?start=${s}&end=${e}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: prevExpenses = [] } = useQuery<Expense[]>({
    queryKey: ["expenses", prevRange.start.toISOString().split("T")[0], prevRange.end.toISOString().split("T")[0]],
    queryFn: async () => {
      const s = prevRange.start.toISOString().split("T")[0];
      const e = prevRange.end.toISOString().split("T")[0];
      const res = await fetch(`${API_URL}/expenses?start=${s}&end=${e}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    }
  });

  // ─── Filtered Orders ──────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() =>
    orders.filter(o => { const d = new Date(o.createdAt); return d >= dateRange.start && d <= dateRange.end; }),
    [orders, dateRange]
  );

  const prevOrders = useMemo(() =>
    orders.filter(o => { const d = new Date(o.createdAt); return d >= prevRange.start && d <= prevRange.end; }),
    [orders, prevRange]
  );

  // ─── Core Metrics ─────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const completedOrders = filteredOrders.filter(o => o.status !== "cancelado");
    let totalRevenue = 0, totalDiscounts = 0, totalDeliveryFees = 0;
    const paymentCounts: Record<string, number> = {};
    const consumeCounts: Record<string, number> = {};
    const productStats: Record<string, { qty: number; revenue: number }> = {};
    const addonStats: Record<string, { qty: number; revenue: number }> = {};
    const customerStats: Record<string, { name: string; phone: string; count: number; total: number; lastOrder: string }> = {};
    const couponStats: Record<string, { code: string; count: number; discountGiven: number; revenueGenerated: number }> = {};
    const dailyRevenue: Record<string, number> = {};
    const dailyOrders: Record<string, number> = {};
    const hourlyRevenue: Record<number, number> = {};
    const weekdayRevenue: Record<string, number> = {};

    completedOrders.forEach(order => {
      const deliveryFee = order.deliveryFee || 0;
      const orderRevenue = order.total - deliveryFee;

      totalRevenue += orderRevenue;
      totalDeliveryFees += deliveryFee;
      totalDiscounts += (order.discountAmount || 0);

      const dk = dayKey(order.createdAt);
      dailyRevenue[dk] = (dailyRevenue[dk] || 0) + orderRevenue;
      dailyOrders[dk] = (dailyOrders[dk] || 0) + 1;

      const hk = hourKey(order.createdAt);
      hourlyRevenue[hk] = (hourlyRevenue[hk] || 0) + orderRevenue;

      const wk = dayOfWeekKey(order.createdAt);
      weekdayRevenue[wk] = (weekdayRevenue[wk] || 0) + orderRevenue;

      const pm = order.paymentMethod || "Não informado";
      paymentCounts[pm] = (paymentCounts[pm] || 0) + 1;

      const cm = order.consumeType || "Não informado";
      consumeCounts[cm] = (consumeCounts[cm] || 0) + 1;

      order.items.forEach(item => {
        if (!productStats[item.productName]) productStats[item.productName] = { qty: 0, revenue: 0 };
        productStats[item.productName].qty += item.quantity;
        let itemPrice = item.productPrice * item.quantity;
        if (item.addons) {
          item.addons.forEach(a => {
            itemPrice += a.price * a.quantity;
            const key = a.name;
            if (!addonStats[key]) addonStats[key] = { qty: 0, revenue: 0 };
            addonStats[key].qty += a.quantity;
            addonStats[key].revenue += a.price * a.quantity;
          });
        }
        productStats[item.productName].revenue += itemPrice;
      });

      const customerIdKey = order.customerWhatsApp ? order.customerWhatsApp : (order.customerName || "Desconhecido").trim().toLowerCase();
      if (!customerStats[customerIdKey]) {
        customerStats[customerIdKey] = { 
          name: order.customerName || "Desconhecido", 
          phone: order.customerWhatsApp || "Sem Número", 
          count: 0, 
          total: 0, 
          lastOrder: order.createdAt 
        };
      }
      customerStats[customerIdKey].count += 1;
      customerStats[customerIdKey].total += order.total;
      if (new Date(order.createdAt) > new Date(customerStats[customerIdKey].lastOrder)) customerStats[customerIdKey].lastOrder = order.createdAt;

      if (order.couponId) {
        const cid = String(order.couponId);
        if (!couponStats[cid]) {
          const cObj = coupons.find(c => String(c.id) === cid);
          couponStats[cid] = { code: cObj ? cObj.code : `#${cid}`, count: 0, discountGiven: 0, revenueGenerated: 0 };
        }
        couponStats[cid].count += 1;
        couponStats[cid].discountGiven += (order.discountAmount || 0);
        couponStats[cid].revenueGenerated += orderRevenue;
      }
    });

    const averageTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const cancelledCount = filteredOrders.length - completedOrders.length;

    // Sort daily
    const chartData = Object.entries(dailyRevenue).map(([date, total]) => ({
      date, total, orders: dailyOrders[date] || 0
    })).sort((a, b) => { const [d1, m1] = a.date.split("/"); const [d2, m2] = b.date.split("/"); return m1 !== m2 ? +m1 - +m2 : +d1 - +d2; });

    // Hourly
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({
      hour: h < 10 ? `${h}h` : `${h}h`, revenue: hourlyRevenue[h] || 0, count: 0
    }));

    // Weekday
    const weekOrder = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const weekdayData = weekOrder.map(d => ({ day: d, revenue: weekdayRevenue[d] || 0 }));

    // Products
    const topProducts = Object.entries(productStats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
    const topAddons = Object.entries(addonStats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.qty - a.qty);
    const topCustomers = Object.values(customerStats).sort((a, b) => b.total - a.total);
    const topCoupons = Object.values(couponStats).sort((a, b) => b.count - a.count);
    const piePaymentData = Object.entries(paymentCounts).map(([name, value]) => ({ name, value }));
    const pieConsumeData = Object.entries(consumeCounts).map(([name, value]) => ({ name, value }));

    return {
      totalRevenue, totalOrders: completedOrders.length, averageTicket, totalDiscounts, cancelledCount, totalDeliveryFees,
      chartData, hourlyData, weekdayData,
      topProducts, topAddons, topCustomers, topCoupons, piePaymentData, pieConsumeData
    };
  }, [filteredOrders, coupons]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const lucroLiquido = metrics.totalRevenue - totalExpenses;
  const margemLucro = metrics.totalRevenue > 0 ? (lucroLiquido / metrics.totalRevenue * 100) : 0;

  // Previous period comparisons
  const prevRevenue = prevOrders.filter(o => o.status !== "cancelado").reduce((s, o) => s + (o.total - (o.deliveryFee || 0)), 0);
  const prevExpensesTotal = prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevLucro = prevRevenue - prevExpensesTotal;

  const revenueChange = prevRevenue > 0 ? ((metrics.totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
  const lucroChange = prevLucro !== 0 ? ((lucroLiquido - prevLucro) / Math.abs(prevLucro) * 100) : 0;
  const ordersChange = prevOrders.length > 0 ? ((metrics.totalOrders - prevOrders.length) / prevOrders.length * 100) : 0;
  const ticketChange = prevOrders.length > 0 ? ((metrics.averageTicket - (prevRevenue / prevOrders.length)) / (prevRevenue / prevOrders.length) * 100) : 0;

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category || c.label === e.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
      map[cat.id] = (map[cat.id] || 0) + Number(e.amount);
    });
    return EXPENSE_CATEGORIES.map(c => ({ ...c, total: map[c.id] || 0 })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Combined daily chart
  const combinedChartData = useMemo(() => {
    const revMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    metrics.chartData.forEach(d => { revMap[d.date] = d.total; });
    expenses.forEach(e => {
      const dk = dayKey(e.date + "T12:00:00");
      expMap[dk] = (expMap[dk] || 0) + Number(e.amount);
    });
    const allKeys = Array.from(new Set([...Object.keys(revMap), ...Object.keys(expMap)])).sort((a, b) => {
      const [d1, m1] = a.split("/"); const [d2, m2] = b.split("/");
      return m1 !== m2 ? +m1 - +m2 : +d1 - +d2;
    });
    return allKeys.map(k => ({
      date: k,
      receita: revMap[k] || 0,
      despesa: expMap[k] || 0,
      lucro: (revMap[k] || 0) - (expMap[k] || 0)
    }));
  }, [metrics.chartData, expenses]);

  // ─── Date Preset Buttons ──────────────────────────────────────────────────────

  const presets = [
    { key: "today", label: "Hoje" },
    { key: "yesterday", label: "Ontem" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "this_month", label: "Este Mês" },
    { key: "last_month", label: "Mês Passado" },
    { key: "custom", label: "Personalizado" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard de Relatórios</h2>
            <p className="text-sm text-muted-foreground">Visão analítica completa das suas finanças</p>
          </div>
        </div>
        <button onClick={() => exportOrdersCSV(filteredOrders)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground border border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors">
          <Download size={15} /> Exportar Pedidos CSV
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button key={p.key} onClick={() => setDatePreset(p.key)}
              className={`flex items-center gap-1 px-4 py-2 text-sm rounded-xl font-medium transition-colors ${datePreset === p.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {p.key === "custom" && <Calendar size={13} />} {p.label}
            </button>
          ))}
        </div>
        {datePreset === "custom" && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <span className="text-muted-foreground text-sm">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[
          { label: "Receita Bruta", value: fmt(metrics.totalRevenue), change: revenueChange, icon: <DollarSign size={18}/>, color: "emerald" },
          { label: "Taxas de Entrega", value: fmt(metrics.totalDeliveryFees), change: 0, icon: <Bike size={18}/>, color: "blue" },
          { label: "Lucro Líquido", value: fmt(lucroLiquido), change: lucroChange, icon: <Wallet size={18}/>, color: lucroLiquido >= 0 ? "blue" : "rose" },
          { label: "Total Pedidos", value: String(metrics.totalOrders), change: ordersChange, icon: <ShoppingBag size={18}/>, color: "purple" },
          { label: "Ticket Médio", value: fmt(metrics.averageTicket), change: ticketChange, icon: <TrendingUp size={18}/>, color: "amber" },
          { label: "Total Despesas", value: fmt(totalExpenses), change: 0, icon: <TrendingDown size={18}/>, color: "rose" },
          { label: "Margem de Lucro", value: `${margemLucro.toFixed(1)}%`, change: 0, icon: <Target size={18}/>, color: margemLucro >= 30 ? "emerald" : margemLucro >= 15 ? "amber" : "rose" },
          { label: "Cancelados", value: String(metrics.cancelledCount), change: 0, icon: <AlertCircle size={18}/>, color: "slate" },
          { label: "Descontos Dados", value: fmt(metrics.totalDiscounts), change: 0, icon: <Percent size={18}/>, color: "orange" },
        ].map((kpi, i) => {
          const colorMap: Record<string, string> = {
            emerald: "bg-emerald-500/10 text-emerald-500",
            blue: "bg-blue-500/10 text-blue-500",
            purple: "bg-purple-500/10 text-purple-500",
            amber: "bg-amber-500/10 text-amber-600",
            rose: "bg-rose-500/10 text-rose-500",
            orange: "bg-orange-500/10 text-orange-500",
            slate: "bg-slate-500/10 text-slate-500",
          };
          return (
            <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-muted-foreground font-medium leading-snug">{kpi.label}</p>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${colorMap[kpi.color]}`}>{kpi.icon}</div>
              </div>
              <p className="text-2xl font-bold text-foreground leading-tight">{kpi.value}</p>
              {kpi.change !== 0 && (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${kpi.change > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {getTrendIcon(kpi.change)}
                  {Math.abs(kpi.change).toFixed(1)}% vs período anterior
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full overflow-x-auto bg-muted/50 p-1 mb-6 rounded-2xl gap-1 h-auto">
          {[
            { value: "overview", label: "Visão Geral" },
            { value: "financeiro", label: "Financeiro" },
            { value: "products", label: "Produtos" },
            { value: "timing", label: "Horários" },
            { value: "customers", label: "Clientes" },
            { value: "coupons", label: "Cupons" },
            { value: "couriers", label: "Entregadores" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-xl whitespace-nowrap text-xs font-medium flex-1">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* ══ TAB: VISÃO GERAL ══ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue line chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-1">Evolução da Receita</h3>
            <p className="text-xs text-muted-foreground mb-5">Faturamento diário no período selecionado</p>
            <div className="h-[300px]">
              {metrics.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.chartData}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmt(v), name === "total" ? "Receita" : "Pedidos"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }} />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fill="url(#gradRevenue)" dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados no período.</div>}
            </div>
          </div>

          {/* Payment + Consume Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Formas de Pagamento", data: metrics.piePaymentData },
              { title: "Tipos de Consumo", data: metrics.pieConsumeData },
            ].map(({ title, data }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold text-foreground mb-4">{title}</h3>
                <div className="h-[220px]">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => [`${v} pedidos`, ""]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "10px", border: "1px solid hsl(var(--border))" }} />
                        <Legend iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados.</div>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ══ TAB: FINANCEIRO ══ */}
        <TabsContent value="financeiro" className="space-y-6">

          {/* Profit summary highlight */}
          <div className={`rounded-2xl p-5 border-2 ${lucroLiquido >= 0 ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30"}`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Resultado do Período</p>
                <p className={`text-4xl font-black mt-1 ${lucroLiquido >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmt(lucroLiquido)}</p>
                <p className="text-sm text-muted-foreground mt-1">Margem de lucro: <strong>{margemLucro.toFixed(1)}%</strong></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Receita", value: fmt(metrics.totalRevenue), color: "text-emerald-600" },
                  { label: "Despesas", value: fmt(totalExpenses), color: "text-rose-500" },
                  { label: "Descontos", value: fmt(metrics.totalDiscounts), color: "text-orange-500" },
                  { label: "Margem", value: `${margemLucro.toFixed(1)}%`, color: margemLucro >= 0 ? "text-blue-500" : "text-rose-500" },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Combined chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-1">Receita × Despesa × Lucro por Dia</h3>
            <p className="text-xs text-muted-foreground mb-5">Visualize a saúde financeira diária do negócio</p>
            <div className="h-[300px]">
              {combinedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(v: number, name: string) => [fmt(v), name === "receita" ? "Receita" : name === "despesa" ? "Despesa" : "Lucro"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }} />
                    <Legend formatter={v => v === "receita" ? "Receita" : v === "despesa" ? "Despesa" : "Lucro"} />
                    <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Line type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: "#3b82f6" }} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Lance despesas para ver este gráfico.</div>}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4">Despesas por Categoria</h3>
              <div className="space-y-3">
                {expenseByCategory.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
                  : expenseByCategory.map(cat => {
                    const pct = totalExpenses > 0 ? (cat.total / totalExpenses * 100) : 0;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-foreground">{cat.icon} {cat.label}</span>
                          <span className="font-bold" style={{ color: cat.color }}>{fmt(cat.total)} <span className="text-muted-foreground font-normal text-xs">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4">Resumo Comparativo</h3>
              <div className="space-y-4">
                {[
                  { label: "Receita Atual", value: metrics.totalRevenue, prev: prevRevenue, color: "text-emerald-500" },
                  { label: "Despesas Atual", value: totalExpenses, prev: prevExpensesTotal, color: "text-rose-500" },
                  { label: "Lucro Atual", value: lucroLiquido, prev: prevLucro, color: lucroLiquido >= 0 ? "text-blue-500" : "text-red-600" },
                ].map(item => {
                  const chg = item.prev !== 0 ? ((item.value - item.prev) / Math.abs(item.prev) * 100) : 0;
                  return (
                    <div key={item.label} className="flex justify-between items-center pb-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">Anterior: {fmt(item.prev)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${item.color}`}>{fmt(item.value)}</p>
                        {chg !== 0 && (
                          <p className={`text-xs font-medium flex items-center justify-end gap-1 ${chg > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {getTrendIcon(chg)} {Math.abs(chg).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══ TAB: PRODUTOS ══ */}
        <TabsContent value="products" className="space-y-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Produtos Mais Vendidos</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ranking por receita gerada</p>
              </div>
              <ShoppingBag className="text-primary" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="p-4 text-left font-semibold text-muted-foreground">#</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">Produto</th>
                    <th className="p-4 text-center font-semibold text-muted-foreground">Unidades</th>
                    <th className="p-4 text-right font-semibold text-muted-foreground">Receita</th>
                    <th className="p-4 text-right font-semibold text-muted-foreground">% do Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.topProducts.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum produto vendido no período.</td></tr>
                  ) : metrics.topProducts.map((p, i) => {
                    const pct = metrics.totalRevenue > 0 ? (p.revenue / metrics.totalRevenue * 100) : 0;
                    return (
                      <tr key={p.name} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-xs text-muted-foreground">#{i + 1}</span>}
                        </td>
                        <td className="p-4 font-medium text-foreground">{p.name}</td>
                        <td className="p-4 text-center">
                          <span className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full text-xs">{p.qty}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(p.revenue)}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {metrics.topAddons.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Star className="text-amber-500" size={20} />
                <div>
                  <h3 className="font-bold text-foreground">Acompanhamentos Mais Pedidos</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Adicionais e complementos</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="p-4 text-left font-semibold text-muted-foreground">Acompanhamento</th>
                      <th className="p-4 text-center font-semibold text-muted-foreground">Quantidade</th>
                      <th className="p-4 text-right font-semibold text-muted-foreground">Receita Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {metrics.topAddons.slice(0, 10).map((a, i) => (
                      <tr key={a.name} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-foreground">{i === 0 ? "⭐ " : ""}{a.name}</td>
                        <td className="p-4 text-center">
                          <span className="bg-amber-500/10 text-amber-600 font-bold px-2.5 py-1 rounded-full text-xs">{a.qty}x</span>
                        </td>
                        <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{fmt(a.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══ TAB: HORÁRIOS ══ */}
        <TabsContent value="timing" className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-1">Receita por Dia da Semana</h3>
            <p className="text-xs text-muted-foreground mb-5">Identifique os dias mais fortes do negócio</p>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `R$${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(v: number) => [fmt(v), "Receita"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {metrics.weekdayData.map((entry, i) => (
                      <Cell key={i} fill={entry.revenue === Math.max(...metrics.weekdayData.map(d => d.revenue)) ? "#10b981" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-1">Mapa de Calor por Hora</h3>
            <p className="text-xs text-muted-foreground mb-5">Descubra os horários de pico do seu negócio</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tickFormatter={v => `R$${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(v: number) => [fmt(v), "Receita"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {metrics.hourlyData.map((entry, i) => {
                      const maxVal = Math.max(...metrics.hourlyData.map(d => d.revenue));
                      const intensity = maxVal > 0 ? entry.revenue / maxVal : 0;
                      const r = Math.round(59 + intensity * (239 - 59));
                      const g = Math.round(130 + intensity * (68 - 130));
                      const b = Math.round(246 + intensity * (68 - 246));
                      return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ══ TAB: CLIENTES ══ */}
        <TabsContent value="customers">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Ranking de Clientes (LTV)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Clientes com maior valor de vida</p>
              </div>
              <Users className="text-blue-500" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="p-4 text-left font-semibold text-muted-foreground">#</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">Cliente</th>
                    <th className="p-4 text-left font-semibold text-muted-foreground">WhatsApp</th>
                    <th className="p-4 text-center font-semibold text-muted-foreground">Pedidos</th>
                    <th className="p-4 text-right font-semibold text-muted-foreground">Ticket Médio</th>
                    <th className="p-4 text-right font-semibold text-muted-foreground">LTV Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.topCustomers.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum cliente no período.</td></tr>
                  ) : metrics.topCustomers.slice(0, 20).map((c, i) => (
                    <tr key={c.phone} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-xs text-muted-foreground">#{i + 1}</span>}
                      </td>
                      <td className="p-4 font-medium text-foreground">{c.name}</td>
                      <td className="p-4 text-muted-foreground text-xs">{c.phone}</td>
                      <td className="p-4 text-center">
                        <span className="bg-blue-500/10 text-blue-600 font-bold px-2.5 py-1 rounded-full text-xs">{c.count}</span>
                      </td>
                      <td className="p-4 text-right text-muted-foreground">{fmt(c.total / c.count)}</td>
                      <td className="p-4 text-right font-bold text-primary">{fmt(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ══ TAB: CUPONS ══ */}
        <TabsContent value="coupons">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Performance de Cupons</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Impacto dos descontos na receita</p>
              </div>
              <Ticket className="text-rose-500" size={20} />
            </div>
            {metrics.topCoupons.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">Nenhum cupom utilizado no período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="p-4 text-left font-semibold text-muted-foreground">Cupom</th>
                      <th className="p-4 text-center font-semibold text-muted-foreground">Usos</th>
                      <th className="p-4 text-right font-semibold text-muted-foreground">Desconto Total</th>
                      <th className="p-4 text-right font-semibold text-muted-foreground">Receita Gerada</th>
                      <th className="p-4 text-right font-semibold text-muted-foreground">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {metrics.topCoupons.map(c => {
                      const roi = c.discountGiven > 0 ? ((c.revenueGenerated - c.discountGiven) / c.discountGiven * 100) : 0;
                      return (
                        <tr key={c.code} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-foreground border border-border px-3 py-1 rounded-lg font-mono text-xs">{c.code}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-rose-500/10 text-rose-600 font-bold px-2.5 py-1 rounded-full text-xs">{c.count}x</span>
                          </td>
                          <td className="p-4 text-right font-medium text-rose-600 dark:text-rose-400">{fmt(c.discountGiven)}</td>
                          <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.revenueGenerated)}</td>
                          <td className="p-4 text-right">
                            <span className={`text-xs font-bold ${roi >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{roi.toFixed(0)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══ TAB: ENTREGADORES ══ */}
        <TabsContent value="couriers" className="space-y-5">
          <CourierReport orders={orders} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COURIER REPORT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface CourierSummary {
  name: string;
  deliveries: Order[];
  totalFee: number;
  avgFee: number;
}

function exportCourierCSV(couriers: CourierSummary[], mode: "detailed" | "synthetic") {
  let csv = "";
  if (mode === "synthetic") {
    csv = "Entregador,Qt. Entregas,Valor Unit. Médio,Total a Receber\n";
    csv += couriers.map(c =>
      `"${c.name}",${c.deliveries.length},${c.avgFee.toFixed(2)},${c.totalFee.toFixed(2)}`
    ).join("\n");
  } else {
    csv = "Entregador,Nº Pedido,Hora,Cliente,Endereço,Taxa de Entrega\n";
    couriers.forEach(c => {
      c.deliveries.forEach(o => {
        csv += `"${c.name}",${o.number},${fmtTime(o.createdAt)},"${o.customerName}","${o.address || ""}",${(o.deliveryFee || 0).toFixed(2)}\n`;
      });
    });
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio_entregadores_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`;
  a.click();
}

function CourierReport({ orders }: { orders: Order[] }) {
  const [reportMode, setReportMode] = useState<"synthetic" | "detailed">("synthetic");
  const [expandedCourier, setExpandedCourier] = useState<string | null>(null);
  const [courierPreset, setCourierPreset] = useState<"today" | "yesterday" | "yesterday_today" | "7d" | "30d" | "this_month" | "custom">("today");
  const [cStartDate, setCStartDate] = useState("");
  const [cStartTime, setCStartTime] = useState("");
  const [cEndDate, setCEndDate] = useState("");
  const [cEndTime, setCEndTime] = useState("");

  const courierDateRange = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    if (courierPreset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (courierPreset === "yesterday") {
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setHours(23, 59, 59, 999);
    } else if (courierPreset === "yesterday_today") {
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
    } else if (courierPreset === "7d") {
      start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
    } else if (courierPreset === "30d") {
      start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0);
    } else if (courierPreset === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (courierPreset === "custom") {
      if (cStartDate) {
        const d = new Date(cStartDate + "T00:00:00");
        if (cStartTime) {
          const [h, m] = cStartTime.split(':');
          d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        } else {
          d.setHours(0, 0, 0, 0);
        }
        start = d;
      } else {
        start = new Date(0);
      }
      if (cEndDate) {
        const d = new Date(cEndDate + "T00:00:00");
        if (cEndTime) {
          const [h, m] = cEndTime.split(':');
          d.setHours(parseInt(h, 10), parseInt(m, 10), 59, 999);
        } else {
          d.setHours(23, 59, 59, 999);
        }
        end = d;
      } else {
        end = new Date();
      }
    }
    return { start, end };
  }, [courierPreset, cStartDate, cStartTime, cEndDate, cEndTime]);

  const dateLabel = `${courierDateRange.start.toLocaleDateString("pt-BR")} – ${courierDateRange.end.toLocaleDateString("pt-BR")}`;

  const deliveryOrders = useMemo(() => {
    return orders.filter(o => {
      const hasCourier = !!(o.courierName && o.courierName.trim());
      const hasFee = (o.deliveryFee || 0) > 0;
      const notCancelled = o.status !== "cancelado";
      const d = new Date(o.createdAt);
      const inRange = d >= courierDateRange.start && d <= courierDateRange.end;
      return (hasCourier || hasFee) && notCancelled && inRange;
    });
  }, [orders, courierDateRange]);

  const couriers = useMemo(() => {
    const map: Record<string, Order[]> = {};
    deliveryOrders.forEach(o => {
      const name = (o.courierName && o.courierName.trim()) ? o.courierName : "Sem Entregador (Taxa Cobrada)";
      if (!map[name]) map[name] = [];
      map[name].push(o);
    });
    return Object.entries(map)
      .map(([name, deliveries]) => {
        const totalFee = deliveries.reduce((s, o) => s + (o.deliveryFee || 0), 0);
        return { name, deliveries, totalFee, avgFee: deliveries.length > 0 ? totalFee / deliveries.length : 0 };
      })
      .sort((a, b) => b.deliveries.length - a.deliveries.length);
  }, [deliveryOrders]);

  const grandTotal = couriers.reduce((s, c) => s + c.totalFee, 0);
  const grandQty = couriers.reduce((s, c) => s + c.deliveries.length, 0);

  return (
    <div className="space-y-4">
      {/* ── Toolbar Card ── */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow shrink-0">
              <Bike className="text-white" size={18} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Relatório de Entregas</p>
              <p className="text-xs text-muted-foreground">{dateLabel}</p>
            </div>
          </div>
          <button
            onClick={() => exportCourierCSV(couriers, reportMode)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors shrink-0"
          >
            <Download size={13} /> CSV
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap bg-muted rounded-xl p-1 gap-0.5">
            {[
              { value: "today", label: "Hoje" },
              { value: "yesterday", label: "Ontem" },
              { value: "yesterday_today", label: "Ontem+Hoje" },
              { value: "7d", label: "7 dias" },
              { value: "30d", label: "30 dias" },
              { value: "this_month", label: "Este mês" },
              { value: "custom", label: "Personalizado" },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setCourierPreset(p.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  courierPreset === p.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {courierPreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-1">
                <input type="date" value={cStartDate} onChange={e => setCStartDate(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none" />
                <input type="time" value={cStartTime} onChange={e => setCStartTime(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none" title="Vazio = 00:00" />
              </div>
              <span className="text-muted-foreground text-xs font-semibold">até</span>
              <div className="flex items-center gap-1">
                <input type="date" value={cEndDate} onChange={e => setCEndDate(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none" />
                <input type="time" value={cEndTime} onChange={e => setCEndTime(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none" title="Vazio = 23:59" />
              </div>
            </div>
          )}

          <div className="flex bg-muted rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setReportMode("synthetic")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                reportMode === "synthetic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package size={12} /> Sintético
            </button>
            <button
              onClick={() => setReportMode("detailed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                reportMode === "detailed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ChevronDown size={12} /> Detalhado
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Bike size={14} className="text-indigo-500" />
            <span className="text-xs font-medium text-muted-foreground">Entregadores</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-foreground">{couriers.length}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Package size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Entregas</span>
          </div>
          <p className="text-xl md:text-2xl font-black text-foreground">{grandQty}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Total Fretes</span>
          </div>
          <p className="text-base md:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{fmt(grandTotal)}</p>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      {deliveryOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Bike size={28} className="text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">Nenhuma entrega no período</p>
          <p className="text-sm text-muted-foreground">Pedidos com entregador atribuído aparecerão aqui.</p>
        </div>
      ) : reportMode === "synthetic" ? (
        /* ═══ SINTÉTICO ═══ */
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Package size={15} className="text-indigo-500" />
            <p className="font-semibold text-sm text-foreground">Resumo por Entregador</p>
          </div>

          {/* Mobile: cards empilhados */}
          <div className="block md:hidden divide-y divide-border">
            {couriers.map(c => (
              <div key={c.name} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.deliveries.length} entrega{c.deliveries.length !== 1 ? "s" : ""} · méd. {fmt(c.avgFee)}</p>
                  </div>
                </div>
                <p className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(c.totalFee)}</p>
              </div>
            ))}
            <div className="p-4 flex items-center justify-between bg-muted/30">
              <div>
                <p className="font-bold text-foreground text-sm">Total Geral</p>
                <p className="text-xs text-muted-foreground">{grandQty} entregas</p>
              </div>
              <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{fmt(grandTotal)}</p>
            </div>
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-4 text-left font-semibold text-muted-foreground">Entregador</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">Entregas</th>
                  <th className="p-4 text-right font-semibold text-muted-foreground">Média por Entrega</th>
                  <th className="p-4 text-right font-semibold text-muted-foreground">Total a Receber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {couriers.map(c => (
                  <tr key={c.name} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1 rounded-full text-xs">
                        {c.deliveries.length}
                      </span>
                    </td>
                    <td className="p-4 text-right text-muted-foreground">{fmt(c.avgFee)}</td>
                    <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-base">{fmt(c.totalFee)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td className="p-4 font-bold text-foreground">Total Geral</td>
                  <td className="p-4 text-center font-bold text-indigo-600">{grandQty}</td>
                  <td className="p-4 text-right text-muted-foreground">{grandQty > 0 ? fmt(grandTotal / grandQty) : "—"}</td>
                  <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-lg">{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* ═══ DETALHADO ═══ */
        <div className="space-y-3">
          {couriers.map(courier => {
            const isExpanded = expandedCourier === courier.name || couriers.length === 1;
            return (
              <div key={courier.name} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCourier(isExpanded && couriers.length > 1 ? null : courier.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                      {courier.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-foreground">{courier.name}</p>
                      <p className="text-xs text-muted-foreground">{courier.deliveries.length} entrega{courier.deliveries.length !== 1 ? "s" : ""} · méd. {fmt(courier.avgFee)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">a receber</p>
                      <p className="font-black text-emerald-600 dark:text-emerald-400">{fmt(courier.totalFee)}</p>
                    </div>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Mobile: cards */}
                    <div className="block md:hidden divide-y divide-border">
                      {courier.deliveries.map(order => (
                        <div key={order.id} className="p-3 flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">#{order.number}</span>
                              <span className="text-xs text-muted-foreground">{fmtTime(order.createdAt)}</span>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{order.customerName || "—"}</p>
                            {order.address && <p className="text-xs text-muted-foreground truncate">{order.address}</p>}
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(order.deliveryFee || 0)}</span>
                        </div>
                      ))}
                      <div className="p-3 flex justify-between items-center bg-indigo-500/5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span className="text-sm font-bold text-foreground">Total — {courier.name}</span>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(courier.totalFee)}</span>
                      </div>
                    </div>

                    {/* Desktop: tabela */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Nº</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Horário</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Cliente</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Endereço</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs">Frete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {courier.deliveries.map(order => (
                            <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">#{order.number}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                {fmtDate(order.createdAt)} {fmtTime(order.createdAt)}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">{order.customerName || "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{order.address || "—"}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(order.deliveryFee || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-indigo-500/5">
                            <td colSpan={4} className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                <span className="font-bold text-foreground text-sm">Total a receber — {courier.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-base">{fmt(courier.totalFee)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Total geral */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Total Geral</p>
              <p className="text-xs text-muted-foreground">{grandQty} entrega{grandQty !== 1 ? "s" : ""} · {couriers.length} entregador{couriers.length !== 1 ? "es" : ""}</p>
            </div>
            <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(grandTotal)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

