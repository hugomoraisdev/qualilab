import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import {
  FlaskConical,
  Tag,
  AlertTriangle,
  ShieldAlert,
  Truck,
  Gauge,
  ListChecks,
  Users,
  ScrollText,
  Mail,
  Loader2,
  Gauge as GaugeIcon,
  GraduationCap,
  FileText,
  CheckSquare,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestEmail } from "@/lib/test-email.functions";
import { toast } from "sonner";

const SECTIONS: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  to?: string;
}[] = [
  {
    icon: FlaskConical,
    title: "Unidades / Setores",
    desc: "Cadastro de unidades e restrição de módulos por unidade",
    to: "/lab-units",
  },
  {
    icon: Tag,
    title: "Categorias de documentos",
    desc: "Manual, POP, Instrução, Política, Registro, Formulário",
  },
  {
    icon: AlertTriangle,
    title: "Tipos de ocorrência",
    desc: "NC, reclamação, desvio, oportunidade de melhoria",
  },
  { icon: ShieldAlert, title: "Tipos de risco", desc: "Categorização e taxonomia dos riscos" },
  {
    icon: Truck,
    title: "Critérios de avaliação de fornecedores",
    desc: "Pesos para qualidade, prazo, conformidade",
  },
  { icon: Gauge, title: "Periodicidade de calibração", desc: "Padrões por tipo de equipamento" },
  {
    icon: ListChecks,
    title: "Modelos de checklist",
    desc: "Checklists reutilizáveis para auditorias",
  },
  {
    icon: Users,
    title: "Perfis e permissões",
    desc: "Administrador, Gestor, Técnico, Auditor, Consulta",
    to: "/users",
  },
  {
    icon: ScrollText,
    title: "Log de auditoria",
    desc: "Trilha completa de acessos e alterações",
    to: "/audit-log",
  },
];

const EMAIL_TEMPLATES = [
  {
    type: "digest_full",
    label: "Digest completo",
    desc: "Todos os módulos: calibração, ação, competência, risco, documento e fornecedor.",
    icon: Mail,
    tone: "primary",
  },
  {
    type: "calibracao",
    label: "Calibração vencendo",
    desc: "Calibração com prazo vencido ou próximo do vencimento.",
    icon: GaugeIcon,
    tone: "warning",
  },
  {
    type: "competencia",
    label: "Competência / Treinamento",
    desc: "Treinamento vencido ou prestes a vencer para o colaborador.",
    icon: GraduationCap,
    tone: "warning",
  },
  {
    type: "risco",
    label: "Risco — tratamento atrasado",
    desc: "Prazo de tratamento de risco vencido ou próximo.",
    icon: ShieldAlert,
    tone: "destructive",
  },
  {
    type: "fornecedor",
    label: "Fornecedor — documento vencendo",
    desc: "Documento de fornecedor (ISO, licença, etc.) com validade próxima.",
    icon: Truck,
    tone: "warning",
  },
  {
    type: "documento_etapa",
    label: "Documento — prazo de etapa",
    desc: "Etapa de elaboração, revisão ou aprovação com prazo próximo.",
    icon: FileText,
    tone: "warning",
  },
  {
    type: "acao_atribuida",
    label: "Ação atribuída",
    desc: "Nova ação criada e atribuída a um responsável.",
    icon: ListChecks,
    tone: "primary",
  },
  {
    type: "documento_workflow",
    label: "Documento — aguarda aprovação",
    desc: "Responsável deve assinar uma etapa de fluxo documental.",
    icon: CheckSquare,
    tone: "primary",
  },
  {
    type: "documento_leitura",
    label: "Documento — leitura obrigatória",
    desc: "Documento aprovado que requer confirmação de leitura.",
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

function EmailTestPanel() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  async function send(type: string) {
    if (!email.trim()) {
      toast.error("Informe um e-mail de destino.");
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
      toast.error("Informe um e-mail de destino.");
      return;
    }
    for (const t of EMAIL_TEMPLATES) await send(t.type);
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm col-span-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
            <Mail className="size-4" />
          </div>
          <div>
            <div className="font-medium text-sm">Teste de notificações por e-mail</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Dispare qualquer template para um endereço de teste sem afetar usuários reais.
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="test-email-input">E-mail de destino</Label>
              <Input
                id="test-email-input"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={sendAll}
              disabled={!!loading || !email.trim()}
            >
              <Mail className="size-3.5" /> Enviar todos
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {EMAIL_TEMPLATES.map((t) => {
              const colors = TONE_CLASSES[t.tone as Tone];
              const isLoading = loading === t.type;
              const wasSent = sent[t.type];
              return (
                <div
                  key={t.type}
                  className="border border-border rounded-lg p-3 flex flex-col gap-2.5 bg-background"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`size-7 rounded-md grid place-items-center shrink-0 ${colors.icon}`}
                    >
                      <t.icon className="size-3.5" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${colors.badge}`}
                    >
                      {TONE_LABEL[t.tone as Tone]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-xs">{t.label}</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={wasSent ? "outline" : "default"}
                    className="w-full h-7 text-xs"
                    onClick={() => send(t.type)}
                    disabled={isLoading || !email.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : wasSent ? (
                      <CheckSquare className="size-3 text-success" />
                    ) : (
                      <Mail className="size-3" />
                    )}
                    {wasSent ? "Enviado" : "Enviar teste"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  useAuditAccess("settings");
  return (
    <>
      <PageHeader title="Configurações" description="Parâmetros gerais do sistema QualiLab" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <EmailTestPanel />
        {SECTIONS.map((s) => {
          const inner = (
            <>
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary mb-3">
                <s.icon className="size-4" />
              </div>
              <div className="font-medium text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
            </>
          );
          const cls =
            "block text-left bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all";
          return s.to ? (
            <Link key={s.title} to={s.to} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={s.title} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>
    </>
  );
}
