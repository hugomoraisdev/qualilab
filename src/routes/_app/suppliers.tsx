import { createFileRoute } from "@tanstack/react-router";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  suppliersStore,
  ratingToClassification,
  getEvaluationStatus,
  evaluationStatusLabel,
} from "@/lib/suppliers-store";
import { supplierPortalStore, countPendingSubmissions } from "@/lib/supplier-portal-store";
import { useTableStore } from "@/lib/table-store";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_app/suppliers")({ component: SupPage });

function SupPage() {
  useAuditAccess("suppliers");
  const suppliers = useTableStore(suppliersStore);
  useTableStore(supplierPortalStore);
  const pending = countPendingSubmissions();
  return (
    <>
      <PageHeader
        title="Fornecedores"
        description="Cadastro, qualificação e avaliação de desempenho"
        actions={
          <span
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium"
            title="Submissões recebidas pelo portal público aguardando análise"
          >
            <Inbox className="size-4" />
            Portal: {pending} pendente{pending === 1 ? "" : "s"}
            {pending > 0 && (
              <span className="ml-1 inline-flex size-2 rounded-full bg-warning" />
            )}
          </span>
        }
      />
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
