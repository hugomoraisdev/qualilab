import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { suppliersStore, ratingToClassification } from "@/lib/suppliers-store";
import { useTableStore } from "@/lib/table-store";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/suppliers/$id")({ component: SupDetail });

function SupDetail() {
  const { id } = Route.useParams();
  const suppliers = useTableStore(suppliersStore);
  const s = suppliers.find((x) => x.id === id);

  if (!s) {
    return (
      <>
        <Link to="/suppliers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Fornecedor não encontrado.</p>
      </>
    );
  }

  return (
    <>
      <Link to="/suppliers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={s.name} description={`${s.code ?? s.id.slice(0, 8)} · ${s.cnpj ?? ""}`} actions={<StatusBadge>{ratingToClassification(s.rating)}</StatusBadge>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Dados</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted-foreground">Categoria</dt><dd>{s.category ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Contato</dt><dd>{s.contact_name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd className="text-xs">{s.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{s.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Qualificado até</dt><dd>{s.qualified_until ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Nota média</dt><dd className="font-mono">{(s.rating ?? 0).toFixed(1)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge>{s.status}</StatusBadge></dd></div>
          </dl>
        </section>
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Endereço & observações</h3>
          <p className="text-sm whitespace-pre-line">{s.address ?? "—"}</p>
          {s.notes && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{s.notes}</p>}
        </section>
      </div>
    </>
  );
}
