import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import loginHero from "@/assets/login-hero.webp";
import logo from "@/assets/logo.png";
import InstallAppButton from "@/components/InstallAppButton";

const friendlyAuthError = (message: string) => {
  if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos. Revísalos e intenta de nuevo.";
  if (/email not confirmed/i.test(message)) return "Tu correo aún no está confirmado. Revisa tu bandeja de entrada.";
  if (/failed to fetch|network/i.test(message)) return "Sin conexión a internet. Verifica tu red e intenta de nuevo.";
  if (/rate limit|too many/i.test(message)) return "Demasiados intentos. Espera un momento antes de volver a intentar.";
  return message;
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "No pudimos iniciar sesión", description: friendlyAuthError(error.message), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Correo enviado", description: "Revise su bandeja de entrada para restablecer la contraseña." });
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={loginHero}
          alt="Cuidado geriátrico profesional"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-10 xl:p-14 text-primary-foreground">
          <h2 className="text-3xl xl:text-4xl font-black leading-tight mb-3">Cuidamos con<br />amor y dignidad</h2>
          <p className="text-sm text-primary-foreground/80 max-w-md">
            Sistema integral de gestión para el cuidado geriátrico. 
            Hogar Belén Buesaco S.A.S. — Nariño, Colombia.
          </p>
          <div className="flex items-center gap-6 mt-8">
            {[
              { n: '12', l: 'Cupos' },
              { n: '26', l: 'Formatos' },
              { n: '12', l: 'Protocolos' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-10 bg-primary-foreground/20" />}
                <div className="text-center">
                  <p className="text-2xl font-black">{s.n}</p>
                  <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-background safe-top safe-bottom">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="Hogar Belén" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl shadow-sm" loading="eager" />
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">HOGAR BELÉN</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Buesaco S.A.S. • Sistema de Gestión Geriátrica</p>
          </div>

          {/* Warm welcome */}
          <div className="mb-6 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 text-center">
            <p className="text-sm font-black text-foreground">{greeting()} 👋</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gracias por cuidar hoy a nuestros abuelos. Tu trabajo hace la diferencia.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-primary focus:outline-none transition-shadow"
                    placeholder="usuario@hogarbelen.com"
                    required
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contraseña</label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-primary focus:outline-none transition-shadow pr-12"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 touch-manipulation"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px] touch-manipulation"
                >
                  {loading ? "Ingresando…" : "Ingresar"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="w-full text-xs text-primary font-bold hover:underline py-2 touch-manipulation"
                >
                  ¿Olvidó su contraseña?
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.
                </p>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Correo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-primary focus:outline-none transition-shadow"
                    required
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px] touch-manipulation"
                >
                  {loading ? "Enviando…" : "Enviar enlace"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-xs text-primary font-bold hover:underline py-2 touch-manipulation"
                >
                  Volver al login
                </button>
              </form>
            )}
          </div>

          <div className="mt-4">
            <InstallAppButton variant="card" />
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-6 font-medium">
            Hogar Belén • Gestión Segura • Hecho en Colombia 🇨🇴
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
