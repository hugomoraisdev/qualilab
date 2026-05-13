import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CalendarDays, ClipboardList, Forward, CheckCircle2, Plus, FileDown } from "lucide-react";
import { exportMeetingMinutesPdf } from "@/lib/pdf-export";
import {
  meetingsStore, agendaStore, saveMeeting, saveAgenda, findNextMeeting, newId,
  type AgendaRow, type AgendaStatus, type MeetingRow,
} from "@/lib/meetings-store";
import { useTableStore } from "@/lib/table-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/meetings/$id")({ component: MeetingDetail });

const STATUSES: AgendaStatus[] = ["Pendente", "Abordada", "Postergada", "Cancelada"];

function MeetingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const allMeetings = useTableStore(meetingsStore);
  const allAgenda = useTableStore(agendaStore);
  const meeting = allMeetings.find((m) => m.id === id);
  const agenda = allAgenda.filter((a) => a.meeting_id === id).sort((a, b) => a.position - b.position);
  const [newAgenda, setNewAgenda] = useState("");
  const [targetMeetingId, setTargetMeetingId] = useState<string>("");

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

  async function updateAgendaStatus(item: AgendaRow, status: AgendaStatus) {
    await saveAgenda({ ...item, status });
  }

  async function addAgendaItem() {
    if (!meeting || !newAgenda.trim()) return;
    const item: AgendaRow = {
      id: newId("A"),
      meeting_id: meeting.id,
      title: newAgenda.trim(),
      status: "Pendente",
      from_meeting_id: null,
      notes: null,
      position: agenda.length,
    };
    await saveAgenda(item);
    setNewAgenda("");
  }

  async function postponePending() {
    if (!meeting) return;
    const pending = agenda.filter((a) => a.status === "Pendente");
    if (!pending.length) { toast.info("Nenhuma pauta pendente para postergar."); return; }

    let target: MeetingRow | undefined =
      targetMeetingId ? allMeetings.find((m) => m.id === targetMeetingId) : findNextMeeting(meeting);

    if (!target) {
      const nextDate = new Date(meeting.meeting_date + "T00:00:00");
      nextDate.setDate(nextDate.getDate() + 7);
      const created: MeetingRow = {
        id: newId("RU"),
        type: meeting.type + " (continuação)",
        meeting_date: nextDate.toISOString().slice(0, 10),
        meeting_time: meeting.meeting_time,
        participants: meeting.participants,
        status: "Agendada",
        recurrence_parent_id: null,
        recurrence_frequency: null,
        recurrence_until: null,
        notes: null,
      };
      await saveMeeting(created);
      target = created;
      toast.success("Nova reunião criada para receber as pautas postergadas.");
    }

    const targetAgendaCount = allAgenda.filter((a) => a.meeting_id === target!.id).length;

    for (let i = 0; i < pending.length; i++) {
      const a = pending[i];
      await saveAgenda({
        id: newId("A"),
        meeting_id: target.id,
        title: a.title,
        status: "Pendente",
        from_meeting_id: meeting.id,
        notes: `Postergada da reunião ${meeting.id}`,
        position: targetAgendaCount + i,
      });
      await saveAgenda({ ...a, status: "Postergada" });
    }

    toast.success(`${pending.length} pauta(s) postergadas para ${target.id}`);
  }

  async function finalize() {
    if (!meeting) return;
    await saveMeeting({ ...meeting, status: "Realizada" });
    toast.success("Reunião marcada como realizada.");
  }

  const otherMeetings = allMeetings.filter((m) => m.id !== meeting.id && m.meeting_date >= meeting.meeting_date);

  return (
    <>
      <Link to="/meetings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar para reuniões
      </Link>

      <PageHeader
        title={meeting.type}
        description={`Código ${meeting.id} · ${meeting.meeting_date}${meeting.meeting_time ? " às " + meeting.meeting_time : ""}`}
        actions={
          <>
            <StatusBadge>{meeting.status}</StatusBadge>
            <Button size="sm" variant="outline" onClick={() => exportMeetingMinutesPdf({
              type: meeting.type,
              meeting_date: meeting.meeting_date,
              meeting_time: meeting.meeting_time,
              participants: meeting.participants,
              status: meeting.status,
              notes: meeting.notes,
              agenda: agenda.map((a) => ({ title: a.title, status: a.status, notes: a.notes })),
            })}>
              <FileDown className="size-4" /> Exportar ata (PDF)
            </Button>
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
            <ClipboardList className="size-4 text-primary" /> Pautas ({agenda.length})
          </h3>

          <div className="space-y-2">
            {agenda.map((a) => (
              <div key={a.id} className={cn(
                "border border-border rounded-md p-3 flex flex-wrap items-center gap-3",
                a.status === "Postergada" && "bg-warning/5",
                a.status === "Cancelada" && "opacity-60",
              )}>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium">{a.title}</div>
                  {a.from_meeting_id && (
                    <div className="text-[11px] text-muted-foreground">
                      <Forward className="size-3 inline mr-1" /> Postergada da reunião {a.from_meeting_id}
                    </div>
                  )}
                </div>
                <select
                  value={a.status}
                  onChange={(e) => updateAgendaStatus(a, e.target.value as AgendaStatus)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <StatusBadge>{a.status}</StatusBadge>
              </div>
            ))}
            {!agenda.length && (
              <div className="text-sm text-muted-foreground italic text-center py-4">Sem pautas cadastradas.</div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Adicionar nova pauta…"
              value={newAgenda}
              onChange={(e) => setNewAgenda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAgendaItem()}
            />
            <Button size="sm" variant="outline" onClick={addAgendaItem}><Plus className="size-4" /> Adicionar</Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="size-4" /> Informações
            </h3>
            <dl className="text-sm space-y-2">
              <div><dt className="text-xs text-muted-foreground">Data</dt><dd>{meeting.meeting_date}{meeting.meeting_time && " às " + meeting.meeting_time}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Participantes</dt>
                <dd className="text-xs">{meeting.participants.join(", ")}</dd></div>
              {meeting.recurrence_frequency && (
                <div><dt className="text-xs text-muted-foreground">Recorrência</dt>
                  <dd>{meeting.recurrence_frequency} · até {meeting.recurrence_until}</dd></div>
              )}
              {meeting.recurrence_parent_id && (
                <div><dt className="text-xs text-muted-foreground">Origem da série</dt>
                  <dd className="font-mono text-xs">{meeting.recurrence_parent_id}</dd></div>
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
                  <option key={m.id} value={m.id}>{m.id} — {m.type} ({m.meeting_date})</option>
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
