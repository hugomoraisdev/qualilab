import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { equipmentsStore, saveEquipment } from "@/lib/equipments-store";
import { calibrationsStore, evaluateRecord } from "@/lib/calibrations-store";
import { useTableStore } from "@/lib/table-store";
import { ArrowLeft, Bell, Plus, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendEmail } from "@/lib/send-email.functions";

export const Route = createFileRoute("/_app/equipments/$id")({ component: EqDetail });

function RecipientsCard({ equipmentId, nextDueDate }: { equipmentId: string; nextDueDate: string | null }) {
  const equipments = useTableStore(equipmentsStore);
  const e = equipments.find((x) => x.id === equipmentId);
  const recipients: string[] = e?.notification_recipients ?? [];

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || recipients.includes(trimmed)) { setEmail(""); return; }
    setBusy(true);
    try {
      await saveEquipment({ ...e!, notification_recipients: [...recipients, trimmed] });
      setEmail("");
      toast.success("Destinatário adicionado");
    } catch {
      toast.error("Falha ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (r: string) => {
    if (!e) return;
    await saveEquipment({ ...e, notification_recipients: recipients.filter((x) => x !== r) });
    toast.success("Destinatário removido");
  };

  const handleNotify = async () => {
    if (!e || recipients.length === 0) return;
    setSending(true);
    try {
      const dueInfo = nextDueDate
        ? `próxima calibração em <strong>${new Date(nextDueDate).toLocaleDateString("pt-BR")}</strong>`
        : "calibração com data de vencimento não cadastrada";
      await sendEmail({ data: {
        to: recipients,
        subject: `[QualiLab] Lembrete de calibração — ${e.name} (${e.code})`,
        html: `
          <p>Olá,</p>
          <p>Este é um lembrete automático do sistema QualiLab sobre o equipamento:</p>
          <ul>
            <li><strong>Equipamento:</strong> ${e.name} (${e.code})</li>
            <li><strong>Localização:</strong> ${e.location ?? "—"}</li>
            <li><strong>Situação:</strong> ${dueInfo}</li>
          </ul>
          <p>Acesse o sistema para registrar a calibração ou atualizar o status.</p>
          <p>— QualiLab</p>
        `,
      } });
      toast.success("Notificação enviada", { description: `${recipients.length} destinatário(s)` });
    } catch (err) {
      toast.error("Falha ao enviar e-mail", { description: String((err as Error)?.message ?? err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Bell className="size-4" /> Notificações de calibração
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Estes e-mails receberão alertas automáticos quando a calibração deste equipamento estiver próxima do vencimento.
      </p>

      {recipients.length === 0 ? (
        <p className="text-xs text-muted-foreground italic mb-3">Nenhum destinatário configurado. Alertas aparecerão apenas no painel.</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {recipients.map((r) => (
            <li key={r} className="flex items-center justify-between gap-2 text-sm border border-border rounded-md px-3 py-1.5">
              <span className="text-sm">{r}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRemove(r)}>
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Adicionar e-mail</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="colaborador@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={busy || !email.trim()}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </div>

      {recipients.length > 0 && (
        <div className="pt-3 border-t border-border mt-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleNotify}
            disabled={sending}
          >
            {sending
              ? <span className="size-3.5 animate-spin border-2 border-current border-t-transparent rounded-full mr-1" />
              : <Send className="size-4 mr-1" />}
            Enviar lembrete agora
          </Button>
        </div>
      )}
    </section>
  );
}

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
        <div className="space-y-4">
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
          <RecipientsCard equipmentId={e.id} nextDueDate={e.next_calibration_date} />
        </div>
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
