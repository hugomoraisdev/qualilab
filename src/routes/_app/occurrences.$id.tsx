import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { occurrences } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/occurrences/$id")({ component: OccDetail });

function OccDetail() {
  const { id } = Route.useParams();
  const o = occurrences.find(x => x.id === id) ?? occurrences[0];
  return (
    <>
      <Link to="/occurrences" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={o.description} description={`${o.id} · ${o.type} · Origem ${o.origin}`} actions={<StatusBadge>{o.status}</StatusBadge>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Análise de causa (5 Porquês)</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Por que aconteceu? Falha de controle no cronograma.</li>
              <li>Por quê? Não há sistema centralizado de alertas.</li>
              <li>Por quê? Os prazos eram controlados em planilha.</li>
              <li>Por quê? Falta de ferramenta corporativa.</li>
              <li>Por quê? Subestimação do risco operacional.</li>
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Ações</h3>
            <ul className="text-sm space-y-1.5">
              <li>• <span className="font-medium">Corretiva:</span> Tratar imediatamente o equipamento envolvido.</li>
              <li>• <span className="font-medium">Preventiva:</span> Implantar painel de alertas no QualiLab.</li>
            </ul>
          </div>
        </section>
        <aside className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Dados</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted-foreground">Severidade</dt><dd><StatusBadge>{o.severity}</StatusBadge></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Responsável</dt><dd>{o.responsible}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Identificada</dt><dd>{o.date}</dd></div>
          </dl>
        </aside>
      </div>
    </>
  );
}
