import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface Props {
  expiry: string;
}

export default function PromoTimer({ expiry }: Props) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calcTime = () => {
      const diff = new Date(expiry).getTime() - new Date().getTime();
      if (diff <= 0) return "Expirado";
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `Expira em ${days} dia(s)`;
      }
      return `Expira em ${hours}h ${mins}m`;
    };
    
    setTimeLeft(calcTime());
    const interval = setInterval(() => setTimeLeft(calcTime()), 60000);
    return () => clearInterval(interval);
  }, [expiry]);

  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
      <Clock size={10} /> {timeLeft}
    </span>
  );
}
