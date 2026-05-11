import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { meetings } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/meetings")({ component: MeetPage });

function MeetPage() {
  return (
    <>
      <PageHeader title="Reuniões" description="Atas, decisões e ações geradas pela governança da qualidade" />
      <DataTable
        data={meetings}
        searchKeys={["id", "type", "agenda", "status"]}
        newLabel="Nova reunião"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "type", header: "Tipo", render: (r) => <span className="font-medium">{r.type}</span> },
          { key: "date", header: "Data" },
          { key: "participants", header: "Participantes", render: (r) => <span className="text-xs">{r.participants.length} pessoas</span> },
          { key: "agenda", header: "Pauta", render: (r) => <span className="max-w-md truncate inline-block text-xs">{r.agenda}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
