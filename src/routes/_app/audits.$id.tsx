import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { audits } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/audits/$id")({ component: AuditDetail });

function AuditDetail() {
  const { id } = Route.useParams();
  const a = audits.find(x => x.id === id) ?? audits[0];
  const checklist = [
    { req: "4.1 Imparcialidade", result: "Conforme", note: "Política revisada em 2025." },
    { req: "6.4 Equipamentos", result: "Não conforme", note: "Mufla com calibração vencida." },
    { req: "7.2 Métodos", result: "Conforme", note: "Métodos validados disponíveis." },
    { req: "7.5 Registros", result: "Conforme", note: "Registros eletrônicos com backup." },
    { req: "8.7 Não conformidades", result: "Não aplicável", note: "—" },
  ];
  return (
    <>
      <Link to="/audits" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={a.scope} description={`${a.id} · ${a.type} · Área ${a.area}`} actions={<StatusBadge>{a.status}</StatusBadge>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Checklist da auditoria</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Requisito</th><th>Resultado</th><th>Observação</th></tr></thead>
            <tbody>
              {checklist.map((c, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2 font-medium">{c.req}</td>
                  <td><StatusBadge>{c.result}</StatusBadge></td>
                  <td className="text-muted-foreground">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-2">Dados da auditoria</h3>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-muted-foreground">Auditor</dt><dd>{a.auditor}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Planejada</dt><dd>{a.planned}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Realizada</dt><dd>{a.performed}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Achados</dt><dd>{a.findings}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
