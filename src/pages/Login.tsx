import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Heart, Shield, Users, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import loginHero from "@/assets/login-hero.jpg";
import logo from "@/assets/logo.png";

const ROLES_INFO = [
  { key: 'super_admin', label: 'Super Admin', icon: Shield, desc: 'Acceso total al sistema' },
  { key: 'coordinador', label: 'Coordinador', icon: Users, desc: 'Gestión operativa y clínica' },
  { key: 'enfermera', label: 'Enfermera', icon: Activity, desc: 'Salud diaria y medicamentos' },
  { key: 'cuidadora', label: 'Cuidadora', icon: Heart, desc: 'Bienestar y acompañamiento' },
  { key: 'terapeuta', label: 'Terapeuta', icon: Activity, desc: 'Terapias y valoraciones' },
  { key: 'psicologo', label: 'Psicólogo', icon: Heart, desc: 'Atención psicosocial' },
  { key: 'administrativo', label: 'Administrativo', icon: Shield, desc: 'Finanzas y gerencia' },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error de autenticación", description: error.message, variant: "destructive" });
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
    <div className="min-h-screen flex">
      {/* Left side - Hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={loginHero} alt="Cuidado geriátrico" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-black leading-tight mb-3">Cuidamos con<br />amor y dignidad</h2>
          <p className="text-sm text-white/80 max-w-md">
            Sistema integral de gestión para el cuidado geriátrico. 
            Hogar Belén Buesaco S.A.S. — Nariño, Colombia.
          </p>
          <div className="flex items-center gap-6 mt-8">
            <div className="text-center">
              <p className="text-2xl font-black">12</p>
              <p className="text-[10px] uppercase tracking-widest text-white/60">Cupos</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">26</p>
              <p className="text-[10px] uppercase tracking-widest text-white/60">Formatos</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">12</p>
              <p className="text-[10px] uppercase tracking-widest text-white/60">Protocolos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logo} alt="Hogar Belén" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
            <h1 className="text-2xl font-black text-foreground tracking-tight">HOGAR BELÉN</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Buesaco S.A.S. • Sistema de Gestión Geriátrica</p>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Seleccione su rol</p>
            <div className="grid grid-cols-4 gap-2">
              {ROLES_INFO.map(r => {
                const Icon = r.icon;
                const isActive = selectedRole === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setSelectedRole(r.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center min-h-[48px] ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[9px] font-bold leading-tight">{r.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedRole && (
              <p className="text-[10px] text-primary font-medium mt-2 text-center animate-fade-in">
                {ROLES_INFO.find(r => r.key === selectedRole)?.desc}
              </p>
            )}
          </div>

          {/* Form card */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    placeholder="usuario@hogarbelen.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contraseña</label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none pr-12"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="w-full text-xs text-primary font-bold hover:underline"
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
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
                >
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-xs text-primary font-bold hover:underline"
                >
                  Volver al login
                </button>
              </form>
            )}
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
