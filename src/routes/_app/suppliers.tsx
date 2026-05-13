import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  suppliersStore,
  ratingToClassification,
  getEvaluationStatus,
  evaluationStatusLabel,
} from "@/lib/suppliers-store";
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
          {
            key: "next_evaluation_date",
            header: "Próxima avaliação",
            render: (r) => {
              const st = getEvaluationStatus(r);
              const tone =
                st === "em_dia" ? "success" :
                st === "a_vencer" ? "warning" :
                st === "vencida" ? "destructive" : "muted";
              return (
                <div className="flex flex-col gap-0.5">
                  <StatusBadge tone={tone}>{evaluationStatusLabel(st)}</StatusBadge>
                  <span className="text-[11px] text-muted-foreground">{r.next_evaluation_date ?? "—"}</span>
                </div>
              );
            },
          },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
