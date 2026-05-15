import { createFileRoute } from "@tanstack/react-router";
import { useAuditAccess } from "@/lib/audit";
import { useRouteGuard } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Lock, Database, Activity, ServerCog, FileCheck2,
  HardDriveDownload, KeyRound, ScrollText, Eye, AlertTriangle, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_app/compliance")({ component: CompliancePage });

type Item = { icon: any; title: string; status: "ok" | "info" | "warn"; desc: string };

const STATUS_TONE: Record<Item["status"], string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
};
const STATUS_LABEL: Record<Item["status"], string> = {
  ok: "Atendido",
  info: "Gerenciado pela infraestrutura",
  warn: "Atenção",
};

function Section({ title, icon: Icon, items }: { title: string; icon: any; items: Item[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {items.map((it) => (
          <div key={it.title} className="flex items-start gap-3 px-4 py-3">
            <div className="size-8 rounded-md bg-primary/10 grid place-items-center text-primary shrink-0">
              <it.icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{it.title}</div>
                <Badge variant="outline" className={STATUS_TONE[it.status]}>{STATUS_LABEL[it.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompliancePage() {
  useAuditAccess("compliance");
  useRouteGuard("all"); // compliance só é acessível a admin
  const lgpd: Item[] = [
    { icon: ScrollText, title: "Base legal e finalidade", status: "ok", desc: "Tratamento de dados restrito à execução do sistema de gestão da qualidade (legítimo interesse e cumprimento de obrigação legal)." },
    { icon: Eye, title: "Direitos do titular", status: "ok", desc: "Acesso, retificação e exclusão atendidos via Configurações → Conta. Solicitações formais devem ser enviadas ao Encarregado (DPO)." },
    { icon: KeyRound, title: "Minimização de dados", status: "ok", desc: "São coletados apenas dados necessários (e-mail, nome, papel) e dados gerados pela operação do laboratório." },
    { icon: Lock, title: "Confidencialidade", status: "ok", desc: "Acesso restrito por papel e por módulo. Documentos podem ser marcados com classificação (público / interno / restrito / confidencial) na ficha do documento." },
    { icon: FileCheck2, title: "Política de privacidade", status: "ok", desc: "Aviso de privacidade disponível ao usuário na primeira sessão e nesta página." },
  ];

  const seguranca: Item[] = [
    { icon: Shield, title: "Criptografia em trânsito (TLS)", status: "info", desc: "Toda comunicação cliente ↔ servidor é cifrada com TLS 1.2+." },
    { icon: Lock, title: "Criptografia em repouso", status: "info", desc: "Banco de dados e arquivos cifrados em repouso pela infraestrutura Lovable Cloud." },
    { icon: KeyRound, title: "Controle de acesso (RLS)", status: "ok", desc: "Row-Level Security ativo em todas as tabelas; cada papel só enxerga e altera o que sua função permite." },
    { icon: ServerCog, title: "Hardening da plataforma", status: "info", desc: "Patches de SO, banco e runtime aplicados continuamente pela infraestrutura gerenciada." },
  ];

  const continuidade: Item[] = [
    { icon: HardDriveDownload, title: "Backup automático diário", status: "info", desc: "Snapshots completos do banco com retenção mínima de 7 dias (Point-in-Time Recovery disponível)." },
    { icon: Database, title: "Replicação", status: "info", desc: "Banco com réplica gerenciada para failover, garantindo continuidade em caso de falha." },
    { icon: Activity, title: "Monitoramento 24/7", status: "info", desc: "Métricas de banco, autenticação e API monitoradas continuamente; alertas automáticos para a equipe de plataforma." },
    { icon: CheckCircle2, title: "SLA de disponibilidade", status: "info", desc: "Disponibilidade alvo de 99,9% mensal. Status público da infraestrutura disponível em tempo real." },
    { icon: AlertTriangle, title: "Plano de recuperação", status: "ok", desc: "Procedimento de restauração documentado: RPO ≤ 24h, RTO ≤ 4h." },
  ];

  const rastreabilidade: Item[] = [
    { icon: ScrollText, title: "Logs de acesso", status: "ok", desc: "Cada login e logout é registrado em audit_logs (módulo 'auth')." },
    { icon: ScrollText, title: "Logs de alteração", status: "ok", desc: "Toda criação, edição e exclusão grava antes/depois, ator e horário (trigger log_table_audit)." },
    { icon: ScrollText, title: "Histórico de versões", status: "ok", desc: "Documentos, competências e ações mantêm versão e revisões auditáveis." },
  ];

  return (
    <>
      <PageHeader
        title="Conformidade & Segurança"
        description="LGPD, política de proteção de dados, backup, monitoramento e disponibilidade"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="LGPD e Proteção de Dados" icon={Shield} items={lgpd} />
        <Section title="Segurança da Informação" icon={Lock} items={seguranca} />
        <Section title="Backup, Monitoramento e Disponibilidade" icon={Activity} items={continuidade} />
        <Section title="Rastreabilidade e Auditoria" icon={ScrollText} items={rastreabilidade} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Encarregado de Dados (DPO)</p>
        <p>Solicitações relacionadas à LGPD devem ser direcionadas ao Encarregado da organização. Configure o e-mail de contato em Configurações → Dados da organização.</p>
      </div>
    </>
  );
}
