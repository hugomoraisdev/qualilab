import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { documents } from "@/lib/mock-data";
import { ArrowLeft, FileText, Download, History, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/documents/$id")({
  component: DocumentDetail,
});

function DocumentDetail() {
  const { id } = Route.useParams();
  const doc = documents.find(d => d.id === id) ?? documents[0];

  const versions = [
    { v: doc.version, date: "2025-09-15", author: doc.responsible, status: "Atual" },
    { v: "1.0", date: "2024-02-10", author: doc.responsible, status: "Substituída" },
  ];

  return (
    <>
      <Link to="/documents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar para documentos
      </Link>

      <PageHeader
        title={doc.title}
        description={`Código ${doc.code} · Versão ${doc.version}`}
        actions={
          <>
            <StatusBadge>{doc.status}</StatusBadge>
            <Button variant="outline" size="sm"><Download className="size-4" /> Baixar</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Dados gerais</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Categoria</dt><dd>{doc.category}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Responsável</dt><dd>{doc.responsible}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Validade</dt><dd>{doc.validity}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Versão</dt><dd className="font-mono">v{doc.version}</dd></div>
            </dl>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><History className="size-4" /> Histórico de versões</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Versão</th><th>Data</th><th>Autor</th><th>Status</th></tr></thead>
              <tbody>
                {versions.map((v, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 font-mono">v{v.v}</td><td>{v.date}</td><td>{v.author}</td><td><StatusBadge>{v.status}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="size-4" /> Comentários de revisão</h3>
            <div className="space-y-3">
              <div className="text-sm border-l-2 border-primary pl-3">
                <div className="text-xs text-muted-foreground">Roberto Gestor · 2025-09-12</div>
                Atualizada seção 4 conforme requisito 7.7 da ISO/IEC 17025:2017.
              </div>
              <div className="text-sm border-l-2 border-success pl-3">
                <div className="text-xs text-muted-foreground">Carla Administradora · 2025-09-15</div>
                Revisão aprovada. Distribuir para a equipe técnica.
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="size-4" /> Arquivo anexado</h3>
            <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
              {doc.code}-v{doc.version}.pdf<br/><span className="text-xs">2.3 MB · PDF/A</span>
            </div>
          </section>
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Aprovações</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between"><span>Elaboração</span><span className="text-xs text-muted-foreground">Mariana T.</span></li>
              <li className="flex items-center justify-between"><span>Revisão</span><span className="text-xs text-muted-foreground">Roberto G.</span></li>
              <li className="flex items-center justify-between"><span>Aprovação</span><span className="text-xs text-muted-foreground">Carla A.</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
