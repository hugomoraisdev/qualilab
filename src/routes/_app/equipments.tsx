import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { equipmentsStore } from "@/lib/equipments-store";
import { useTableStore } from "@/lib/table-store";

export const Route = createFileRoute("/_app/equipments")({ component: EqPage });

function EqPage() {
  const equipments = useTableStore(equipmentsStore);
  return (
    <>
      <PageHeader title="Equipamentos" description="Cadastro completo, calibração, manutenção e rastreabilidade" />
      <DataTable
        data={equipments}
        searchKeys={["code", "name", "category", "manufacturer", "model", "status"]}
        newLabel="Novo equipamento"
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "name", header: "Equipamento", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "manufacturer", header: "Fabricante", render: (r) => r.manufacturer ?? "—" },
          { key: "model", header: "Modelo", render: (r) => r.model ?? "—" },
          { key: "location", header: "Localização", render: (r) => r.location ?? "—" },
          { key: "next_calibration_date", header: "Próxima cal.", render: (r) => r.next_calibration_date ?? "—" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
