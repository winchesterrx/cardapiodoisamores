import { useState, useEffect } from "react";
import { X, MapPin, Truck, PenLine, Calculator, User, Phone, Navigation, CheckCircle2, CheckCircle, Package, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL, StoreSettings } from "@/data/menuData";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderData: any) => Promise<void> | void;
  total: number;
  discount: number;
  storeSettings: StoreSettings | null;
}

type ConsumeType = "Balcão" | "Entrega";
type PaymentMethod = "Dinheiro" | "Pix" | "Cartão de Crédito" | "Cartão de Débito";
type DeliveryMode = "auto" | "manual";

const PAYMENT_METHODS: { value: PaymentMethod; icon: string; label: string }[] = [
  { value: "Dinheiro", icon: "💵", label: "Dinheiro" },
  { value: "Pix", icon: "⚡", label: "Pix" },
  { value: "Cartão de Crédito", icon: "💳", label: "Crédito" },
  { value: "Cartão de Débito", icon: "💳", label: "Débito" },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PDVCheckoutModal({ isOpen, onClose, onConfirm, total, discount, storeSettings }: Props) {
  const [consume, setConsume] = useState<ConsumeType>("Balcão");
  const [payment, setPayment] = useState<PaymentMethod>("Dinheiro");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  const [customDate, setCustomDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("entregue");
  const [driverId, setDriverId] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && token) {
      fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const couriers = data.filter((u: any) => u.role === 'courier');
          setDrivers(couriers);
        }
      })
      .catch(err => console.error("Error fetching drivers:", err));
    }
  }, [isOpen, token]);

  // Endereço
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");

  // Frete
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("auto");
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);
  const [manualFee, setManualFee] = useState("");
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [deliveryFeeError, setDeliveryFeeError] = useState("");

  const hasAutoFeeConfig = storeSettings && Number(storeSettings.delivery_fee_per_km) > 0;
  const addressForCalculation = `${street}, ${number}, ${neighborhood}`;
  const fullAddress = `${street}, ${number} - ${neighborhood}${reference ? ` (Ref: ${reference})` : ""}`;

  // Reset ao trocar modo de consumo
  useEffect(() => {
    setCalculatedDeliveryFee(null);
    setDeliveryFeeError("");
    setManualFee("");
    setDeliveryMode("auto");
  }, [consume]);

  // Auto-calcular quando endereço mudar (modo automático)
  useEffect(() => {
    if (deliveryMode !== "auto") return;
    const delay = setTimeout(() => {
      if (
        consume === "Entrega" &&
        street.trim().length > 3 &&
        number.trim() &&
        neighborhood.trim().length > 2 &&
        hasAutoFeeConfig
      ) {
        handleCalculateDelivery(addressForCalculation);
      }
    }, 1500);
    return () => clearTimeout(delay);
  }, [street, number, neighborhood, consume, storeSettings, deliveryMode]);

  const handleCalculateDelivery = async (addressToCalculate: string = addressForCalculation) => {
    if (!addressToCalculate.trim()) {
      setDeliveryFeeError("Informe o endereço para calcular o frete.");
      return;
    }
    setCalculatingFee(true);
    setDeliveryFeeError("");
    try {
      const response = await fetch(`${API_URL}/calculate-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAddress: addressToCalculate }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDeliveryFeeError(data.error || "Erro ao calcular frete");
        setCalculatedDeliveryFee(null);
      } else {
        setCalculatedDeliveryFee(data.fee);
      }
    } catch {
      setDeliveryFeeError("Erro de comunicação com o servidor.");
      setCalculatedDeliveryFee(null);
    } finally {
      setCalculatingFee(false);
    }
  };

  const getEffectiveDeliveryFee = (): number => {
    if (consume !== "Entrega") return 0;
    if (deliveryMode === "manual") return parseFloat(manualFee) || 0;
    if (hasAutoFeeConfig) return calculatedDeliveryFee ?? 0;
    return Number(storeSettings?.delivery_fee || 0);
  };

  const handleSubmit = async () => {
    if (consume === "Entrega" && (!street.trim() || !number.trim() || !neighborhood.trim())) {
      alert("Para entregas, preencha rua, número e bairro.");
      return;
    }
    if (consume === "Entrega" && deliveryMode === "auto" && hasAutoFeeConfig && calculatedDeliveryFee === null) {
      alert("Por favor, calcule o frete antes de finalizar, ou escolha a opção Frete Manual.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        consumeType: consume,
        paymentMethod: payment,
        customerName: customerName.trim() || "Balcão",
        customerWhatsApp: customerWhatsApp.replace(/\D/g, ""),
        address: consume === "Entrega" ? fullAddress : undefined,
        deliveryFee: getEffectiveDeliveryFee(),
        discountAmount: discount,
        customDate: customDate,
        status: status,
        driverId: consume === "Entrega" && driverId ? parseInt(driverId) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveFee = getEffectiveDeliveryFee();
  const finalTotal = total + effectiveFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pdv-checkout-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4"
          onClick={onClose}
        >
          <motion.div
            key="pdv-checkout-modal"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="bg-card w-full max-w-xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div>
                <h2 className="font-bold text-lg text-foreground">Finalizar Pedido</h2>
                <p className="text-xs text-muted-foreground mt-0.5">PDV — Preencha os dados e confirme</p>
              </div>
              <button
                onClick={onClose}
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Tipo do Pedido ── */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tipo do Pedido
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["Balcão", "Entrega"] as ConsumeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConsume(type)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 ${
                        consume === type
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className="text-2xl">{type === "Balcão" ? "🏪" : "🛵"}</span>
                      <span>{type}</span>
                      {consume === type && (
                        <motion.div
                          layoutId="consume-indicator"
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 size={16} className="text-primary" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Dados do Cliente ── */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dados do Cliente
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Nome do cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="(19) 99999-9999"
                      value={customerWhatsApp}
                      onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── Status do Pedido (PDV Retroativo) ── */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Detalhes do Lançamento
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Data do Lançamento</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Status</label>
                    <div className="relative">
                      <CheckCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <select
                        className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="pronto">Pronto para Despache</option>
                        <option value="despachado">Despachado</option>
                        <option value="entregue">Entregue</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Endereço e Entregador ── */}
              <AnimatePresence>
                {consume === "Entrega" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin size={13} /> Endereço de Entrega
                    </label>
                    <div className="bg-muted/30 rounded-2xl border border-border p-4 space-y-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                          <label className="text-xs text-muted-foreground block mb-1">Rua / Avenida</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Ex: Rua das Flores"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs text-muted-foreground block mb-1">Nº</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="123"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Bairro</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Centro"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Referência (opcional)</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Próx. ao mercado X"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* ── Opção de Frete ── */}
                      <div className="pt-1 space-y-3">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Truck size={13} /> Tipo de Frete
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Calcular automático */}
                          <button
                            onClick={() => {
                              setDeliveryMode("auto");
                              setManualFee("");
                            }}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                              deliveryMode === "auto"
                                ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "border-border hover:border-blue-400/40 text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <Calculator size={16} />
                            <span>Calcular Frete</span>
                          </button>

                          {/* Manual */}
                          <button
                            onClick={() => {
                              setDeliveryMode("manual");
                              setCalculatedDeliveryFee(null);
                              setDeliveryFeeError("");
                            }}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                              deliveryMode === "manual"
                                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-border hover:border-amber-400/40 text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <PenLine size={16} />
                            <span>Frete Manual</span>
                          </button>
                        </div>

                        {/* Modo automático */}
                        <AnimatePresence mode="wait">
                          {deliveryMode === "auto" && (
                            <motion.div
                              key="auto-fee"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="space-y-2"
                            >
                              {hasAutoFeeConfig ? (
                                <>
                                  <button
                                    onClick={() => handleCalculateDelivery()}
                                    disabled={calculatingFee || !street || !number || !neighborhood}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                                  >
                                    <Navigation size={15} />
                                    {calculatingFee ? "Calculando..." : "Calcular Frete por Distância"}
                                  </button>
                                  {deliveryFeeError && (
                                    <p className="text-xs text-destructive font-medium">{deliveryFeeError}</p>
                                  )}
                                  {calculatedDeliveryFee !== null && (
                                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                                      <CheckCircle2 size={15} className="text-emerald-500" />
                                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        Frete calculado: {fmt(calculatedDeliveryFee)}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="bg-muted/50 rounded-xl px-3 py-2.5">
                                  <p className="text-sm text-muted-foreground">
                                    Taxa fixa de entrega:{" "}
                                    <strong className="text-foreground">
                                      {fmt(Number(storeSettings?.delivery_fee || 0))}
                                    </strong>
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          )}

                          {/* Modo manual */}
                          {deliveryMode === "manual" && (
                            <motion.div
                              key="manual-fee"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="space-y-1.5"
                            >
                              <label className="text-xs text-muted-foreground block">
                                Valor do frete (R$)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  step="0.50"
                                  min="0"
                                  placeholder="0,00"
                                  value={manualFee}
                                  onChange={(e) => setManualFee(e.target.value)}
                                  className="w-full pl-10 pr-3 py-2.5 border-2 border-amber-400/60 rounded-xl bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500"
                                />
                              </div>
                              {parseFloat(manualFee) > 0 && (
                                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                                  <CheckCircle2 size={15} className="text-amber-500" />
                                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                    Frete manual: {fmt(parseFloat(manualFee) || 0)}
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* ── Seleção de Entregador ── */}
                      <div className="pt-2 space-y-1.5">
                        <label className="text-xs text-muted-foreground block">
                          Entregador (Opcional)
                        </label>
                        <div className="relative">
                          <UserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <select
                            className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                          >
                            <option value="">Selecione um entregador</option>
                            {drivers.map(driver => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Pagamento ── */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPayment(m.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                        payment === m.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer com total e confirmar */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 space-y-3">
              {/* Breakdown de valores */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(total)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Desconto</span>
                    <span>- {fmt(discount)}</span>
                  </div>
                )}
                {consume === "Entrega" && effectiveFee > 0 && (
                  <div className="flex justify-between text-blue-500">
                    <span>Frete</span>
                    <span>+ {fmt(effectiveFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-foreground pt-1.5 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{fmt(finalTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 active:scale-[0.98] text-primary-foreground font-bold text-base rounded-2xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></span>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Finalizar Venda
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
