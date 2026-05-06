import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) setIsRecovery(true);
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    if (password.length < 10) {
      toast({ title: "Error", description: "Mínimo 10 caracteres", variant: "destructive" });
      return;
    }
    if (!/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      toast({ title: "Error", description: "Debe incluir al menos un número y un carácter especial", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contraseña actualizada", description: "Ahora puede iniciar sesión." });
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Enlace inválido o expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-black text-foreground">Nueva Contraseña</h1>
        </div>
        <div className="bg-card border border-border rounded-3xl p-8">
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Nueva contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Confirmar</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase hover:opacity-90 disabled:opacity-50 min-h-[48px]">
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
