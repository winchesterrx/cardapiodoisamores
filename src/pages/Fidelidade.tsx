import { Award, Search, ChevronLeft, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/menu/BottomNav";
import { useState, useEffect } from "react";
import { fetchCustomerPoints, fetchLoyaltySettings } from "@/data/menuData";
import type { LoyaltySettings } from "@/data/menuData";

export default function Fidelidade() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState(localStorage.getItem("digitalmenu_customer_cpf") || "");
  const [pontos, setPontos] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);

  useEffect(() => {
    fetchLoyaltySettings().then(setSettings);
  }, []);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSearch = async () => {
    const rawCpf = cpf.replace(/\D/g, "");
    if (rawCpf.length !== 11) {
      alert("Por favor, digite um CPF válido.");
      return;
    }
    setLoading(true);
    const p = await fetchCustomerPoints(rawCpf);
    setPontos(p);
    setLoading(false);
    localStorage.setItem("digitalmenu_customer_cpf", rawCpf);
  };

  const ptsNeeded = Number(settings?.points_for_discount) || 10;
  const discountVal = Number(settings?.discount_amount) || 1;
  const faltam = ptsNeeded - ((pontos || 0) % ptsNeeded);
  const progresso = ((pontos || 0) % ptsNeeded) / ptsNeeded * 100;

  return (
    <div className="min-h-screen bg-background pb-[100px] lg:pb-0 w-full overflow-x-hidden">
      <div className="hidden lg:flex items-center gap-4 bg-card border-b border-border px-8 py-4 sticky top-0 z-30">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-display text-foreground">Fidelidade</h1>
      </div>

      <div className="lg:hidden bg-primary text-primary-foreground px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/")} className="p-1 rounded-full active:bg-primary-foreground/20">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-display">Minha Fidelidade</h1>
        </div>
        <p className="text-primary-foreground/70 text-sm ml-9">Consulte seus pontos e descontos</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 lg:mt-12 space-y-6">
        {!settings?.active ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
            <AlertCircle size={40} className="mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-bold text-foreground">Programa Indisponível</h2>
            <p className="text-muted-foreground text-sm mt-1">
              O programa de fidelidade não está ativo no momento.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground mb-3">Consultar Saldo</h2>
              <div className="flex gap-2">
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="flex-1 border border-border rounded-xl p-3 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-4 rounded-xl flex items-center justify-center font-bold active:scale-95 transition-transform"
                >
                  {loading ? "..." : <Search size={20} />}
                </button>
              </div>
            </div>

            {pontos !== null && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center">
                <Award size={48} className="mx-auto text-accent mb-3" />
                <p className="text-5xl font-bold text-foreground leading-none">{pontos}</p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">pontos acumulados</p>

                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-muted-foreground">Progresso para o próximo desconto</span>
                    <span className="text-primary">{((pontos || 0) % ptsNeeded)} / {ptsNeeded}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-3">
                    Você tem <strong className="text-foreground">{Math.floor(pontos / ptsNeeded)} resgates</strong> de R$ {discountVal.toFixed(2)} disponíveis agora.
                    <br />
                    Gaste os pontos finalizando um novo pedido!
                  </p>
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded-2xl p-5 border border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                 Como Funciona
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-xs">1</div>
                  <p>A cada <strong>R$ {Number(settings.spent_amount).toFixed(2)}</strong> gastos em nosso app, você ganha <strong>{settings.points_earned} ponto(s)</strong>.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-xs">2</div>
                  <p>A cada <strong>{settings.points_for_discount} pontos</strong> acumulados, você pode resgatar <strong>R$ {Number(settings.discount_amount).toFixed(2)} de desconto</strong> na sua próxima compra.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-xs">3</div>
                  <p>O melhor de tudo? Seu saldo acumula automaticamente associado ao seu CPF assim que um pedido for enviado.</p>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
