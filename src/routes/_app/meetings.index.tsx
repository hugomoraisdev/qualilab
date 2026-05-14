import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useTableStore } from "@/lib/table-store";
import { meetingsStore, agendaStore } from "@/lib/meetings-store";
import { useAllMeetingMeta, deriveMeetingStatus } from "@/lib/meeting-meta-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/meetings/")({ component: MeetPage });

function MeetPage() {
  const navigate = useNavigate();
  const meetings = useTableStore(meetingsStore).filter((m) => !m.deleted_at);
  const agenda = useTableStore(agendaStore);
  const ids = useMemo(() => meetings.map((m) => m.id), [meetings]);
  const metaMap = useAllMeetingMeta(ids);

  const [month, setMonth] = useState<string>("");      // YYYY-MM
  const [sector, setSector] = useState<string>("");
  const [participant, setParticipant] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const sectors = Array.from(new Set(
    Object.values(metaMap).map((m) => m.sector).filter((s): s is string => !!s),
  )).sort();

  const rows = meetings
    .slice()
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .map((m) => {
      const meta = metaMap[m.id];
      const derived = deriveMeetingStatus(m, meta);
      const allParticipants = [
        ...m.participants,
        ...(meta?.participants ?? []).map((p) => p.name),
      ];
      return {
        id: m.id,
        type: m.type,
        date: m.meeting_date,
        sector: meta?.sector ?? "—",
        participants: allParticipants,
        agenda: agenda.filter((a) => a.meeting_id === m.id).map((a) => a.title).join("; "),
        status: derived,
        recurring: !!m.recurrence_frequency || !!m.recurrence_parent_id,
      };
    })
    .filter((r) => !month || r.date.startsWith(month))
    .filter((r) => !sector || r.sector === sector)
    .filter((r) => !statusFilter || r.status === statusFilter)
    .filter((r) => !participant || r.participants.some((p) =>
      p.toLowerCase().includes(participant.toLowerCase()),
    ));

  const tone = (s: string) =>
    s === "Atrasada" ? "destructive" :
    s === "Em andamento" ? "warning" :
    s === "Realizada" ? "success" :
    s === "Cancelada" ? "muted" : "info";

  return (
    <>
      <PageHeader
        title="Reuniões"
        description="Atas, decisões, materiais, recorrência e postergação de pautas"
        actions={
          <Button asChild size="sm">
            <Link to="/meetings/new"><Plus className="size-4" /> Nova reunião</Link>
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-lg p-3 mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Mês</label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Setor</label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Todos</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Participante</label>
          <Input placeholder="Buscar por nome…" value={participant} onChange={(e) => setParticipant(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {["Agendada", "Em andamento", "Atrasada", "Realizada", "Cancelada"].map((s) =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <DataTable
        data={rows}
        searchKeys={["id", "type", "agenda", "status", "sector"]}
        hideNew
        exportName="reunioes"
        onRowClick={(r) => navigate({ to: "/meetings/$id", params: { id: r.id } })}
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "type", header: "Tipo", render: (r) => (
            <span className="font-medium inline-flex items-center gap-1.5">
              {r.type}
              {r.recurring && <Repeat className="size-3 text-primary" aria-label="Recorrente" />}
            </span>
          ) },
          { key: "date", header: "Data" },
          { key: "sector", header: "Setor", render: (r) => <span className="text-xs">{r.sector}</span> },
          { key: "participants", header: "Participantes", render: (r) => <span className="text-xs">{r.participants.length} pessoas</span> },
          { key: "agenda", header: "Pauta", render: (r) => <span className="max-w-md truncate inline-block text-xs">{r.agenda}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge tone={tone(r.status) as never}>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
