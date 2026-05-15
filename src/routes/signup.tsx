import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, name);
      // Auto-confirm está habilitado, então tentamos login direto
      await login(email, password);
      toast.success("Conta criada com sucesso");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Não foi possível criar a conta. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <img src={logo} alt="QualiLab" className="size-12 rounded-xl object-contain bg-white p-1.5 shadow-sm ring-1 ring-white/10" />
          <div>
            <div className="font-semibold text-lg tracking-tight">QualiLab</div>
            <div className="text-xs text-sidebar-foreground/60">Gestão da Qualidade Laboratorial</div>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Crie sua conta <span className="text-sidebar-primary">corporativa</span>
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Após o cadastro, um administrador atribuirá seu papel de acesso (Gestor, Técnico, Auditor ou Consulta).
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} QualiLab
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={logo} alt="QualiLab" className="size-12 rounded-xl object-contain bg-white p-1.5 ring-1 ring-border" />
            <div>
              <div className="font-semibold text-lg tracking-tight">QualiLab</div>
              <div className="text-xs text-muted-foreground">Gestão da Qualidade</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
          <p className="text-sm text-muted-foreground mt-1">Preencha seus dados para acessar a plataforma.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Criar conta
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
