import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { purchases } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/purchases")({ component: PurchasesPage });

function PurchasesPage() {
  return (
    <>
      <PageHeader title="Processos de Compra" description="Solicitações, aprovação e inspeção de recebimento" />
      <DataTable
        data={purchases}
        searchKeys={["id", "supplier", "item", "responsible", "status"]}
        newLabel="Nova solicitação"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "supplier", header: "Fornecedor" },
          { key: "item", header: "Item / Serviço", render: (r) => <span className="font-medium">{r.item}</span> },
          { key: "value", header: "Valor estimado" },
          { key: "date", header: "Data" },
          { key: "responsible", header: "Responsável" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
