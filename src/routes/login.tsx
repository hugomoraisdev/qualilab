import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const DEMO_OPTIONS = [
  { email: "admin@qualilab.com", role: "Administrador" },
  { email: "gestor@qualilab.com", role: "Gestor da Qualidade" },
  { email: "tecnico@qualilab.com", role: "Técnico de Laboratório" },
  { email: "auditor@qualilab.com", role: "Auditor" },
];

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@qualilab.com");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Acesso autorizado");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Lado branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-sidebar-primary/15 grid place-items-center">
            <FlaskConical className="size-5 text-sidebar-primary" />
          </div>
          <div>
            <div className="font-semibold">QualiLab SaaS</div>
            <div className="text-xs text-sidebar-foreground/60">Gestão da Qualidade Laboratorial</div>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Conformidade, rastreabilidade e controle para laboratórios <span className="text-sidebar-primary">ISO/IEC 17025</span>
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Documentos, calibrações, auditorias, riscos, ocorrências, fornecedores e competências em uma única plataforma corporativa.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li>• Controle documental com versão e aprovação</li>
            <li>• Cronograma e alertas de calibração</li>
            <li>• Matriz de risco 5×5 e tratamento</li>
            <li>• Auditoria interna e externa com checklists</li>
            <li>• Log completo de rastreabilidade</li>
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
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
              <FlaskConical className="size-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">QualiLab SaaS</div>
              <div className="text-xs text-muted-foreground">ISO/IEC 17025</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Acessar a plataforma</h2>
          <p className="text-sm text-muted-foreground mt-1">Entre com seu usuário corporativo.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button type="button" onClick={() => toast.info("Em ambiente POC: use demo123")} className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </button>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4">
            <div className="text-xs font-semibold text-foreground mb-2">Usuários de demonstração</div>
            <div className="grid gap-1.5">
              {DEMO_OPTIONS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword("demo123"); }}
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-background transition-colors"
                >
                  <span className="font-mono">{u.email}</span>
                  <span className="text-muted-foreground">{u.role}</span>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Senha: <span className="font-mono">demo123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
