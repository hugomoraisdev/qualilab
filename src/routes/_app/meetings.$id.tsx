import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Forward,
  CheckCircle2,
  Plus,
  FileDown,
  Mail,
  Paperclip,
  Users,
  Gavel,
  ListChecks,
  Play,
  Square,
  Send,
  Trash2,
} from "lucide-react";
import { exportMeetingMinutesPdf } from "@/lib/pdf-export";
import {
  meetingsStore,
  agendaStore,
  saveMeeting,
  saveAgenda,
  findNextMeeting,
  newId,
  type AgendaRow,
  type AgendaStatus,
  type MeetingRow,
} from "@/lib/meetings-store";
import {
  useMeetingMeta,
  updateMeetingMeta,
  deriveMeetingStatus,
  originLabel,
  genId,
  type MeetingParticipant,
  type ParticipantOrigin,
} from "@/lib/meeting-meta-store";
import { actionPlansStore, saveActionPlan } from "@/lib/action-plans-store";
import { useTableStore } from "@/lib/table-store";
import { sendEmail } from "@/lib/send-email.functions";
import { buildActionAssignedHtml } from "@/lib/email-templates";
import { listProfiles } from "@/lib/profiles-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/meetings/$id")({ component: MeetingDetail });

const STATUSES: AgendaStatus[] = ["Pendente", "Abordada", "Postergada", "Cancelada"];

function MeetingDetail() {
  useAuditAccess("meetings");
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const allMeetings = useTableStore(meetingsStore);
  const allAgenda = useTableStore(agendaStore);
  const allActions = useTableStore(actionPlansStore);
  const meeting = allMeetings.find((m) => m.id === id);
  const agenda = allAgenda
    .filter((a) => a.meeting_id === id)
    .sort((a, b) => a.position - b.position);
  const { meta, refresh } = useMeetingMeta(id);
  const [newAgenda, setNewAgenda] = useState("");
  const [targetMeetingId, setTargetMeetingId] = useState<string>("");

  if (!meeting) {
    return (
      <>
        <Link
          to="/meetings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4 mr-1" /> Voltar para reuniões
        </Link>
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Reunião não encontrada.
        </div>
      </>
    );
  }

  const derived = deriveMeetingStatus(meeting, meta);
  const tone = (s: string) =>
    s === "Atrasada"
      ? "destructive"
      : s === "Em andamento"
        ? "warning"
        : s === "Realizada"
          ? "success"
          : s === "Cancelada"
            ? "muted"
            : "info";

  const linkedActions = meta.action_links
    .map((al) => allActions.find((a) => a.id === al.action_id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  async function updateAgendaStatus(item: AgendaRow, status: AgendaStatus) {
    await saveAgenda({ ...item, status });
  }

  async function addAgendaItem() {
    if (!meeting || !newAgenda.trim()) return;
    await saveAgenda({
      id: newId("A"),
      meeting_id: meeting.id,
      title: newAgenda.trim(),
      status: "Pendente",
      from_meeting_id: null,
      notes: null,
      position: agenda.length,
    });
    setNewAgenda("");
  }

  async function postponePending() {
    if (!meeting) return;
    const pending = agenda.filter((a) => a.status === "Pendente");
    if (!pending.length) {
      toast.info("Nenhuma pauta pendente para postergar.");
      return;
    }
    let target: MeetingRow | undefined = targetMeetingId
      ? allMeetings.find((m) => m.id === targetMeetingId)
      : findNextMeeting(meeting);
    if (!target) {
      const nextDate = new Date(meeting.meeting_date + "T00:00:00");
      nextDate.setDate(nextDate.getDate() + 7);
      target = {
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
      await saveMeeting(target);
      toast.success("Nova reunião criada para receber as pautas postergadas.");
    }
    const targetAgendaCount = allAgenda.filter((a) => a.meeting_id === target!.id).length;
    for (let i = 0; i < pending.length; i++) {
      await saveAgenda({
        id: newId("A"),
        meeting_id: target.id,
        title: pending[i].title,
        status: "Pendente",
        from_meeting_id: meeting.id,
        notes: `Postergada da reunião ${meeting.id}`,
        position: targetAgendaCount + i,
      });
      await saveAgenda({ ...pending[i], status: "Postergada" });
    }
    toast.success(`${pending.length} pauta(s) postergadas para ${target.id}`);
  }

  async function startMeeting() {
    await updateMeetingMeta(
      meeting!.id,
      (p) => ({ ...p, started_at: new Date().toISOString(), ended_at: null }),
      { action: "start", actor: user?.email ?? null },
    );
    toast.success("Reunião iniciada.");
    refresh();
  }

  async function endMeeting() {
    await updateMeetingMeta(meeting!.id, (p) => ({ ...p, ended_at: new Date().toISOString() }), {
      action: "end",
      actor: user?.email ?? null,
    });
    await saveMeeting({ ...meeting!, status: "Realizada" });
    toast.success("Reunião finalizada.");
    if (meta.auto_send_minutes) {
      await sendMinutes(true);
    }
    refresh();
  }

  function buildMinutesHtml() {
    return `
<h2>Ata — ${meeting!.type}</h2>
<p><b>Data:</b> ${meeting!.meeting_date}${meeting!.meeting_time ? " às " + meeting!.meeting_time : ""}</p>
${meta.sector ? `<p><b>Setor:</b> ${meta.sector}</p>` : ""}
<h3>Participantes</h3>
<ul>${[
      ...meeting!.participants.map((n) => `<li>${n} (interno)</li>`),
      ...meta.participants.map(
        (p) =>
          `<li>${p.name}${p.role && p.role !== "Participante" ? ` [${p.role}]` : ""}${p.organization ? ` — ${p.organization}` : ""} (${originLabel[p.origin]})${p.attended ? " ✓ presente" : p.confirmed ? " — confirmado" : ""}</li>`,
      ),
    ].join("")}</ul>
<h3>Pautas</h3>
<ol>${agenda.map((a) => `<li><b>${a.title}</b> — ${a.status}${a.notes ? `<br/><i>${a.notes}</i>` : ""}</li>`).join("")}</ol>
${meta.decisions.length ? `<h3>Decisões e deliberações</h3><ul>${meta.decisions.map((d) => `<li><b>${d.topic}:</b> ${d.decision}${d.responsible ? ` — ${d.responsible}` : ""}</li>`).join("")}</ul>` : ""}
${linkedActions.length ? `<h3>Plano de ação</h3><ul>${linkedActions.map((a) => `<li>${a.description} — prazo ${a.deadline ?? "—"} — status ${a.status}</li>`).join("")}</ul>` : ""}
`;
  }

  async function sendMinutes(silent = false) {
    const recipients = [...meta.participants.map((p) => p.email).filter((e): e is string => !!e)];
    if (!recipients.length) {
      if (!silent) toast.error("Nenhum participante com e-mail cadastrado.");
      return;
    }
    try {
      await sendEmail({
        data: {
          to: recipients,
          subject: `Ata — ${meeting!.type} (${meeting!.meeting_date})`,
          html: buildMinutesHtml(),
        },
      });
      await updateMeetingMeta(
        meeting!.id,
        (p) => ({ ...p, minutes_sent_at: new Date().toISOString() }),
        {
          action: "minutes_sent",
          actor: user?.email ?? null,
          detail: `${recipients.length} destinatário(s)`,
        },
      );
      toast.success(`Ata enviada para ${recipients.length} destinatário(s).`);
      refresh();
    } catch (e) {
      toast.error("Falha ao enviar a ata. Tente novamente.");
    }
  }

  async function sendReminder() {
    const recipients = meta.participants.map((p) => p.email).filter((e): e is string => !!e);
    if (!recipients.length) {
      toast.error("Cadastre e-mails de participantes.");
      return;
    }
    const materialsHtml = meta.materials.length
      ? `<h3>Materiais prévios</h3><ul>${meta.materials.map((m) => `<li>${m.url ? `<a href="${m.url}">${m.name}</a>` : m.name}${m.description ? ` — ${m.description}` : ""}</li>`).join("")}</ul>`
      : "<p><i>Nenhum material prévio anexado.</i></p>";
    const html = `<h2>Lembrete: ${meeting!.type}</h2>
      <p><b>Data:</b> ${meeting!.meeting_date}${meeting!.meeting_time ? " às " + meeting!.meeting_time : ""}</p>
      <h3>Pauta</h3><ol>${agenda.map((a) => `<li>${a.title}</li>`).join("")}</ol>
      ${materialsHtml}`;
    try {
      await sendEmail({
        data: {
          to: recipients,
          subject: `Lembrete: ${meeting!.type} (${meeting!.meeting_date})`,
          html,
        },
      });
      await updateMeetingMeta(
        meeting!.id,
        (p) => ({ ...p, reminder_sent_at: new Date().toISOString() }),
        { action: "reminder_sent", actor: user?.email ?? null },
      );
      toast.success(`Lembrete enviado para ${recipients.length} pessoa(s).`);
      refresh();
    } catch (e) {
      toast.error("Operação falhou. Tente novamente.");
    }
  }

  const otherMeetings = allMeetings.filter(
    (m) => m.id !== meeting.id && m.meeting_date >= meeting.meeting_date,
  );

  return (
    <>
      <Link
        to="/meetings"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4 mr-1" /> Voltar para reuniões
      </Link>

      <PageHeader
        title={meeting.type}
        description={`Código ${meeting.id} · ${meeting.meeting_date}${meeting.meeting_time ? " às " + meeting.meeting_time : ""}${meta.sector ? " · " + meta.sector : ""}`}
        actions={
          <>
            <StatusBadge tone={tone(derived) as never}>{derived}</StatusBadge>
            {derived !== "Realizada" && derived !== "Cancelada" && !meta.started_at && (
              <Button size="sm" variant="outline" onClick={startMeeting}>
                <Play className="size-4" /> Iniciar
              </Button>
            )}
            {derived !== "Realizada" && meta.started_at && !meta.ended_at && (
              <Button size="sm" onClick={endMeeting}>
                <Square className="size-4" /> Encerrar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportMeetingMinutesPdf({
                  type: meeting.type,
                  meeting_date: meeting.meeting_date,
                  meeting_time: meeting.meeting_time,
                  participants: [
                    ...meeting.participants,
                    ...meta.participants.map((p) => `${p.name} (${originLabel[p.origin]})`),
                  ],
                  status: derived,
                  notes: [meeting.notes, ...meta.decisions.map((d) => `[${d.topic}] ${d.decision}`)]
                    .filter(Boolean)
                    .join("\n"),
                  agenda: agenda.map((a) => ({ title: a.title, status: a.status, notes: a.notes })),
                })
              }
            >
              <FileDown className="size-4" /> Ata PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendMinutes()}>
              <Mail className="size-4" /> Enviar ata
            </Button>
          </>
        }
      />

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">
            <ClipboardList className="size-4 mr-1" />
            Pauta
          </TabsTrigger>
          <TabsTrigger value="participants">
            <Users className="size-4 mr-1" />
            Participantes
          </TabsTrigger>
          <TabsTrigger value="materials">
            <Paperclip className="size-4 mr-1" />
            Materiais
          </TabsTrigger>
          <TabsTrigger value="minutes">
            <Gavel className="size-4 mr-1" />
            Ata
          </TabsTrigger>
          <TabsTrigger value="actions">
            <ListChecks className="size-4 mr-1" />
            Ações
          </TabsTrigger>
          <TabsTrigger value="config">
            <CalendarDays className="size-4 mr-1" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Pautas ({agenda.length})</h3>
            <div className="space-y-2">
              {agenda.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "border border-border rounded-md p-3 flex flex-wrap items-center gap-3",
                    a.status === "Postergada" && "bg-warning/5",
                    a.status === "Cancelada" && "opacity-60",
                  )}
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-medium">{a.title}</div>
                    {a.from_meeting_id && (
                      <div className="text-[11px] text-muted-foreground">
                        <Forward className="size-3 inline mr-1" /> Postergada da reunião{" "}
                        {a.from_meeting_id}
                      </div>
                    )}
                    <Textarea
                      placeholder="Deliberação / observações…"
                      defaultValue={a.notes ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (a.notes ?? ""))
                          saveAgenda({ ...a, notes: e.target.value || null });
                      }}
                      rows={2}
                      className="mt-2"
                    />
                  </div>
                  <select
                    value={a.status}
                    onChange={(e) => updateAgendaStatus(a, e.target.value as AgendaStatus)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <StatusBadge>{a.status}</StatusBadge>
                </div>
              ))}
              {!agenda.length && (
                <div className="text-sm text-muted-foreground italic text-center py-4">
                  Sem pautas cadastradas.
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Adicionar nova pauta…"
                value={newAgenda}
                onChange={(e) => setNewAgenda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAgendaItem()}
              />
              <Button size="sm" variant="outline" onClick={addAgendaItem}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Forward className="size-4 text-primary" /> Postergar pautas pendentes
            </h3>
            <div className="flex flex-wrap gap-2 items-end">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-[200px]"
                value={targetMeetingId}
                onChange={(e) => setTargetMeetingId(e.target.value)}
              >
                <option value="">Próxima reunião disponível ou criar nova</option>
                {otherMeetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} — {m.type} ({m.meeting_date})
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={postponePending}>
                Postergar pendentes
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsPanel
            meetingId={meeting.id}
            meeting={meeting}
            internalNames={meeting.participants}
            participants={meta.participants}
            onChange={refresh}
            duringMode={!!meta.started_at && !meta.ended_at}
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsPanel
            meetingId={meeting.id}
            materials={meta.materials}
            onChange={refresh}
            onSendReminder={sendReminder}
            reminderSentAt={meta.reminder_sent_at}
          />
        </TabsContent>

        <TabsContent value="minutes">
          <MinutesPanel meetingId={meeting.id} decisions={meta.decisions} onChange={refresh} />
        </TabsContent>

        <TabsContent value="actions">
          <ActionsPanel meetingId={meeting.id} onChange={refresh} />
        </TabsContent>

        <TabsContent value="config">
          <ConfigPanel meeting={meeting} meta={meta} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------- Sub-panels ---------- */

function ParticipantsPanel({
  meetingId,
  meeting,
  internalNames,
  participants,
  onChange,
  duringMode,
}: {
  meetingId: string;
  meeting: MeetingRow;
  internalNames: string[];
  participants: MeetingParticipant[];
  onChange: () => void;
  duringMode: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("Participante");
  const [origin, setOrigin] = useState<ParticipantOrigin>(
    duringMode ? "extra_durante" : "extra_antes",
  );

  async function add() {
    if (!name.trim()) return;
    const p: MeetingParticipant = {
      id: genId("p"),
      name: name.trim(),
      email: email.trim() || null,
      role: role || null,
      organization: org.trim() || null,
      origin,
      confirmed: false,
      attended: false,
    };
    await updateMeetingMeta(
      meetingId,
      (prev) => ({ ...prev, participants: [...prev.participants, p] }),
      { action: "participant_added", detail: `${p.name} — ${role} (${originLabel[origin]})` },
    );
    if (p.email) {
      sendEmail({
        data: {
          to: p.email,
          subject: `Convite: ${meeting.type} (${meeting.meeting_date}${meeting.meeting_time ? " às " + meeting.meeting_time : ""})`,
          html: `<p>Olá, <b>${p.name}</b>.</p>
<p>Você foi adicionado(a) como participante da seguinte reunião:</p>
<ul>
  <li><b>Tipo:</b> ${meeting.type}</li>
  <li><b>Data:</b> ${meeting.meeting_date}${meeting.meeting_time ? " às " + meeting.meeting_time : ""}</li>
  <li><b>Função:</b> ${role}</li>
</ul>
<p>Qualilab — Sistema de Gestão da Qualidade</p>`,
        },
      }).catch(console.warn);
    }
    setName("");
    setEmail("");
    setOrg("");
    setRole("Participante");
    onChange();
  }

  async function update(id: string, patch: Partial<MeetingParticipant>) {
    await updateMeetingMeta(meetingId, (prev) => ({
      ...prev,
      participants: prev.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    onChange();
  }

  async function remove(id: string) {
    await updateMeetingMeta(
      meetingId,
      (prev) => ({ ...prev, participants: prev.participants.filter((p) => p.id !== id) }),
      { action: "participant_removed" },
    );
    onChange();
  }

  return (
    <div className="space-y-4">
      {internalNames.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">
            Participantes internos (cadastrados na criação)
          </h3>
          <ul className="text-sm space-y-1">
            {internalNames.map((n) => (
              <li key={n} className="flex items-center gap-2">
                <Users className="size-3" /> {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Participantes detalhados</h3>
        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="border border-border rounded-md p-3 grid grid-cols-1 md:grid-cols-7 gap-2 items-center"
            >
              <Input
                value={p.name}
                onChange={(e) => update(p.id, { name: e.target.value })}
                placeholder="Nome"
              />
              <Input
                value={p.email ?? ""}
                onChange={(e) => update(p.id, { email: e.target.value || null })}
                placeholder="E-mail"
              />
              <Input
                value={p.organization ?? ""}
                onChange={(e) => update(p.id, { organization: e.target.value || null })}
                placeholder="Organização"
              />
              <select
                value={p.role ?? "Participante"}
                onChange={(e) => update(p.id, { role: e.target.value })}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {["Participante", "Administrador", "Facilitador", "Secretário"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={p.origin}
                onChange={(e) => update(p.id, { origin: e.target.value as ParticipantOrigin })}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {(
                  ["interno", "externo", "extra_antes", "extra_durante"] as ParticipantOrigin[]
                ).map((o) => (
                  <option key={o} value={o}>
                    {originLabel[o]}
                  </option>
                ))}
              </select>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={p.confirmed}
                  onChange={(e) => update(p.id, { confirmed: e.target.checked })}
                />{" "}
                Confirmado
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={p.attended}
                    onChange={(e) => update(p.id, { attended: e.target.checked })}
                  />{" "}
                  Presente
                </label>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {!participants.length && (
            <div className="text-sm text-muted-foreground italic">
              Nenhum participante adicional cadastrado.
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
          <Input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organização" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {["Participante", "Administrador", "Facilitador", "Secretário"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value as ParticipantOrigin)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {(["interno", "externo", "extra_antes", "extra_durante"] as ParticipantOrigin[]).map(
              (o) => (
                <option key={o} value={o}>
                  {originLabel[o]}
                </option>
              ),
            )}
          </select>
          <Button onClick={add}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </section>
    </div>
  );
}

function MaterialsPanel({
  meetingId,
  materials,
  onChange,
  onSendReminder,
  reminderSentAt,
}: {
  meetingId: string;
  materials: {
    id: string;
    name: string;
    url?: string | null;
    description?: string | null;
    uploaded_at: string;
  }[];
  onChange: () => void;
  onSendReminder: () => Promise<void>;
  reminderSentAt: string | null;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");

  async function add() {
    if (!name.trim()) return;
    await updateMeetingMeta(
      meetingId,
      (prev) => ({
        ...prev,
        materials: [
          ...prev.materials,
          {
            id: genId("m"),
            name: name.trim(),
            url: url.trim() || null,
            description: desc.trim() || null,
            uploaded_at: new Date().toISOString(),
          },
        ],
      }),
      { action: "material_added", detail: name.trim() },
    );
    setName("");
    setUrl("");
    setDesc("");
    onChange();
  }
  async function remove(id: string) {
    await updateMeetingMeta(meetingId, (prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }));
    onChange();
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Materiais prévios ({materials.length})</h3>
        <div className="flex items-center gap-2">
          {reminderSentAt && (
            <span className="text-xs text-muted-foreground">
              Lembrete enviado em {new Date(reminderSentAt).toLocaleString("pt-BR")}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={onSendReminder}>
            <Send className="size-4" /> Enviar lembrete c/ materiais
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {materials.map((m) => (
          <div key={m.id} className="border border-border rounded-md p-3 flex items-start gap-3">
            <Paperclip className="size-4 mt-0.5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {m.url ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    {m.name}
                  </a>
                ) : (
                  m.name
                )}
              </div>
              {m.description && (
                <div className="text-xs text-muted-foreground">{m.description}</div>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(m.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!materials.length && (
          <div className="text-sm text-muted-foreground italic">Nenhum material anexado.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label className="text-xs">Descrição</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <Button onClick={add}>
          <Plus className="size-4" /> Anexar
        </Button>
      </div>
    </section>
  );
}

function MinutesPanel({
  meetingId,
  decisions,
  onChange,
}: {
  meetingId: string;
  decisions: {
    id: string;
    topic: string;
    decision: string;
    responsible?: string | null;
    at: string;
  }[];
  onChange: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [decision, setDecision] = useState("");
  const [resp, setResp] = useState("");

  async function add() {
    if (!topic.trim() || !decision.trim()) return;
    await updateMeetingMeta(
      meetingId,
      (prev) => ({
        ...prev,
        decisions: [
          ...prev.decisions,
          {
            id: genId("d"),
            topic: topic.trim(),
            decision: decision.trim(),
            responsible: resp.trim() || null,
            at: new Date().toISOString(),
          },
        ],
      }),
      { action: "decision_added", detail: topic.trim() },
    );
    setTopic("");
    setDecision("");
    setResp("");
    onChange();
  }
  async function remove(id: string) {
    await updateMeetingMeta(meetingId, (prev) => ({
      ...prev,
      decisions: prev.decisions.filter((d) => d.id !== id),
    }));
    onChange();
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold">Decisões e deliberações ({decisions.length})</h3>
      <div className="space-y-2">
        {decisions.map((d) => (
          <div key={d.id} className="border border-border rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{d.topic}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="text-sm">{d.decision}</div>
            {d.responsible && (
              <div className="text-xs text-muted-foreground mt-1">Responsável: {d.responsible}</div>
            )}
          </div>
        ))}
        {!decisions.length && (
          <div className="text-sm text-muted-foreground italic">
            Nenhuma deliberação registrada ainda.
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <div>
          <Label className="text-xs">Assunto</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Deliberação</Label>
          <Input value={decision} onChange={(e) => setDecision(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Responsável</Label>
          <Input value={resp} onChange={(e) => setResp(e.target.value)} />
        </div>
        <Button onClick={add} className="md:col-span-2">
          <Plus className="size-4" /> Registrar deliberação
        </Button>
      </div>
    </section>
  );
}

function ActionsPanel({ meetingId, onChange }: { meetingId: string; onChange: () => void }) {
  const allActions = useTableStore(actionPlansStore);
  const { meta, refresh } = useMeetingMeta(meetingId);
  const linked = meta.action_links
    .map((al) => allActions.find((a) => a.id === al.action_id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const [desc, setDesc] = useState("");
  const [resp, setResp] = useState("");
  const [deadline, setDeadline] = useState("");

  async function addAction() {
    if (!desc.trim()) return;
    const id = crypto.randomUUID();
    await saveActionPlan({
      id,
      code: null,
      origin_type: "meeting",
      origin_id: meetingId,
      description: desc.trim(),
      responsible_id: resp.trim() || null,
      deadline: deadline || null,
      priority: "media",
      status: "Pendente",
      progress: 0,
      notes: null,
    });
    if (resp.trim()) {
      const profile = listProfiles().find((p) => p.name === resp.trim());
      if (profile?.email) {
        sendEmail({
          data: {
            to: profile.email,
            subject: "Qualilab — Nova ação atribuída a você",
            html: buildActionAssignedHtml({
              description: desc.trim(),
              responsible: profile.name,
              originLabel: "Reunião",
              deadline: deadline || null,
            }),
          },
        }).catch(console.warn);
      }
    }
    await updateMeetingMeta(
      meetingId,
      (prev) => ({
        ...prev,
        action_links: [
          ...prev.action_links,
          { id: genId("al"), action_id: id, title: desc.trim() },
        ],
      }),
      { action: "action_added", detail: desc.trim() },
    );
    setDesc("");
    setResp("");
    setDeadline("");
    refresh();
    onChange();
  }

  async function unlink(action_id: string) {
    await updateMeetingMeta(meetingId, (prev) => ({
      ...prev,
      action_links: prev.action_links.filter((al) => al.action_id !== action_id),
    }));
    refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold">Plano de ação vinculado ({linked.length})</h3>
      <div className="space-y-2">
        {linked.map((a) => {
          const overdue = a.deadline && a.deadline < today && a.status !== "Concluída";
          return (
            <div
              key={a.id}
              className={cn(
                "border border-border rounded-md p-3 flex items-center gap-3",
                overdue && "border-destructive/40 bg-destructive/5",
              )}
            >
              <CheckCircle2
                className={cn("size-4", overdue ? "text-destructive" : "text-primary")}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.description}</div>
                <div className="text-xs text-muted-foreground">
                  Resp.: {a.responsible_id ?? "—"} · Prazo: {a.deadline ?? "—"} · Status: {a.status}
                  {overdue && <span className="ml-2 text-destructive font-medium">ATRASADA</span>}
                </div>
              </div>
              <Link to="/action-plans" className="text-xs text-primary underline">
                abrir
              </Link>
              <Button size="icon" variant="ghost" onClick={() => unlink(a.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        {!linked.length && (
          <div className="text-sm text-muted-foreground italic">Nenhuma ação vinculada.</div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div className="md:col-span-2">
          <Label className="text-xs">Descrição</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Responsável</Label>
          <Input value={resp} onChange={(e) => setResp(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Prazo</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <Button onClick={addAction} className="md:col-span-4">
          <Plus className="size-4" /> Criar ação a partir da reunião
        </Button>
      </div>
    </section>
  );
}

function ConfigPanel({
  meeting,
  meta,
  onChange,
}: {
  meeting: MeetingRow;
  meta: ReturnType<typeof useMeetingMeta>["meta"];
  onChange: () => void;
}) {
  const [sector, setSector] = useState(meta.sector ?? "");
  const [autoSend, setAutoSend] = useState(meta.auto_send_minutes);
  const [notes, setNotes] = useState(meeting.notes ?? "");

  async function save() {
    await updateMeetingMeta(
      meeting.id,
      (prev) => ({ ...prev, sector: sector || null, auto_send_minutes: autoSend }),
      { action: "config_updated" },
    );
    if (notes !== (meeting.notes ?? "")) {
      await saveMeeting({ ...meeting, notes: notes || null });
    }
    toast.success("Configurações salvas.");
    onChange();
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Setor</Label>
          <Input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Ex.: Qualidade, Produção…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm mt-6">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
          />
          Enviar ata automaticamente ao encerrar a reunião
        </label>
      </div>
      <div>
        <Label className="text-xs">Observações gerais</Label>
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {meeting.recurrence_frequency && (
        <div className="text-xs text-muted-foreground">
          Recorrência: <b>{meeting.recurrence_frequency}</b> · até {meeting.recurrence_until}
        </div>
      )}
      {meeting.recurrence_parent_id && (
        <div className="text-xs text-muted-foreground">
          Origem da série: <span className="font-mono">{meeting.recurrence_parent_id}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save}>Salvar configurações</Button>
      </div>

      {meta.history.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-xs font-semibold mb-2">Histórico</h4>
          <ul className="space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto">
            {meta.history.slice(0, 30).map((h) => (
              <li key={h.id}>
                <span className="font-mono">{new Date(h.at).toLocaleString("pt-BR")}</span> —{" "}
                {h.action}
                {h.detail ? `: ${h.detail}` : ""}
                {h.actor ? ` (${h.actor})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
