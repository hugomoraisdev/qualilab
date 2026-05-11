import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTicket, saveTicket, type CustomerTicket, type TicketStatus } from "@/lib/sac-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/customer-service/$id")({ component: TicketDetail });

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto", em_andamento: "Em andamento", aguardando_cliente: "Aguardando cliente", encerrado: "Encerrado",
};
const TYPE_LABEL: Record<string, string> = {
  reclamacao: "Reclamação", sugestao: "Sugestão", elogio: "Elogio", duvida: "Dúvida",
};

function TicketDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [t, setT] = useState<CustomerTicket | undefined>();
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    const found = getTicket(id);
    setT(found);
    setScore(found?.satisfactionScore ?? 0);
  }, [id]);

  if (!t) return <div className="text-sm text-muted-foreground">Atendimento não encontrado.</div>;

  const update = (patch: Partial<CustomerTicket>, action: string) => {
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const next: CustomerTicket = {
      ...t, ...patch, updatedAt: now,
      timeline: [...t.timeline, { date: now, author: user?.name ?? "—", action }],
    };
    saveTicket(next);
    setT(next);
  };

  const setStatus = (status: TicketStatus) => {
    update({ status }, `Status alterado para "${STATUS_LABEL[status]}"`);
    toast.success("Status atualizado");
  };

  const linkOccurrence = () => {
    update({ linkedOccurrenceId: "OC-" + Math.floor(Math.random() * 900 + 100) }, "Não conformidade aberta a partir deste atendimento");
    toast.success("Não conformidade vinculada", { description: "Redirecionando para nova ocorrência…" });
    setTimeout(() => navigate({ to: "/occurrences" }), 800);
  };

  const setSat = (n: number) => {
    setScore(n);
    update({ satisfactionScore: n as 1 | 2 | 3 | 4 | 5 }, `Pesquisa de satisfação registrada: ${n}/5`);
  };

  return (
    <>
      <Link to="/customer-service" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader
        title={`Protocolo ${t.protocol}`}
        description={`${t.customerName} · ${TYPE_LABEL[t.type]}`}
        actions={<><StatusBadge>{t.priority}</StatusBadge><StatusBadge>{STATUS_LABEL[t.status]}</StatusBadge></>}
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
              <Button size="sm" variant="outline" onClick={() => setStatus("em_andamento")}>Em andamento</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("aguardando_cliente")}>Aguardando cliente</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("encerrado")}>Encerrar</Button>
              {!t.linkedOccurrenceId && (
                <Button size="sm" onClick={linkOccurrence}><AlertTriangle className="size-4" /> Abrir Não Conformidade</Button>
              )}
            </div>
            {t.linkedOccurrenceId && (
              <div className="mt-3 text-xs">
                Vinculado à ocorrência <span className="font-mono text-primary">{t.linkedOccurrenceId}</span>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Linha do tempo</h3>
            <ol className="space-y-2.5">
              {t.timeline.map((e, i) => (
                <li key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                  <div className="text-xs text-muted-foreground">{e.date} · {e.author}</div>
                  <div>{e.action}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Dados</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Cliente</dt><dd>{t.customerName}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd className="text-xs">{t.contactEmail || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Origem</dt><dd>{t.origin === "portal" ? "Portal /sac" : "Interno"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Responsável</dt><dd>{t.assignedTo}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Aberto em</dt><dd>{t.createdAt}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Atualizado</dt><dd>{t.updatedAt}</dd></div>
            </dl>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Pesquisa de satisfação</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setSat(n)}>
                  <Star className={cn("size-7 transition-colors", n <= score ? "fill-warning text-warning" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">{score > 0 ? `Avaliação: ${score}/5` : "Aguardando avaliação"}</div>
          </div>
        </aside>
      </div>
    </>
  );
}
