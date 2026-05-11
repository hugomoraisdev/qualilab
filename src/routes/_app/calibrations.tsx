import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { calibrations } from "@/lib/mock-data";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_app/calibrations")({ component: CalPage });

function CalPage() {
  const upcoming = [...calibrations]
    .filter(c => c.status !== "Vencida" && c.status !== "Reprovada")
    .sort((a, b) => a.validity.localeCompare(b.validity))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Calibrações" description="Cronograma, certificados, rastreabilidade metrológica e validade" />

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CalendarDays className="size-4" /> Próximas calibrações</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {upcoming.map(c => (
            <div key={c.id} className="border border-border rounded-md p-3 bg-background">
              <div className="text-xs font-mono text-muted-foreground">{c.id}</div>
              <div className="text-sm font-medium truncate">{c.equipment.split(" — ")[0]}</div>
              <div className="text-xs text-muted-foreground mt-1">Vence em {c.validity}</div>
              <div className="mt-1.5"><StatusBadge>{c.status}</StatusBadge></div>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        data={calibrations}
        searchKeys={["id", "equipment", "lab", "certificate", "status", "result"]}
        newLabel="Nova calibração"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "equipment", header: "Equipamento" },
          { key: "date", header: "Data" },
          { key: "validity", header: "Validade" },
          { key: "lab", header: "Laboratório" },
          { key: "certificate", header: "Certificado", render: (r) => <span className="font-mono text-xs">{r.certificate}</span> },
          { key: "uncertainty", header: "Incerteza" },
          { key: "result", header: "Resultado", render: (r) => <StatusBadge>{r.result}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
