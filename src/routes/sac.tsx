import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveTicket, nextProtocol, type CustomerTicket, type TicketType } from "@/lib/sac-store";
import { CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/sac")({
  head: () => ({
    meta: [
      { title: "QualiLab — Portal SAC" },
      { name: "description", content: "Canal público de manifestações e ouvidoria do laboratório." },
    ],
  }),
  component: SacPublic,
});

function SacPublic() {
  const [customerName, setCustomerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [type, setType] = useState<TicketType>("reclamacao");
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !description.trim() || !contactEmail.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const proto = nextProtocol();
    const t: CustomerTicket = {
      id: "SAC-" + Date.now().toString(36).toUpperCase(),
      protocol: proto, customerName, contactEmail, type,
      description, status: "aberto", priority: "media", origin: "portal",
      createdAt: now, updatedAt: now, assignedTo: "—",
      timeline: [{ date: now, author: "Portal Público", action: "Ticket aberto via /sac" }],
    };
    saveTicket(t);
    setProtocol(proto);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="QualiLab" className="size-10 rounded-lg object-contain bg-white p-1 ring-1 ring-border" />
          <div>
            <div className="text-lg font-semibold">QualiLab — Portal SAC</div>
            <div className="text-xs text-muted-foreground">Canal público de manifestações</div>
          </div>
        </div>

        {protocol ? (
          <div className="text-center space-y-3 py-6">
            <CheckCircle2 className="size-12 text-success mx-auto" />
            <h2 className="text-xl font-semibold">Manifestação registrada!</h2>
            <p className="text-sm text-muted-foreground">Sua mensagem foi recebida. Você receberá retorno por e-mail.</p>
            <div className="inline-block bg-muted rounded-md px-4 py-2 text-sm">
              Protocolo: <span className="font-mono font-semibold">{protocol}</span>
            </div>
            <div className="pt-4">
              <button onClick={() => { setProtocol(null); setCustomerName(""); setContactEmail(""); setDescription(""); }} className="text-sm text-primary underline">
                Registrar nova manifestação
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required maxLength={120} /></div>
            <div className="space-y-1.5"><Label>E-mail *</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required maxLength={150} /></div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <select value={type} onChange={(e) => setType(e.target.value as TicketType)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="reclamacao">Reclamação</option>
                <option value="sugestao">Sugestão</option>
                <option value="elogio">Elogio</option>
                <option value="duvida">Dúvida</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Descrição *</Label><textarea required maxLength={1500} className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <Button type="submit" className="w-full">Enviar manifestação</Button>
            <div className="text-center text-xs text-muted-foreground">
              <Link to="/" className="underline hover:text-foreground">Voltar ao site</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
