import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Building2, FlaskConical, Tag, AlertTriangle, ShieldAlert, Truck, Gauge, ListChecks, Users, Shield, ScrollText, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runEmailDigest } from "@/lib/email-digest.functions";
import { toast } from "sonner";

const SECTIONS: { icon: any; title: string; desc: string; to?: string }[] = [
  { icon: Building2, title: "Dados da organização", desc: "Razão social, CNPJ, endereço e logo" },
  { icon: FlaskConical, title: "Unidades / Setores", desc: "Cadastro de unidades e restrição de módulos por unidade", to: "/lab-units" },
  { icon: Tag, title: "Categorias de documentos", desc: "Manual, POP, Instrução, Política, Registro, Formulário" },
  { icon: AlertTriangle, title: "Tipos de ocorrência", desc: "NC, reclamação, desvio, oportunidade de melhoria" },
  { icon: ShieldAlert, title: "Tipos de risco", desc: "Categorização e taxonomia dos riscos" },
  { icon: Truck, title: "Critérios de avaliação de fornecedores", desc: "Pesos para qualidade, prazo, conformidade" },
  { icon: Gauge, title: "Periodicidade de calibração", desc: "Padrões por tipo de equipamento" },
  { icon: ListChecks, title: "Modelos de checklist", desc: "Checklists reutilizáveis para auditorias" },
  { icon: Users, title: "Perfis e permissões", desc: "Administrador, Gestor, Técnico, Auditor, Consulta", to: "/users" },
  { icon: ScrollText, title: "Log de auditoria", desc: "Trilha completa de acessos e alterações", to: "/audit-log" },
  { icon: Shield, title: "Conformidade & Segurança", desc: "LGPD, política de dados, backup, monitoramento e disponibilidade", to: "/compliance" },
];

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function EmailTestCard() {
  const [sending, setSending] = useState(false);

  const handleSendTest = async () => {
    setSending(true);
    try {
      const result = await runEmailDigest({ data: { force: true } });
      const { sent } = result as { sent: number };
      toast.success("Email digest enviado", {
        description: sent > 0 ? `${sent} destinatário(s) notificado(s).` : "Nenhum alerta pendente no momento.",
      });
    } catch (e: any) {
      toast.error("Falha ao enviar email de teste", { description: e?.message ?? "Erro desconhecido" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm col-span-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <Mail className="size-4" />
          </div>
          <div>
            <div className="font-medium text-sm">Notificações por e-mail</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Dispara o digest diário agora — calibrações, ações, riscos, documentos e fornecedores.
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendTest}
          disabled={sending}
          data-testid="send-test-email"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {sending ? "Enviando..." : "Enviar digest de teste"}
        </Button>
      </div>
    </div>
  );
}

function SettingsPage() {
  useAuditAccess("settings");
  return (
    <>
      <PageHeader title="Configurações" description="Parâmetros gerais do sistema QualiLab" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <EmailTestCard />
        {SECTIONS.map((s) => {
          const inner = (
            <>
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary mb-3"><s.icon className="size-4" /></div>
              <div className="font-medium text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
            </>
          );
          const cls = "block text-left bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all";
          return s.to ? (
            <Link key={s.title} to={s.to} className={cls}>{inner}</Link>
          ) : (
            <button key={s.title} className={cls}>{inner}</button>
          );
        })}
      </div>
    </>
  );
}
