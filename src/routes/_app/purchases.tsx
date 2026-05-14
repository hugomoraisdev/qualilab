import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { purchasesStore } from "@/lib/purchases-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { useTableStore } from "@/lib/table-store";

export const Route = createFileRoute("/_app/purchases")({ component: PurchasesPage });

function PurchasesPage() {
  useAuditAccess("purchases");
  const purchases = useTableStore(purchasesStore);
  const suppliers = useTableStore(suppliersStore);
  const navigate = useNavigate();
  const supplierName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Processos de Compra" description="Solicitações, aprovação e inspeção de recebimento" />
      <DataTable
        data={purchases}
        searchKeys={["code", "description", "status"]}
        newLabel="Nova solicitação"
        onRowClick={(r) => navigate({ to: "/purchases/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id.slice(0, 8)}</span> },
          { key: "supplier_id", header: "Fornecedor", render: (r) => supplierName(r.supplier_id) },
          { key: "description", header: "Item / Serviço", render: (r) => <span className="font-medium">{r.description}</span> },
          { key: "total", header: "Valor", render: (r) => r.total != null ? `R$ ${Number(r.total).toFixed(2)}` : "—" },
          { key: "requested_at", header: "Solicitado" },
          { key: "expected_at", header: "Previsto", render: (r) => r.expected_at ?? "—" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
