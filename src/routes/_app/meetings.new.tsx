import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createMeetingSeries, type Meeting, type AgendaItem } from "@/lib/meetings-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/meetings/new")({ component: NewMeeting });

function NewMeeting() {
  const navigate = useNavigate();
  const [type, setType] = useState("Análise Crítica pela Direção");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [participants, setParticipants] = useState("Roberto Gestor, Mariana Técnica, Paulo Auditor");
  const [agendaText, setAgendaText] = useState("Revisão de indicadores\nStatus de auditorias\nAções corretivas em aberto");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly" | "quarterly">("monthly");
  const [until, setUntil] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });

  function save() {
    const agenda: AgendaItem[] = agendaText
      .split("\n")
      .map((s) => s.trim()).filter(Boolean)
      .map((title, i) => ({ id: `A${i + 1}-${Date.now().toString(36)}`, title, status: "Pendente" as const }));

    const base: Omit<Meeting, "id"> = {
      type, date, time,
      participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
      agenda,
      status: "Agendada",
      recurrence: recurring ? { frequency, until } : undefined,
    };
    const created = createMeetingSeries(base);
    toast.success(
      recurring ? `${created.length} reuniões criadas (recorrência ${frequency})` : "Reunião criada",
      { description: `Primeira em ${date}` },
    );
    navigate({ to: "/meetings/$id", params: { id: created[0].id } });
  }

  return (
    <>
      <Link to="/meetings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar para reuniões
      </Link>
      <PageHeader title="Nova reunião" description="Configure participantes, pautas e recorrência" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Tipo de reunião</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data inicial</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Participantes (separados por vírgula)</Label>
              <Input value={participants} onChange={(e) => setParticipants(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Pautas (uma por linha)</Label>
              <Textarea rows={5} value={agendaText} onChange={(e) => setAgendaText(e.target.value)} />
            </div>
          </div>
        </section>

        <aside className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold">Recorrência</h3>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recurring} onCheckedChange={(v) => setRecurring(!!v)} />
            Reunião recorrente
          </label>
          {recurring && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "weekly" | "biweekly" | "monthly" | "quarterly")}
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Repetir até</Label>
                <Input type="date" min={date}
                  value={until}
                  onChange={(e) => setUntil(e.target.value)} />
              </div>
              <div className="text-xs text-muted-foreground">
                Serão criadas reuniões com a frequência escolhida até {until}.
              </div>
            </div>
          )}
          <Button className="w-full" onClick={save}>Criar reunião{recurring ? "s" : ""}</Button>
        </aside>
      </div>
    </>
  );
}
