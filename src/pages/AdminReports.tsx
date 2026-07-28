import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchCoupons, Order, Coupon } from "@/data/menuData";
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Calendar, Ticket, Percent } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AdminReports() {
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: coupons = [] } = useQuery({ queryKey: ['coupons'], queryFn: fetchCoupons });

  const [datePreset, setDatePreset] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Determine date ranges
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (datePreset === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === "7d") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === "30d") {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === "last_month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (datePreset === "custom") {
      if (customStart) start = new Date(customStart + "T00:00:00");
      if (customEnd) end = new Date(customEnd + "T23:59:59.999");
    }

    return { start, end };
  }, [datePreset, customStart, customEnd]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate < dateRange.start || orderDate > dateRange.end) return false;

      return true;
    });
  }, [orders, dateRange]);

  // Calculate Metrics & Groupings
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalDiscounts = 0;
    const paymentCounts: Record<string, number> = {};
    const consumeCounts: Record<string, number> = {};
    const productStats: Record<string, { qty: number, revenue: number }> = {};
    const customerStats: Record<string, { name: string, phone: string, count: number, total: number }> = {};
    const couponStats: Record<string, { code: string, count: number, discountGiven: number, revenueGenerated: number }> = {};
    
    // For Line Chart
    const dailyRevenue: Record<string, number> = {};

    filteredOrders.forEach(order => {
      totalRevenue += order.total;
      totalDiscounts += (order.discountAmount || 0);

      // Daily Revenue grouping
      const d = new Date(order.createdAt);
      const dayKey = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
      dailyRevenue[dayKey] = (dailyRevenue[dayKey] || 0) + order.total;

      // Payment & Consume
      const pm = order.paymentMethod || "Não informado";
      paymentCounts[pm] = (paymentCounts[pm] || 0) + 1;
      
      const cm = order.consumeType || "Não informado";
      consumeCounts[cm] = (consumeCounts[cm] || 0) + 1;

      // Products
      order.items.forEach(item => {
        if (!productStats[item.productName]) productStats[item.productName] = { qty: 0, revenue: 0 };
        productStats[item.productName].qty += item.quantity;
        
        // Base product price + addons
        let itemPrice = item.productPrice * item.quantity;
        if (item.addons) {
           itemPrice += item.addons.reduce((sum, a) => sum + (a.price * a.quantity), 0);
        }
        productStats[item.productName].revenue += itemPrice;
      });

      // Customers
      const phone = order.customerWhatsApp || "Sem Número";
      const name = order.customerName || "Desconhecido";
      const custId = phone; 
      if (!customerStats[custId]) {
        customerStats[custId] = { name, phone, count: 0, total: 0 };
      }
      customerStats[custId].count += 1;
      customerStats[custId].total += order.total;

      // Coupons
      if (order.couponId) {
        const couponId = String(order.couponId);
        if (!couponStats[couponId]) {
           const cObj = coupons.find(c => String(c.id) === couponId);
           couponStats[couponId] = { 
             code: cObj ? cObj.code : `Cupom #${couponId}`, 
             count: 0, 
             discountGiven: 0, 
             revenueGenerated: 0 
           };
        }
        couponStats[couponId].count += 1;
        couponStats[couponId].discountGiven += (order.discountAmount || 0);
        couponStats[couponId].revenueGenerated += order.total;
      }
    });

    const averageTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    // Format for charts & tables
    const chartData = Object.entries(dailyRevenue).map(([date, total]) => ({ date, total })).reverse(); // Assuming orders are newest first, we reverse for chronological, wait, Object.entries might not be sorted. Let's sort it proper later if needed, but string keys format might break if months span years. We'll rely on it as is for short ranges.
    
    // Sort chronological
    chartData.sort((a,b) => {
       const [d1, m1] = a.date.split('/');
       const [d2, m2] = b.date.split('/');
       if (m1 !== m2) return Number(m1) - Number(m2);
       return Number(d1) - Number(d2);
    });

    const piePaymentData = Object.entries(paymentCounts).map(([name, value]) => ({ name, value }));
    const pieConsumeData = Object.entries(consumeCounts).map(([name, value]) => ({ name, value }));

    const topProducts = Object.entries(productStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.total - a.total);

    const topCoupons = Object.values(couponStats)
      .sort((a, b) => b.count - a.count);

    return { 
      totalRevenue, 
      totalOrders: filteredOrders.length,
      averageTicket,
      totalDiscounts,
      chartData,
      piePaymentData,
      pieConsumeData,
      topProducts,
      topCustomers,
      topCoupons
    };
  }, [filteredOrders, coupons]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="text-primary" size={28} />
            Dashboard de Relatórios
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Visão completa e analítica das vendas do seu restaurante.</p>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 md:items-center justify-between">
         <div className="flex flex-wrap gap-2">
            <button onClick={() => setDatePreset("today")} className={`px-4 py-2 text-sm rounded-full font-medium transition-colors ${datePreset === "today" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Hoje</button>
            <button onClick={() => setDatePreset("7d")} className={`px-4 py-2 text-sm rounded-full font-medium transition-colors ${datePreset === "7d" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Últimos 7 dias</button>
            <button onClick={() => setDatePreset("30d")} className={`px-4 py-2 text-sm rounded-full font-medium transition-colors ${datePreset === "30d" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Últimos 30 dias</button>
            <button onClick={() => setDatePreset("this_month")} className={`px-4 py-2 text-sm rounded-full font-medium transition-colors ${datePreset === "this_month" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Este Mês</button>
            <button onClick={() => setDatePreset("last_month")} className={`px-4 py-2 text-sm rounded-full font-medium transition-colors ${datePreset === "last_month" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>Mês Passado</button>
            <button onClick={() => setDatePreset("custom")} className={`px-4 py-2 text-sm rounded-full font-medium transition-colors flex items-center gap-2 ${datePreset === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
               <Calendar size={14}/> Personalizado
            </button>
         </div>

         {datePreset === "custom" && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
               <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
               />
               <span className="text-muted-foreground text-sm">até</span>
               <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
               />
            </div>
         )}
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
             <p className="text-sm text-muted-foreground font-medium">Receita Bruta</p>
             <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <DollarSign size={18} />
             </div>
          </div>
          <p className="text-3xl font-bold text-foreground">R$ {metrics.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
             <p className="text-sm text-muted-foreground font-medium">Ticket Médio</p>
             <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
               <TrendingUp size={18} />
             </div>
          </div>
          <p className="text-3xl font-bold text-foreground">R$ {metrics.averageTicket.toFixed(2)}</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
             <p className="text-sm text-muted-foreground font-medium">Total de Pedidos</p>
             <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
               <ShoppingBag size={18} />
             </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{metrics.totalOrders}</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
             <p className="text-sm text-muted-foreground font-medium">Descontos (Cupons)</p>
             <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
               <Percent size={18} />
             </div>
          </div>
          <p className="text-3xl font-bold text-foreground">R$ {metrics.totalDiscounts.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 mb-6 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Visão Geral</TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg">Produtos</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-lg">Clientes</TabsTrigger>
          <TabsTrigger value="coupons" className="rounded-lg">Cupons</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
           <div className="bg-card border border-border rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-lg text-foreground mb-6">Evolução Diária da Receita</h3>
              <div className="h-[300px] w-full">
                {metrics.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={metrics.chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                       <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                       <YAxis tickFormatter={(val) => `R$ ${val}`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                       <RechartsTooltip 
                         formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                         contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                       />
                       <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                     </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados suficientes para gerar gráfico.</div>
                )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl shadow-sm p-5">
                 <h3 className="font-semibold text-lg text-foreground mb-4">Pagamentos</h3>
                 <div className="h-[250px] w-full">
                    {metrics.piePaymentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={metrics.piePaymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                               {metrics.piePaymentData.map((_, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => [`${value} pedidos`, 'Quantidade']} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}/>
                            <Legend />
                         </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados.</div>}
                 </div>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-sm p-5">
                 <h3 className="font-semibold text-lg text-foreground mb-4">Tipos de Consumo</h3>
                 <div className="h-[250px] w-full">
                    {metrics.pieConsumeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={metrics.pieConsumeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                               {metrics.pieConsumeData.map((_, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                               ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => [`${value} pedidos`, 'Quantidade']} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}/>
                            <Legend />
                         </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados.</div>}
                 </div>
              </div>
           </div>
        </TabsContent>

        {/* TAB 2: PRODUTOS */}
        <TabsContent value="products">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
             <div className="p-5 border-b border-border flex items-center gap-2">
                <ShoppingBag className="text-primary" size={20}/>
                <h3 className="font-semibold text-lg text-foreground">Produtos Mais Vendidos</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-muted/30">
                     <tr>
                        <th className="p-4 font-medium text-muted-foreground">Produto</th>
                        <th className="p-4 font-medium text-muted-foreground text-center">Unidades Vendidas</th>
                        <th className="p-4 font-medium text-muted-foreground text-right">Receita Gerada</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {metrics.topProducts.length > 0 ? metrics.topProducts.map((p, idx) => (
                        <tr key={p.name} className="hover:bg-muted/20 transition-colors">
                           <td className="p-4 flex items-center gap-3">
                              <span className="text-muted-foreground font-mono text-xs bg-muted px-2 py-1 rounded-md">#{idx + 1}</span>
                              <span className="font-medium text-foreground">{p.name}</span>
                           </td>
                           <td className="p-4 text-center font-bold text-foreground">{p.qty}</td>
                           <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">R$ {p.revenue.toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Nenhum dado encontrado para o período.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </TabsContent>

        {/* TAB 3: CLIENTES */}
        <TabsContent value="customers">
           <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
             <div className="p-5 border-b border-border flex items-center gap-2">
                <Users className="text-blue-500" size={20}/>
                <h3 className="font-semibold text-lg text-foreground">Ranking de Clientes (LTV)</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-muted/30">
                     <tr>
                        <th className="p-4 font-medium text-muted-foreground">Nome do Cliente</th>
                        <th className="p-4 font-medium text-muted-foreground">WhatsApp</th>
                        <th className="p-4 font-medium text-muted-foreground text-center">Nº de Pedidos</th>
                        <th className="p-4 font-medium text-muted-foreground text-right">Ticket Médio</th>
                        <th className="p-4 font-medium text-muted-foreground text-right">Valor Gasto (LTV)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {metrics.topCustomers.length > 0 ? metrics.topCustomers.map((c, idx) => (
                        <tr key={c.phone} className="hover:bg-muted/20 transition-colors">
                           <td className="p-4 flex items-center gap-3">
                              <span className="text-muted-foreground font-mono text-xs bg-muted px-2 py-1 rounded-md">#{idx + 1}</span>
                              <span className="font-medium text-foreground">{c.name}</span>
                           </td>
                           <td className="p-4 text-muted-foreground">{c.phone}</td>
                           <td className="p-4 text-center">
                             <span className="bg-blue-500/10 text-blue-600 font-bold px-2.5 py-1 rounded-full">{c.count}</span>
                           </td>
                           <td className="p-4 text-right text-muted-foreground">R$ {(c.total / c.count).toFixed(2)}</td>
                           <td className="p-4 text-right font-bold text-primary">R$ {c.total.toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum dado encontrado para o período.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </TabsContent>

        {/* TAB 4: CUPONS */}
        <TabsContent value="coupons">
           <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
             <div className="p-5 border-b border-border flex items-center gap-2">
                <Ticket className="text-rose-500" size={20}/>
                <h3 className="font-semibold text-lg text-foreground">Performance de Cupons</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-muted/30">
                     <tr>
                        <th className="p-4 font-medium text-muted-foreground">Código do Cupom</th>
                        <th className="p-4 font-medium text-muted-foreground text-center">Usos no Período</th>
                        <th className="p-4 font-medium text-muted-foreground text-right">Desconto Total Concedido</th>
                        <th className="p-4 font-medium text-muted-foreground text-right">Receita Gerada (c/ Desconto)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {metrics.topCoupons.length > 0 ? metrics.topCoupons.map((c, idx) => (
                        <tr key={c.code} className="hover:bg-muted/20 transition-colors">
                           <td className="p-4 flex items-center gap-3">
                              <span className="font-bold text-foreground border border-border px-3 py-1 rounded-md">{c.code}</span>
                           </td>
                           <td className="p-4 text-center">
                              <span className="bg-rose-500/10 text-rose-600 font-bold px-2.5 py-1 rounded-full">{c.count}</span>
                           </td>
                           <td className="p-4 text-right font-medium text-rose-600 dark:text-rose-400">R$ {c.discountGiven.toFixed(2)}</td>
                           <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">R$ {c.revenueGenerated.toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum cupom foi utilizado no período.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
