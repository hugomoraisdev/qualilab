import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { equipments, calibrations } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/equipments/$id")({ component: EqDetail });

function EqDetail() {
  const { id } = Route.useParams();
  const e = equipments.find(x => x.id === id) ?? equipments[0];
  const cals = calibrations.filter(c => c.equipment.startsWith(e.code));
  return (
    <>
      <Link to="/equipments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader title={e.name} description={`${e.code} · ${e.manufacturer} ${e.model}`} actions={<StatusBadge>{e.status}</StatusBadge>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Dados</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted-foreground">Tipo</dt><dd>{e.type}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Série</dt><dd className="font-mono text-xs">{e.serial}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Localização</dt><dd>{e.location}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Responsável</dt><dd>{e.responsible}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Periodicidade</dt><dd>{e.periodicity}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Última calibração</dt><dd>{e.lastCal}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Próxima calibração</dt><dd>{e.nextCal}</dd></div>
          </dl>
        </section>
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Histórico de calibrações</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Data</th><th>Validade</th><th>Lab</th><th>Resultado</th><th>Status</th></tr></thead>
            <tbody>
              {cals.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">Sem calibrações registradas</td></tr>}
              {cals.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2">{c.date}</td><td>{c.validity}</td><td>{c.lab}</td>
                  <td><StatusBadge>{c.result}</StatusBadge></td>
                  <td><StatusBadge>{c.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
