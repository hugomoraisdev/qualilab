import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveTicket, nextProtocol, type CustomerTicket, type TicketType, type TicketPriority } from "@/lib/sac-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customer-service/new")({ component: NewTicket });

function NewTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [type, setType] = useState<TicketType>("reclamacao");
  const [priority, setPriority] = useState<TicketPriority>("media");
  const [description, setDescription] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !description.trim()) return toast.error("Preencha cliente e descrição.");
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const t: CustomerTicket = {
      id: "SAC-" + Date.now().toString(36).toUpperCase(),
      protocol: nextProtocol(),
      customerName, contactEmail, type, priority, description,
      status: "aberto", origin: "interno",
      createdAt: now, updatedAt: now,
      assignedTo: user?.name ?? "—",
      timeline: [{ date: now, author: user?.name ?? "Sistema", action: "Ticket aberto" }],
    };
    saveTicket(t);
    toast.success("Atendimento aberto", { description: `Protocolo ${t.protocol}` });
    navigate({ to: "/customer-service/$id", params: { id: t.id } });
  };

  return (
    <>
      <Link to="/customer-service" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader title="Novo atendimento" description="Registre uma manifestação interna do cliente." />
      <form onSubmit={submit} className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Cliente *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>E-mail de contato</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select value={type} onChange={(e) => setType(e.target.value as TicketType)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="reclamacao">Reclamação</option>
              <option value="sugestao">Sugestão</option>
              <option value="elogio">Elogio</option>
              <option value="duvida">Dúvida</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Descrição *</Label><textarea className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => navigate({ to: "/customer-service" })}>Cancelar</Button><Button type="submit">Abrir atendimento</Button></div>
      </form>
    </>
  );
}
