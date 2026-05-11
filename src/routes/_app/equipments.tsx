import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { equipments } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/equipments")({ component: EqPage });

function EqPage() {
  return (
    <>
      <PageHeader title="Equipamentos" description="Cadastro completo, calibração, manutenção e rastreabilidade" />
      <DataTable
        data={equipments}
        searchKeys={["code", "name", "type", "manufacturer", "model", "status", "responsible"]}
        newLabel="Novo equipamento"
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "name", header: "Equipamento", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "manufacturer", header: "Fabricante" },
          { key: "model", header: "Modelo" },
          { key: "location", header: "Localização" },
          { key: "lastCal", header: "Última cal." },
          { key: "nextCal", header: "Próxima cal." },
          { key: "responsible", header: "Responsável" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
