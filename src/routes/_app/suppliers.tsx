import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { suppliersStore, ratingToClassification } from "@/lib/suppliers-store";
import { useTableStore } from "@/lib/table-store";

export const Route = createFileRoute("/_app/suppliers")({ component: SupPage });

function SupPage() {
  const suppliers = useTableStore(suppliersStore);
  return (
    <>
      <PageHeader title="Fornecedores" description="Cadastro, qualificação e avaliação de desempenho" />
      <DataTable
        data={suppliers}
        searchKeys={["code", "name", "cnpj", "category", "contact_name", "status"]}
        newLabel="Novo fornecedor"
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id.slice(0, 8)}</span> },
          { key: "name", header: "Razão social", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "cnpj", header: "CNPJ", render: (r) => <span className="font-mono text-xs">{r.cnpj ?? "—"}</span> },
          { key: "category", header: "Categoria", render: (r) => r.category ?? "—" },
          { key: "contact_name", header: "Contato", render: (r) => r.contact_name ?? "—" },
          { key: "rating", header: "Classificação", render: (r) => <StatusBadge>{ratingToClassification(r.rating)}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
