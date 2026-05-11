import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { forms } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/forms/$id")({ component: FormDetail });

function FormDetail() {
  const { id } = Route.useParams();
  const f = forms.find(x => x.id === id) ?? forms[0];
  return (
    <>
      <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader title={f.name} description={`${f.id} · ${f.periodicity} · Responsável ${f.responsible}`} />
      <form className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4 max-w-2xl"
        onSubmit={(e) => { e.preventDefault(); toast.success("Formulário submetido com sucesso!"); }}>
        <div className="space-y-2"><Label>Equipamento</Label><Input placeholder="BAL-001 — Balança Analítica" /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Data</Label><Input type="date" defaultValue={new Date().toISOString().slice(0,10)} /></div>
          <div className="space-y-2"><Label>Hora</Label><Input type="time" defaultValue="08:00" /></div>
        </div>
        <div className="space-y-2"><Label>Temperatura medida (°C)</Label><Input type="number" step="0.1" defaultValue="22.5" /></div>
        <div className="space-y-2"><Label>Observações</Label><textarea className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="Equipamento operando dentro dos parâmetros." /></div>
        <div className="space-y-2"><Label>Anexo (evidência)</Label><Input type="file" /></div>
        <div className="space-y-2"><Label>Validação / Assinatura</Label><Input placeholder="Nome do responsável" /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline">Cancelar</Button><Button type="submit">Enviar resposta</Button></div>
      </form>
    </>
  );
}
