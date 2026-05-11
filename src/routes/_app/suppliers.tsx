import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { suppliers } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/suppliers")({ component: SupPage });

function SupPage() {
  return (
    <>
      <PageHeader title="Fornecedores" description="Cadastro, qualificação e avaliação de desempenho" />
      <DataTable
        data={suppliers}
        searchKeys={["id", "name", "cnpj", "type", "contact", "status", "classification"]}
        newLabel="Novo fornecedor"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "name", header: "Razão social", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "cnpj", header: "CNPJ", render: (r) => <span className="font-mono text-xs">{r.cnpj}</span> },
          { key: "type", header: "Tipo" },
          { key: "contact", header: "Contato" },
          { key: "classification", header: "Classificação", render: (r) => <StatusBadge>{r.classification}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
