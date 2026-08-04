import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { API_URL, StoreSettings } from "@/data/menuData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderData: any) => void;
  total: number;
  discount: number;
  storeSettings: StoreSettings | null;
}

export default function PDVCheckoutModal({ isOpen, onClose, onConfirm, total, discount, storeSettings }: Props) {
  const [consume, setConsume] = useState<"Balcão" | "Entrega">("Balcão");
  const [payment, setPayment] = useState<"Dinheiro" | "Pix" | "Cartão de Crédito" | "Cartão de Débito">("Dinheiro");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  
  // Endereço
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");
  
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [deliveryFeeError, setDeliveryFeeError] = useState("");

  const addressForCalculation = `${street}, ${number}, ${neighborhood}`;
  const fullAddress = `${street}, ${number} - ${neighborhood}${reference ? ` (Ref: ${reference})` : ''}`;

  const handleCalculateDelivery = async (addressToCalculate: string = addressForCalculation) => {
    if (!addressToCalculate.trim()) {
      setDeliveryFeeError("Informe o endereço para calcular o frete.");
      return;
    }
    setCalculatingFee(true);
    setDeliveryFeeError("");
    try {
      const response = await fetch(`${API_URL}/calculate-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerAddress: addressToCalculate })
      });
      const data = await response.json();
      if (!response.ok) {
        setDeliveryFeeError(data.error || "Erro ao calcular frete");
        setCalculatedDeliveryFee(null);
      } else {
        setCalculatedDeliveryFee(data.fee);
      }
    } catch (error) {
      setDeliveryFeeError("Erro de comunicação com o servidor.");
      setCalculatedDeliveryFee(null);
    } finally {
      setCalculatingFee(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (consume === "Entrega" && street.trim().length > 3 && number.trim() && neighborhood.trim().length > 2 && storeSettings && Number(storeSettings.delivery_fee_per_km) > 0) {
        handleCalculateDelivery(addressForCalculation);
      }
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [street, number, neighborhood, consume, storeSettings]);

  const handleSubmit = () => {
    if (consume === "Entrega" && (!street.trim() || !number.trim() || !neighborhood.trim())) {
      alert("Para entregas, preencha rua, número e bairro.");
      return;
    }
    if (consume === "Entrega" && storeSettings && Number(storeSettings.delivery_fee_per_km) > 0 && calculatedDeliveryFee === null) {
      alert("Por favor, calcule o frete (ou espere o cálculo terminar).");
      return;
    }

    let currentDeliveryFee = 0;
    if (consume === "Entrega" && storeSettings) {
      if (Number(storeSettings.delivery_fee_per_km) > 0) {
        currentDeliveryFee = calculatedDeliveryFee !== null ? calculatedDeliveryFee : 0;
      } else {
        currentDeliveryFee = Number(storeSettings.delivery_fee || 0);
      }
    }

    onConfirm({
      consumeType: consume,
      paymentMethod: payment,
      customerName: customerName.trim() || "Balcão",
      customerWhatsApp: customerWhatsApp.replace(/\D/g, ""),
      address: consume === "Entrega" ? fullAddress : undefined,
      deliveryFee: currentDeliveryFee,
      discountAmount: discount
    });
  };

  const finalTotal = total + (calculatedDeliveryFee || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pdv-checkout-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4"
          onClick={onClose}
        >
          <motion.div
            key="pdv-checkout-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card w-full max-w-xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg">Finalizar Pedido (PDV)</h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* Origem */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Tipo do Pedido</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConsume("Balcão")}
                    className={`p-3 border rounded-lg font-medium transition-colors ${
                      consume === "Balcão" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    Balcão
                  </button>
                  <button
                    onClick={() => setConsume("Entrega")}
                    className={`p-3 border rounded-lg font-medium transition-colors ${
                      consume === "Entrega" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    Entrega
                  </button>
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Dados do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded bg-background focus:ring-primary"
                      placeholder="Nome do cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">WhatsApp</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded bg-background focus:ring-primary"
                      placeholder="(19) 99999-9999"
                      value={customerWhatsApp}
                      onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço (se Entrega) */}
              {consume === "Entrega" && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg">Endereço de Entrega</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3 space-y-1">
                      <label className="text-sm font-medium">Rua</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded bg-background"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-sm font-medium">Nº</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded bg-background"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Bairro</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded bg-background"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Ponto de Referência</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded bg-background"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {storeSettings && Number(storeSettings.delivery_fee_per_km) > 0 && (
                    <div className="pt-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleCalculateDelivery()} 
                        disabled={calculatingFee || !street || !number || !neighborhood}
                        className="w-full"
                      >
                        {calculatingFee ? "Calculando..." : "Calcular Frete"}
                      </Button>
                      {deliveryFeeError && <p className="text-destructive text-sm mt-1">{deliveryFeeError}</p>}
                      {calculatedDeliveryFee !== null && (
                        <p className="text-green-600 font-medium text-sm mt-1">
                          Taxa de entrega: R$ {calculatedDeliveryFee.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Pagamento */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Método de Pagamento</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Dinheiro", "Pix", "Cartão de Crédito", "Cartão de Débito"].map(method => (
                    <button
                      key={method}
                      onClick={() => setPayment(method as any)}
                      className={`p-2 border rounded font-medium text-sm transition-colors ${
                        payment === method ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 border-t bg-muted/30">
              <Button onClick={handleSubmit} className="w-full h-12 text-lg">
                Registrar Pedido (R$ {finalTotal.toFixed(2)})
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
