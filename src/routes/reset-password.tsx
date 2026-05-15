import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (password !== confirm) { toast.error("As senhas não coincidem"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Senha redefinida com sucesso");
      setTimeout(() => navigate({ to: "/login" }), 2500);
    } catch (err) {
      toast.error((err as Error).message);
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
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">Redefinição de senha</h1>
          <p className="text-sm text-sidebar-foreground/70">Escolha uma nova senha segura para acessar sua conta.</p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} QualiLab</div>
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

          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="size-14 text-success mx-auto" />
              <h2 className="text-xl font-semibold">Senha redefinida!</h2>
              <p className="text-sm text-muted-foreground">Redirecionando para o login…</p>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-4">
              <Loader2 className="size-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Validando link de redefinição…</p>
              <p className="text-xs text-muted-foreground">Se demorar, clique no link do e-mail novamente.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Nova senha</h2>
                  <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 6 caracteres.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar nova senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Redefinir senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
