import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useTableStore } from "@/lib/table-store";
import { meetingsStore, agendaStore } from "@/lib/meetings-store";
import { Button } from "@/components/ui/button";
import { Plus, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/meetings")({ component: MeetPage });

function MeetPage() {
  const navigate = useNavigate();
  const meetings = useTableStore(meetingsStore).filter((m) => !m.deleted_at);
  const agenda = useTableStore(agendaStore);

  const rows = meetings
    .slice()
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .map((m) => ({
      id: m.id,
      type: m.type,
      date: m.meeting_date,
      participants: m.participants,
      agenda: agenda.filter((a) => a.meeting_id === m.id).map((a) => a.title).join("; "),
      status: m.status,
      recurring: !!m.recurrence_frequency || !!m.recurrence_parent_id,
    }));

  return (
    <>
      <PageHeader
        title="Reuniões"
        description="Atas, decisões, recorrência e postergação de pautas"
        actions={
          <Button asChild size="sm">
            <Link to="/meetings/new"><Plus className="size-4" /> Nova reunião</Link>
          </Button>
        }
      />
      <DataTable
        data={rows}
        searchKeys={["id", "type", "agenda", "status"]}
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
          { key: "participants", header: "Participantes", render: (r) => <span className="text-xs">{r.participants.length} pessoas</span> },
          { key: "agenda", header: "Pauta", render: (r) => <span className="max-w-md truncate inline-block text-xs">{r.agenda}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
