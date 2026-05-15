import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Star, AlertTriangle, ListChecks, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { saveOccurrence, type OccurrenceRow } from "@/lib/occurrences-store";
import { useTableStore } from "@/lib/table-store";
import { useAuth } from "@/lib/auth";
import { useCustomFields } from "@/lib/custom-fields-store";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { CustomFieldsAdmin } from "@/components/CustomFieldsAdmin";
import { useSacMeta, upsertSacMeta } from "@/lib/sac-meta-store";
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
  const sacFields = useCustomFields("sac");
  const [customValues, setCustomValues] = useSacMeta(id);
  const [showCfAdmin, setShowCfAdmin] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [investigation, setInvestigation] = useState("");

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
    const ocId = newId("OC");
    const oc: OccurrenceRow = {
      id: ocId,
      code: null,
      type: "Não Conformidade",
      origin: "SAC",
      description: `[SAC ${t.protocol}] ${t.description}`,
      occurred_at: new Date().toISOString().slice(0, 10),
      responsible_id: t.assigned_to,
      severity: t.priority === "critica" ? "Crítica" : t.priority === "alta" ? "Alta" : "Média",
      status: "Aberta",
      immediate_action: null,
      root_cause: null,
      linked_audit_id: null,
      linked_document_id: null,
    };
    await saveOccurrence(oc);
    await update(
      { linked_occurrence_id: ocId },
      `Não conformidade ${ocId} aberta a partir deste atendimento`,
    );
    toast.success("Não conformidade criada", {
      description: `Protocolo vinculado: ${ocId}. Redirecionando…`,
    });
    setTimeout(() => navigate({ to: "/occurrences/$id", params: { id: ocId } }), 800);
  };

  const setSat = async (n: number) => {
    setScore(n);
    await update({ satisfaction_score: n }, `Pesquisa de satisfação registrada: ${n}/5`);
  };

  const saveInvestigation = async () => {
    if (!investigation.trim()) return;
    const ev: TimelineRow = {
      id: newId("TL"),
      ticket_id: t.id,
      author_id: user?.id ?? null,
      author_name: user?.name ?? "—",
      action: `Investigação: ${investigation.trim()}`,
    };
    await addTimeline(ev);
    setInvestigation("");
    toast.success("Investigação registrada na linha do tempo");
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
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Search className="size-4 text-primary" /> Investigação / diagnóstico
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Registre a análise prévia antes de decidir abrir uma Não Conformidade ou plano de
              ação.
            </p>
            <Textarea
              rows={3}
              value={investigation}
              onChange={(e) => setInvestigation(e.target.value)}
              placeholder="Descreva a investigação, causa provável, impacto ou contexto observado…"
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={saveInvestigation}
                disabled={!investigation.trim()}
              >
                Registrar investigação
              </Button>
            </div>
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

          {(sacFields.length > 0 || showCfAdmin) && (
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="size-4 text-primary" /> Campos personalizados
                </h3>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCfAdmin((v) => !v)}
                >
                  {showCfAdmin ? "Fechar admin" : "Configurar campos"}
                </button>
              </div>
              {showCfAdmin && <CustomFieldsAdmin scope="sac" />}
              {!showCfAdmin && sacFields.length > 0 && (
                <>
                  <CustomFieldsRenderer
                    fields={sacFields}
                    values={customValues}
                    onChange={(key, val) => setCustomValues({ ...customValues, [key]: val })}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await upsertSacMeta(id, customValues);
                        toast.success("Campos salvos");
                      }}
                    >
                      Salvar campos
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {sacFields.length === 0 && !showCfAdmin && (
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                onClick={() => setShowCfAdmin(true)}
              >
                <Settings2 className="size-3" /> Configurar campos personalizados para este módulo
              </button>
            </div>
          )}

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
