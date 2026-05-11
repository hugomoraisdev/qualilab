import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { suppliers } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/suppliers/$id")({ component: SupDetail });

function SupDetail() {
  const { id } = Route.useParams();
  const s = suppliers.find(x => x.id === id) ?? suppliers[0];
  const evals = [
    { date: "2025-09-30", q: 9, p: 8, c: 9, a: 9, d: 10, final: 9.0 },
    { date: "2025-03-30", q: 8, p: 7, c: 8, a: 9, d: 9, final: 8.2 },
  ];
  return (
    <>
      <Link to="/suppliers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader title={s.name} description={`${s.id} · ${s.cnpj}`} actions={<StatusBadge>{s.classification}</StatusBadge>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Dados</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted-foreground">Tipo</dt><dd>{s.type}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Contato</dt><dd>{s.contact}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd className="text-xs">{s.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{s.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge>{s.status}</StatusBadge></dd></div>
          </dl>
        </section>
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Histórico de avaliações</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Data</th><th>Qualidade</th><th>Prazo</th><th>Conformidade</th><th>Atendimento</th><th>Documentação</th><th>Nota final</th></tr></thead>
            <tbody>
              {evals.map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">{e.date}</td><td>{e.q}</td><td>{e.p}</td><td>{e.c}</td><td>{e.a}</td><td>{e.d}</td>
                  <td className="font-mono font-semibold">{e.final.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
