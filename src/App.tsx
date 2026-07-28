import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Pedidos from "./pages/Pedidos.tsx";
import Fidelidade from "./pages/Fidelidade.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Entregador from "./pages/Entregador.tsx";
import { AdminRoute, EntregadorRoute } from "./components/ProtectedRoute.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/fidelidade" element={<Fidelidade />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } />
              <Route path="/entregador" element={
                <EntregadorRoute>
                  <Entregador />
                </EntregadorRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
