import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestEmail } from "@/lib/test-email.functions";
import { toast } from "sonner";
import {
  Mail,
  Gauge,
  GraduationCap,
  ShieldAlert,
  Truck,
  FileText,
  ListChecks,
  BookOpen,
  CheckSquare,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_app/email-test")({ component: EmailTestPage });

const EMAIL_TYPES = [
  {
    type: "digest_full",
    label: "Digest completo",
    description:
      "Resumo diário com alertas de todos os módulos: calibração, ação, competência, risco, documento e fornecedor.",
    icon: Mail,
    tone: "primary",
  },
  {
    type: "calibracao",
    label: "Calibração vencendo",
    description: "Aviso de calibração com prazo vencido ou próximo do vencimento.",
    icon: Gauge,
    tone: "warning",
  },
  {
    type: "competencia",
    label: "Competência / Treinamento",
    description: "Alerta de treinamento vencido ou prestes a vencer para o colaborador.",
    icon: GraduationCap,
    tone: "warning",
  },
  {
    type: "risco",
    label: "Risco — tratamento atrasado",
    description: "Notificação de prazo de tratamento de risco vencido ou próximo.",
    icon: ShieldAlert,
    tone: "destructive",
  },
  {
    type: "fornecedor",
    label: "Fornecedor — documento vencendo",
    description: "Alerta de documento de fornecedor (ISO, licença, etc.) com validade próxima.",
    icon: Truck,
    tone: "warning",
  },
  {
    type: "documento_etapa",
    label: "Documento — prazo de etapa",
    description: "Alerta de etapa de elaboração, revisão ou aprovação com prazo próximo.",
    icon: FileText,
    tone: "warning",
  },
  {
    type: "acao_atribuida",
    label: "Ação atribuída",
    description: "E-mail enviado quando uma nova ação é criada e atribuída a um responsável.",
    icon: ListChecks,
    tone: "primary",
  },
  {
    type: "documento_workflow",
    label: "Documento — aguarda aprovação",
    description: "Notificação para o responsável assinar uma etapa de fluxo documental.",
    icon: CheckSquare,
    tone: "primary",
  },
  {
    type: "documento_leitura",
    label: "Documento — leitura obrigatória",
    description: "Aviso de novo documento aprovado que requer confirmação de leitura.",
    icon: BookOpen,
    tone: "primary",
  },
] as const;

type Tone = "primary" | "warning" | "destructive";

const TONE_CLASSES: Record<Tone, { icon: string; badge: string }> = {
  primary: {
    icon: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  warning: {
    icon: "bg-warning/10 text-warning-foreground",
    badge: "bg-warning/10 text-warning-foreground border-warning/20",
  },
  destructive: {
    icon: "bg-destructive/10 text-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const TONE_LABEL: Record<Tone, string> = {
  primary: "Informativo",
  warning: "Alerta",
  destructive: "Urgente",
};

function EmailTestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  async function send(type: string) {
    if (!email.trim()) {
      toast.error("Informe um e-mail de destino antes de enviar.");
      return;
    }
    setLoading(type);
    try {
      await sendTestEmail({ data: { to: email.trim(), type: type as never } });
      setSent((s) => ({ ...s, [type]: true }));
      toast.success("E-mail enviado", { description: `Verifique a caixa de entrada de ${email}` });
    } catch (err) {
      toast.error("Falha ao enviar", { description: (err as Error).message });
    } finally {
      setLoading(null);
    }
  }

  async function sendAll() {
    if (!email.trim()) {
      toast.error("Informe um e-mail de destino antes de enviar.");
      return;
    }
    for (const t of EMAIL_TYPES) {
      await send(t.type);
    }
  }

  return (
    <>
      <PageHeader
        title="Teste de E-mails"
        description="Dispare qualquer template de notificação para um endereço de teste, sem afetar os usuários reais."
      />

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="test-email">E-mail de destino</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Button variant="outline" onClick={sendAll} disabled={!!loading || !email.trim()}>
            {loading === "__all__" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Enviar todos
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Todos os e-mails são enviados com dados de exemplo. Nenhum usuário real é afetado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {EMAIL_TYPES.map((t) => {
          const colors = TONE_CLASSES[t.tone as Tone];
          const isLoading = loading === t.type;
          const wasSent = sent[t.type];
          return (
            <div
              key={t.type}
              className="bg-card border border-border rounded-lg p-4 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`size-9 rounded-lg grid place-items-center shrink-0 ${colors.icon}`}
                >
                  <t.icon className="size-4" />
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}
                >
                  {TONE_LABEL[t.tone as Tone]}
                </span>
              </div>

              <div className="flex-1">
                <div className="font-medium text-sm">{t.label}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <Button
                size="sm"
                variant={wasSent ? "outline" : "default"}
                className="w-full"
                onClick={() => send(t.type)}
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : wasSent ? (
                  <CheckSquare className="size-3.5 text-success" />
                ) : (
                  <Mail className="size-3.5" />
                )}
                {wasSent ? "Enviado" : "Enviar teste"}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
