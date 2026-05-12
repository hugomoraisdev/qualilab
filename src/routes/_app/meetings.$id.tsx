import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CalendarDays, ClipboardList, Forward, CheckCircle2, Plus } from "lucide-react";
import {
  getMeeting, saveMeeting, listMeetings, findNextMeeting, newId,
  type Meeting, type AgendaItem, type AgendaStatus,
} from "@/lib/meetings-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/meetings/$id")({ component: MeetingDetail });

const STATUSES: AgendaStatus[] = ["Pendente", "Abordada", "Postergada", "Cancelada"];

function MeetingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | undefined>();
  const [newAgenda, setNewAgenda] = useState("");
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [targetMeetingId, setTargetMeetingId] = useState<string>("");

  function refresh() {
    setMeeting(getMeeting(id));
    setAllMeetings(listMeetings());
  }
  useEffect(() => { refresh(); }, [id]);

  if (!meeting) {
    return (
      <>
        <Link to="/meetings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar para reuniões
        </Link>
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Reunião não encontrada. Crie uma nova em <Link to="/meetings/new" className="text-primary underline">Nova reunião</Link>.
        </div>
      </>
    );
  }

  function updateAgendaStatus(itemId: string, status: AgendaStatus) {
    if (!meeting) return;
    const updated: Meeting = {
      ...meeting,
      agenda: meeting.agenda.map((a) => (a.id === itemId ? { ...a, status } : a)),
    };
    saveMeeting(updated);
    refresh();
  }

  function addAgenda() {
    if (!meeting || !newAgenda.trim()) return;
    const item: AgendaItem = { id: newId("A"), title: newAgenda.trim(), status: "Pendente" };
    saveMeeting({ ...meeting, agenda: [...meeting.agenda, item] });
    setNewAgenda("");
    refresh();
  }

  function postponePending() {
    if (!meeting) return;
    const pending = meeting.agenda.filter((a) => a.status === "Pendente");
    if (!pending.length) { toast.info("Nenhuma pauta pendente para postergar."); return; }

    let target = targetMeetingId ? getMeeting(targetMeetingId) : findNextMeeting(meeting);
    if (!target) {
      // cria nova reunião automaticamente em +7 dias
      const nextDate = new Date(meeting.date + "T00:00:00");
      nextDate.setDate(nextDate.getDate() + 7);
      const created: Meeting = {
        id: newId("RU"),
        type: meeting.type + " (continuação)",
        date: nextDate.toISOString().slice(0, 10),
        time: meeting.time,
        participants: meeting.participants,
        agenda: [],
        status: "Agendada",
      };
      saveMeeting(created);
      target = created;
      toast.success("Nova reunião criada para receber as pautas postergadas.");
    }

    // marca no atual como Postergada e copia para o destino
    const transferred: AgendaItem[] = pending.map((a) => ({
      ...a, id: newId("A"), status: "Pendente", fromMeetingId: meeting.id,
      notes: `Postergada da reunião ${meeting.id}`,
    }));
    saveMeeting({
      ...target,
      agenda: [...target.agenda, ...transferred],
    });
    saveMeeting({
      ...meeting,
      agenda: meeting.agenda.map((a) => (a.status === "Pendente" ? { ...a, status: "Postergada" } : a)),
    });
    toast.success(`${pending.length} pauta(s) postergadas para ${target.id}`);
    refresh();
  }

  function finalize() {
    if (!meeting) return;
    saveMeeting({ ...meeting, status: "Realizada" });
    toast.success("Reunião marcada como realizada.");
    refresh();
  }

  const otherMeetings = allMeetings.filter((m) => m.id !== meeting.id && m.date >= meeting.date);

  return (
    <>
      <Link to="/meetings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar para reuniões
      </Link>

      <PageHeader
        title={meeting.type}
        description={`Código ${meeting.id} · ${meeting.date}${meeting.time ? " às " + meeting.time : ""}`}
        actions={
          <>
            <StatusBadge>{meeting.status}</StatusBadge>
            {meeting.status !== "Realizada" && (
              <Button size="sm" variant="outline" onClick={finalize}>
                <CheckCircle2 className="size-4" /> Marcar como realizada
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" /> Pautas ({meeting.agenda.length})
          </h3>

          <div className="space-y-2">
            {meeting.agenda.map((a) => (
              <div key={a.id} className={cn(
                "border border-border rounded-md p-3 flex flex-wrap items-center gap-3",
                a.status === "Postergada" && "bg-warning/5",
                a.status === "Cancelada" && "opacity-60",
              )}>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium">{a.title}</div>
                  {a.fromMeetingId && (
                    <div className="text-[11px] text-muted-foreground">
                      <Forward className="size-3 inline mr-1" /> Postergada da reunião {a.fromMeetingId}
                    </div>
                  )}
                </div>
                <select
                  value={a.status}
                  onChange={(e) => updateAgendaStatus(a.id, e.target.value as AgendaStatus)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <StatusBadge>{a.status}</StatusBadge>
              </div>
            ))}
            {!meeting.agenda.length && (
              <div className="text-sm text-muted-foreground italic text-center py-4">Sem pautas cadastradas.</div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Adicionar nova pauta…"
              value={newAgenda}
              onChange={(e) => setNewAgenda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAgenda()}
            />
            <Button size="sm" variant="outline" onClick={addAgenda}><Plus className="size-4" /> Adicionar</Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="size-4" /> Informações
            </h3>
            <dl className="text-sm space-y-2">
              <div><dt className="text-xs text-muted-foreground">Data</dt><dd>{meeting.date}{meeting.time && " às " + meeting.time}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Participantes</dt>
                <dd className="text-xs">{meeting.participants.join(", ")}</dd></div>
              {meeting.recurrence && (
                <div><dt className="text-xs text-muted-foreground">Recorrência</dt>
                  <dd>{meeting.recurrence.frequency} · {meeting.recurrence.occurrences}x</dd></div>
              )}
              {meeting.recurrenceParentId && (
                <div><dt className="text-xs text-muted-foreground">Origem da série</dt>
                  <dd className="font-mono text-xs">{meeting.recurrenceParentId}</dd></div>
              )}
            </dl>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Forward className="size-4 text-primary" /> Postergar pautas pendentes
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Pautas com status <span className="font-medium">Pendente</span> serão movidas para a reunião selecionada
              (ou uma nova será criada automaticamente).
            </p>
            <div className="space-y-2">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={targetMeetingId}
                onChange={(e) => setTargetMeetingId(e.target.value)}
              >
                <option value="">Próxima reunião disponível ou criar nova</option>
                {otherMeetings.map((m) => (
                  <option key={m.id} value={m.id}>{m.id} — {m.type} ({m.date})</option>
                ))}
              </select>
              <Button className="w-full" size="sm" onClick={postponePending}>
                Postergar pautas pendentes
              </Button>
              <Button className="w-full" size="sm" variant="outline" onClick={() => navigate({ to: "/meetings/new" })}>
                <Plus className="size-4" /> Criar nova reunião
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
