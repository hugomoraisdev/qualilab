import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Star, AlertTriangle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ticketsStore,
  timelineStore,
  saveTicket,
  addTimeline,
  newId,
  type TicketRow,
  type TicketStatus,
  type TimelineRow,
} from "@/lib/sac-store";
import { saveActionPlan, type ActionPlanRow } from "@/lib/action-plans-store";
import { useTableStore } from "@/lib/table-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/customer-service/$id")({ component: TicketDetail });

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  encerrado: "Encerrado",
};
const TYPE_LABEL: Record<string, string> = {
  reclamacao: "Reclamação",
  sugestao: "Sugestão",
  elogio: "Elogio",
  duvida: "Dúvida",
};

function TicketDetail() {
  useAuditAccess("customer_service");
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const tickets = useTableStore(ticketsStore);
  const timeline = useTableStore(timelineStore)
    .filter((e) => e.ticket_id === id)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  const t = tickets.find((x) => x.id === id);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    setScore(t?.satisfaction_score ?? 0);
  }, [t?.satisfaction_score]);

  if (!t) return <div className="text-sm text-muted-foreground">Atendimento não encontrado.</div>;

  const update = async (patch: Partial<TicketRow>, action: string) => {
    await saveTicket({ ...t, ...patch });
    const ev: TimelineRow = {
      id: newId("TL"),
      ticket_id: t.id,
      author_id: user?.id ?? null,
      author_name: user?.name ?? "—",
      action,
    };
    await addTimeline(ev);
  };

  const setStatus = async (status: TicketStatus) => {
    await update({ status }, `Status alterado para "${STATUS_LABEL[status]}"`);
    toast.success("Status atualizado");
  };

  const linkOccurrence = async () => {
    await update(
      { linked_occurrence_id: "OC-" + Math.floor(Math.random() * 900 + 100) },
      "Não conformidade aberta a partir deste atendimento",
    );
    toast.success("Não conformidade vinculada", {
      description: "Redirecionando para nova ocorrência…",
    });
    setTimeout(() => navigate({ to: "/occurrences" }), 800);
  };

  const setSat = async (n: number) => {
    setScore(n);
    await update({ satisfaction_score: n }, `Pesquisa de satisfação registrada: ${n}/5`);
  };

  const createActionPlan = async () => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    const ap: ActionPlanRow = {
      id: newId("AP"),
      code: null,
      origin_type: "sac",
      origin_id: t.id,
      description: `Resolução do atendimento ${t.protocol} — ${TYPE_LABEL[t.type]}: ${t.description.slice(0, 120)}`,
      responsible_id: t.assigned_to,
      deadline: deadline.toISOString().slice(0, 10),
      priority: t.priority === "critica" || t.priority === "alta" ? "alta" : "media",
      status: "aberto",
      progress: 0,
      notes: null,
    };
    await saveActionPlan(ap);
    await update({ status: "em_andamento" }, `Plano de ação ${ap.id} criado`);
    toast.success("Plano de ação criado", {
      description: "Acesse a seção Planos de Ação para acompanhar.",
      action: { label: "Ver planos", onClick: () => window.location.assign("/action-plans") },
    });
  };

  return (
    <>
      <Link
        to="/customer-service"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={`Protocolo ${t.protocol}`}
        description={`${t.customer_name} · ${TYPE_LABEL[t.type]}`}
        actions={
          <>
            <StatusBadge>{t.priority}</StatusBadge>
            <StatusBadge>{STATUS_LABEL[t.status]}</StatusBadge>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Descrição</h3>
            <p className="text-sm whitespace-pre-wrap">{t.description}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Ações</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatus("em_andamento")}>
                Em andamento
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("aguardando_cliente")}>
                Aguardando cliente
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("encerrado")}>
                Encerrar
              </Button>
              {!t.linked_occurrence_id && (
                <Button size="sm" onClick={linkOccurrence}>
                  <AlertTriangle className="size-4" /> Abrir Não Conformidade
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={createActionPlan}>
                <ListChecks className="size-4" /> Gerar plano de ação
              </Button>
            </div>
            {t.linked_occurrence_id && (
              <div className="mt-3 text-xs">
                Vinculado à ocorrência{" "}
                <span className="font-mono text-primary">{t.linked_occurrence_id}</span>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Linha do tempo ({timeline.length})</h3>
            <ol className="space-y-2.5">
              {timeline.map((e) => (
                <li key={e.id} className="text-sm border-l-2 border-primary/30 pl-3">
                  <div className="text-xs text-muted-foreground">
                    {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"} ·{" "}
                    {e.author_name}
                  </div>
                  <div>{e.action}</div>
                </li>
              ))}
              {!timeline.length && (
                <li className="text-xs text-muted-foreground italic">Sem eventos.</li>
              )}
            </ol>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Dados</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cliente</dt>
                <dd>{t.customer_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="text-xs">{t.contact_email || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Origem</dt>
                <dd>{t.origin === "portal" ? "Portal /sac" : "Interno"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Responsável</dt>
                <dd>{t.assigned_to_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aberto em</dt>
                <dd className="text-xs">
                  {t.created_at ? new Date(t.created_at).toLocaleString("pt-BR") : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Atualizado</dt>
                <dd className="text-xs">
                  {t.updated_at ? new Date(t.updated_at).toLocaleString("pt-BR") : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Pesquisa de satisfação</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setSat(n)}>
                  <Star
                    className={cn(
                      "size-7 transition-colors",
                      n <= score ? "fill-warning text-warning" : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {score > 0 ? `Avaliação: ${score}/5` : "Aguardando avaliação"}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
