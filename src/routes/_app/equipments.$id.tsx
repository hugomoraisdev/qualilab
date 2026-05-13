import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { equipmentsStore } from "@/lib/equipments-store";
import { calibrationsStore, evaluateRecord } from "@/lib/calibrations-store";
import { useTableStore } from "@/lib/table-store";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/equipments/$id")({ component: EqDetail });

function EqDetail() {
  const { id } = Route.useParams();
  const equipments = useTableStore(equipmentsStore);
  const calibrations = useTableStore(calibrationsStore);
  const e = equipments.find((x) => x.id === id);

  if (!e) {
    return (
      <>
        <Link to="/equipments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Equipamento não encontrado.</p>
      </>
    );
  }

  const cals = calibrations.filter((c) => c.equipment_id === e.id);

  return (
    <>
      <Link to="/equipments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={e.name} description={`${e.code} · ${e.manufacturer ?? ""} ${e.model ?? ""}`.trim()} actions={<StatusBadge>{e.status}</StatusBadge>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Dados</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted-foreground">Categoria</dt><dd>{e.category ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Série</dt><dd className="font-mono text-xs">{e.serial_number ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Localização</dt><dd>{e.location ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Aquisição</dt><dd>{e.acquisition_date ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Próxima calibração</dt><dd>{e.next_calibration_date ?? "—"}</dd></div>
          </dl>
        </section>
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Histórico de calibrações</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Data</th><th>Validade</th><th>Provedor</th><th>Resultado</th></tr></thead>
            <tbody>
              {cals.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground text-xs">Sem calibrações registradas</td></tr>}
              {cals.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2">{c.performed_at}</td>
                  <td>{c.next_due_date ?? "—"}</td>
                  <td>{c.provider ?? "—"}</td>
                  <td><StatusBadge>{c.points?.length ? evaluateRecord(c) : c.result}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
