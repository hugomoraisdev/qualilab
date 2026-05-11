import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { documents } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <>
      <PageHeader title="Documentos" description="Controle documental com versão, validade e aprovação" />
      <DataTable
        data={documents}
        searchKeys={["code", "title", "category", "status", "responsible"]}
        newLabel="Novo documento"
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "title", header: "Título", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "category", header: "Categoria" },
          { key: "version", header: "Versão", render: (r) => <span className="font-mono text-xs">v{r.version}</span> },
          { key: "validity", header: "Validade" },
          { key: "responsible", header: "Responsável" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
