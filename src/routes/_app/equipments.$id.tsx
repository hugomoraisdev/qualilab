import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equipmentsStore } from "@/lib/equipments-store";
import { calibrationsStore, evaluateRecord } from "@/lib/calibrations-store";
import { useTableStore } from "@/lib/table-store";
import { useEquipmentMeta, updateEquipmentMeta, type EquipmentCustomField } from "@/lib/equipment-meta-store";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/equipments/$id")({ component: EqDetail });

function EqDetail() {
  useAuditAccess("equipments");
  const { id } = Route.useParams();
  const { user } = useAuth();
  const equipments = useTableStore(equipmentsStore);
  const calibrations = useTableStore(calibrationsStore);
  const e = equipments.find((x) => x.id === id);
  const { meta, refresh } = useEquipmentMeta(id);

  const [maxError, setMaxError] = useState("");
  const [unit, setUnit] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [cfLabel, setCfLabel] = useState("");
  const [cfValue, setCfValue] = useState("");

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
  const actor = user?.email ?? null;

  async function saveLimit() {
    const me = parseFloat(maxError);
    if (Number.isNaN(me) || !unit.trim()) { toast.error("Informe erro máximo e unidade."); return; }
    await updateEquipmentMeta(
      id,
      (m) => ({ ...m, calibration_limit: { maxError: me, unit: unit.trim() } }),
      { action: "Limite de calibração atualizado", detail: `${me} ${unit}`, actor },
    );
    toast.success("Limite salvo");
    setMaxError(""); setUnit("");
    refresh();
  }

  async function addRecipient() {
    const email = recipientInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("E-mail inválido."); return; }
    await updateEquipmentMeta(
      id,
      (m) => m.notification_recipients.includes(email) ? m : { ...m, notification_recipients: [...m.notification_recipients, email] },
      { action: "Destinatário adicionado", detail: email, actor },
    );
    setRecipientInput("");
    refresh();
  }

  async function removeRecipient(email: string) {
    await updateEquipmentMeta(
      id,
      (m) => ({ ...m, notification_recipients: m.notification_recipients.filter((r) => r !== email) }),
      { action: "Destinatário removido", detail: email, actor },
    );
    refresh();
  }

  async function addCustomField() {
    if (!cfLabel.trim()) { toast.error("Informe o nome do campo."); return; }
    const cf: EquipmentCustomField = { id: crypto.randomUUID(), label: cfLabel.trim(), value: cfValue };
    await updateEquipmentMeta(
      id,
      (m) => ({ ...m, custom_fields: [...m.custom_fields, cf] }),
      { action: "Campo personalizado adicionado", detail: cf.label, actor },
    );
    setCfLabel(""); setCfValue("");
    refresh();
  }

  async function removeCustomField(cfid: string) {
    await updateEquipmentMeta(
      id,
      (m) => ({ ...m, custom_fields: m.custom_fields.filter((f) => f.id !== cfid) }),
      { action: "Campo personalizado removido", actor },
    );
    refresh();
  }

  return (
    <>
      <Link to="/equipments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={e.name} description={`${e.code} · ${e.manufacturer ?? ""} ${e.model ?? ""}`.trim()} actions={<StatusBadge>{e.status}</StatusBadge>} />

      <Tabs defaultValue="dados" className="w-full">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="historico">Histórico de calibrações ({cals.length})</TabsTrigger>
          <TabsTrigger value="limites">Limites de calibração</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações ({meta.notification_recipients.length})</TabsTrigger>
          <TabsTrigger value="campos">Campos personalizados ({meta.custom_fields.length})</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria ({meta.history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <dl className="text-sm grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Categoria/Tipo</dt><dd>{e.category ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Série</dt><dd className="font-mono text-xs">{e.serial_number ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Setor/Localização</dt><dd>{e.location ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Aquisição</dt><dd>{e.acquisition_date ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Próxima calibração</dt><dd>{e.next_calibration_date ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge>{e.status}</StatusBadge></dd></div>
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="historico">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Data</th><th>Validade</th><th>Provedor</th><th>Certificado</th><th>Resultado</th></tr></thead>
              <tbody>
                {cals.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">Sem calibrações registradas</td></tr>}
                {cals.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2">{c.performed_at}</td>
                    <td>{c.next_due_date ?? "—"}</td>
                    <td>{c.provider ?? "—"}</td>
                    <td className="font-mono text-xs">
                      {c.certificate_url ? (
                        <a href={c.certificate_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.certificate_number ?? "ver"}</a>
                      ) : (c.certificate_number ?? "—")}
                    </td>
                    <td><StatusBadge>{c.points?.length ? evaluateRecord(c) : c.result}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="limites">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Limite atual</h3>
              <p className="text-sm">
                {meta.calibration_limit
                  ? <>± <span className="font-mono">{meta.calibration_limit.maxError}</span> {meta.calibration_limit.unit}</>
                  : <span className="text-muted-foreground italic">usando limite global por código (fallback)</span>}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Erro máximo</Label><Input type="number" step="0.0001" value={maxError} onChange={(e) => setMaxError(e.target.value)} placeholder="ex: 0.001" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Unidade</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ex: g, mL, °C" /></div>
              <div className="flex items-end"><Button onClick={saveLimit} className="w-full">Salvar limite</Button></div>
            </div>
            <p className="text-xs text-muted-foreground">Esses valores serão usados automaticamente no formulário de nova calibração para aprovar/reprovar pontos.</p>
          </section>
        </TabsContent>

        <TabsContent value="notificacoes">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <p className="text-xs text-muted-foreground">E-mails que receberão alertas automáticos de vencimento de calibração deste equipamento.</p>
            <div className="flex gap-2">
              <Input value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} placeholder="email@empresa.com" type="email" />
              <Button onClick={addRecipient}><Plus className="size-4" /> Adicionar</Button>
            </div>
            <ul className="space-y-1">
              {meta.notification_recipients.length === 0 && <li className="text-xs text-muted-foreground italic">Nenhum destinatário configurado.</li>}
              {meta.notification_recipients.map((r) => (
                <li key={r} className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{r}</span>
                  <button onClick={() => removeRecipient(r)} className="text-muted-foreground hover:text-destructive" aria-label="Remover"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="campos">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome do campo</Label><Input value={cfLabel} onChange={(e) => setCfLabel(e.target.value)} placeholder="ex: Patrimônio" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Valor</Label><Input value={cfValue} onChange={(e) => setCfValue(e.target.value)} /></div>
              <div className="flex items-end"><Button onClick={addCustomField} className="w-full"><Plus className="size-4" /> Adicionar campo</Button></div>
            </div>
            <ul className="space-y-1">
              {meta.custom_fields.length === 0 && <li className="text-xs text-muted-foreground italic">Nenhum campo personalizado.</li>}
              {meta.custom_fields.map((f) => (
                <li key={f.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm">
                  <span><span className="text-muted-foreground">{f.label}:</span> <span className="font-medium">{f.value || "—"}</span></span>
                  <button onClick={() => removeCustomField(f.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remover"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="auditoria">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            {meta.history.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum evento registrado.</p>}
            <ul className="space-y-2">
              {meta.history.map((h) => (
                <li key={h.id} className="text-sm border-l-2 border-primary/40 pl-3">
                  <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString("pt-BR")} · {h.actor ?? "sistema"}</div>
                  <div><span className="font-medium">{h.action}</span>{h.detail ? <> — <span className="text-muted-foreground">{h.detail}</span></> : null}</div>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
