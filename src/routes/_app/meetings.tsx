import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { meetings as mockMeetings } from "@/lib/mock-data";
import { listMeetings, type Meeting } from "@/lib/meetings-store";
import { Button } from "@/components/ui/button";
import { Plus, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/meetings")({ component: MeetPage });

function MeetPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<Meeting[]>([]);
  useEffect(() => {
    const r = () => setStored(listMeetings());
    r();
    const h = () => r();
    window.addEventListener("storage:qualilab_meetings_v2", h);
    return () => window.removeEventListener("storage:qualilab_meetings_v2", h);
  }, []);

  const all = [
    ...stored.map((m) => ({
      id: m.id, type: m.type, date: m.date,
      participants: m.participants,
      agenda: m.agenda.map((a) => a.title).join("; "),
      status: m.status,
      recurring: !!m.recurrence || !!m.recurrenceParentId,
      _stored: true as const,
    })),
    ...mockMeetings.map((m) => ({ ...m, recurring: false, _stored: false as const })),
  ];

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
        data={all}
        searchKeys={["id", "type", "agenda", "status"]}
        exportName="reunioes"
        onRowClick={(r) => r._stored && navigate({ to: "/meetings/$id", params: { id: r.id } })}
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
