import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Eye, EyeOff, MailCheck, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type View = "login" | "forgot" | "sent";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Acesso autorizado");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setView("sent");
    } catch (err) {
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Lado branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="QualiLab"
            className="size-12 rounded-xl object-contain bg-white p-1.5 shadow-sm ring-1 ring-white/10"
          />
          <div>
            <div className="font-semibold text-lg tracking-tight">QualiLab</div>
            <div className="text-xs text-sidebar-foreground/60">
              Gestão da Qualidade Laboratorial
            </div>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Gestão da qualidade <span className="text-sidebar-primary">simples e integrada</span>
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Uma plataforma corporativa para organizar processos, garantir conformidade e dar
            visibilidade às operações.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li>• Controle de documentos e versões</li>
            <li>• Indicadores e relatórios em tempo real</li>
            <li>• Gestão de riscos e planos de ação</li>
            <li>• Auditorias e checklists configuráveis</li>
            <li>• Rastreabilidade completa das ações</li>
          </ul>
        </div>

        <div className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} QualiLab · Ambiente de Demonstração POC
        </div>
      </div>

      {/* Lado formulário */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img
              src={logo}
              alt="QualiLab"
              className="size-12 rounded-xl object-contain bg-white p-1.5 ring-1 ring-border"
            />
            <div>
              <div className="font-semibold text-lg tracking-tight">QualiLab</div>
              <div className="text-xs text-muted-foreground">Gestão da Qualidade</div>
            </div>
          </div>

          {view === "login" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Acessar a plataforma</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Entre com seu usuário corporativo.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
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
                  Entrar
                </Button>
              </form>
            </>
          )}

          {view === "forgot" && (
            <>
              <button
                type="button"
                onClick={() => setView("login")}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="size-4 mr-1" /> Voltar ao login
              </button>
              <h2 className="text-2xl font-semibold tracking-tight">Redefinir senha</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Informe seu e-mail para receber o link de redefinição.
              </p>
              <form onSubmit={handleForgot} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="seu@email.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Enviar link de redefinição
                </Button>
              </form>
            </>
          )}

          {view === "sent" && (
            <div className="text-center space-y-4">
              <div className="size-14 rounded-full bg-primary/10 grid place-items-center mx-auto">
                <MailCheck className="size-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">E-mail enviado</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de redefinição para{" "}
                <span className="font-medium text-foreground">{forgotEmail}</span>. Verifique sua
                caixa de entrada e clique no link para criar uma nova senha.
              </p>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setForgotEmail("");
                }}
                className="text-sm text-primary hover:underline"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
