import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CalendarDays,
  Calculator,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Layers,
  Paperclip,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  type CalibrationPoint,
  type CalibrationRow,
  evaluatePoint,
  evaluateRecord,
  calibrationsStore,
  saveCalibration,
  newCalibrationId,
} from "@/lib/calibrations-store";
import { equipmentsStore, type EquipmentRow } from "@/lib/equipments-store";
import { useTableStore } from "@/lib/table-store";
import { useAuth } from "@/lib/auth";
import {
  useAllEquipmentMeta,
  writeEquipmentMeta,
  readEquipmentMeta,
} from "@/lib/equipment-meta-store";
import { useServerFn } from "@tanstack/react-start";
import { sendEmail } from "@/lib/send-email.functions";

export const Route = createFileRoute("/_app/calibrations")({ component: CalPage });

const LIMITS: Record<string, { maxError: number; unit: string }> = {
  "BAL-001": { maxError: 0.001, unit: "g" },
  "PIP-001": { maxError: 0.05, unit: "mL" },
  "TER-001": { maxError: 0.5, unit: "°C" },
  "EST-001": { maxError: 1.0, unit: "°C" },
  "PHM-001": { maxError: 0.05, unit: "pH" },
  "CON-001": { maxError: 1.0, unit: "µS/cm" },
  "ESP-001": { maxError: 1.0, unit: "nm" },
  "AUT-001": { maxError: 2.0, unit: "°C" },
  "REF-001": { maxError: 1.0, unit: "°C" },
  "MUF-001": { maxError: 10, unit: "°C" },
};

function LimitsConfigPanel({ equipments }: { equipments: EquipmentRow[] }) {
  const equipMetaMap = useAllEquipmentMeta(equipments.map((e) => e.id));
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { maxError: string; unit: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const d: Record<string, { maxError: string; unit: string }> = {};
    for (const e of equipments) {
      const limit = equipMetaMap[e.id]?.calibration_limit ??
        LIMITS[e.code] ?? { maxError: 1, unit: "—" };
      d[e.id] = { maxError: String(limit.maxError), unit: limit.unit };
    }
    setDrafts(d);
  }, [equipments, equipMetaMap]);

  async function saveLimitForEquip(equipId: string) {
    const draft = drafts[equipId];
    if (!draft) return;
    const maxError = parseFloat(draft.maxError);
    if (isNaN(maxError) || maxError <= 0) {
      toast.error("Erro máximo deve ser um número positivo.");
      return;
    }
    setSaving(equipId);
    try {
      const meta = await readEquipmentMeta(equipId);
      await writeEquipmentMeta(equipId, {
        ...meta,
        calibration_limit: { maxError, unit: draft.unit },
      });
      toast.success("Limite salvo.");
    } catch (e) {
      toast.error("Falha ao salvar limite.", { description: (e as Error).message });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm mb-6 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Settings2 className="size-4 text-primary" />
          Limites de aceitação por equipamento
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs text-muted-foreground mb-4">
            Configure o erro máximo aceitável por equipamento. Estes valores sobrepõem os padrões do
            sistema e são usados para avaliar conformidade nos pontos de calibração.
          </p>
          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-3 text-[11px] uppercase tracking-wider text-muted-foreground px-1">
              <span>Equipamento</span>
              <span>Erro máx. (±)</span>
              <span>Unidade</span>
              <span></span>
            </div>
            {equipments.map((e) => {
              const draft = drafts[e.id] ?? { maxError: "1", unit: "—" };
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center border border-border rounded-md px-3 py-2 bg-background"
                >
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{e.code}</span>
                    <span className="ml-2 text-sm">{e.name}</span>
                  </div>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="h-8 text-sm"
                    value={draft.maxError}
                    onChange={(ev) =>
                      setDrafts((d) => ({ ...d, [e.id]: { ...draft, maxError: ev.target.value } }))
                    }
                  />
                  <Input
                    className="h-8 text-sm"
                    placeholder="g, mL, °C…"
                    value={draft.unit}
                    onChange={(ev) =>
                      setDrafts((d) => ({ ...d, [e.id]: { ...draft, unit: ev.target.value } }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={saving === e.id}
                    onClick={() => void saveLimitForEquip(e.id)}
                  >
                    {saving === e.id ? <Loader2 className="size-3.5 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              );
            })}
            {equipments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum equipamento cadastrado.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function emptyPoint(equipCode: string, idx: number): CalibrationPoint {
  const cfg = LIMITS[equipCode] ?? { maxError: 1, unit: "—" };
  const presets = ["0% da escala", "50% da escala", "100% da escala"];
  return {
    id: `P${idx + 1}-${Date.now().toString(36)}`,
    label: presets[idx] ?? `Ponto ${idx + 1}`,
    nominal: 0,
    measured: 0,
    uncertainty: 0,
    maxError: cfg.maxError,
    unit: cfg.unit,
  };
}

function MultiPointForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const equipments = useTableStore(equipmentsStore);
  const equipMetaMap = useAllEquipmentMeta(equipments.map((e) => e.id));
  const sendEmailFn = useServerFn(sendEmail);
  const firstCode = equipments[0]?.code ?? "";
  const [equipCode, setEquipCode] = useState(firstCode);
  const [provider, setProvider] = useState("INMETRO");
  const [certificate, setCertificate] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [validity, setValidity] = useState("");

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `calibrations/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(path);
      setCertificateUrl(urlData.publicUrl);
      toast.success("Certificado anexado", { description: file.name });
    } catch (err) {
      toast.error("Falha no upload", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }
  const [points, setPoints] = useState<CalibrationPoint[]>(() => [
    emptyPoint(firstCode, 0),
    emptyPoint(firstCode, 1),
    emptyPoint(firstCode, 2),
  ]);

  // Quando os equipamentos terminam de carregar, seleciona o primeiro.
  useEffect(() => {
    if (!equipCode && equipments.length) setEquipCode(equipments[0].code);
  }, [equipments, equipCode]);

  const equip = equipments.find((e) => e.code === equipCode);
  const customLimit = equip ? equipMetaMap[equip.id]?.calibration_limit : null;
  const cfg = customLimit ?? LIMITS[equipCode] ?? { maxError: 1, unit: "—" };

  // Atualiza limites/unidade dos pontos quando o equipamento muda
  useEffect(() => {
    setPoints((pts) => pts.map((p) => ({ ...p, maxError: cfg.maxError, unit: cfg.unit })));
  }, [equipCode, cfg.maxError, cfg.unit]);

  const addPoint = () => setPoints((pts) => [...pts, emptyPoint(equipCode, pts.length)]);
  const removePoint = (id: string) => setPoints((pts) => pts.filter((p) => p.id !== id));
  const updatePoint = (id: string, patch: Partial<CalibrationPoint>) =>
    setPoints((pts) => pts.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const overall = useMemo(() => {
    if (!points.length) return null;
    const evals = points.map(evaluatePoint);
    const allOk = evals.every((e) => e.approved);
    return { allOk, evals };
  }, [points]);

  async function handleSave() {
    if (!equip) {
      toast.error("Selecione um equipamento.");
      return;
    }
    if (!certificate.trim() || !date || !validity) {
      toast.error("Preencha certificado, data e validade.");
      return;
    }
    if (!points.length) {
      toast.error("Adicione ao menos um ponto.");
      return;
    }
    const status = evaluateRecord({ points });
    const rec: CalibrationRow = {
      id: newCalibrationId(),
      equipment_id: equip.id,
      certificate_number: certificate,
      provider,
      performed_at: date,
      next_due_date: validity,
      result: status === "Aprovada" ? "aprovado" : "reprovado",
      uncertainty: null,
      points,
      certificate_url: certificateUrl.trim() || null,
      notes: null,
      responsible_id: user?.id ?? null,
    };
    void saveCalibration(rec);
    toast[status === "Aprovada" ? "success" : "error"](`Calibração ${status}`, {
      description: `${equip.code} · ${points.length} ponto(s)`,
    });

    const recipients = equipMetaMap[equip.id]?.notification_recipients ?? [];
    if (recipients.length > 0) {
      try {
        await sendEmailFn({
          data: {
            to: recipients,
            subject: `[Qualilab] Calibração ${status} — ${equip.code}`,
            html: `<p>Equipamento: <b>${equip.name}</b> (${equip.code})</p>
                   <p>Certificado: <b>${certificate}</b> · Provedor: ${provider}</p>
                   <p>Realizada em ${date} · Validade ${validity}</p>
                   <p>Resultado: <b>${status}</b> em ${points.length} ponto(s)</p>`,
          },
        });
        toast.success(`E-mail enviado para ${recipients.length} destinatário(s)`);
      } catch (err) {
        console.error("Falha ao enviar e-mail de calibração", err);
        toast.error("Falha ao enviar e-mail (calibração foi salva)");
      }
    }

    setCertificate("");
    setCertificateUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onSaved();
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">
          Nova calibração — múltiplos pontos por equipamento
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Adicione quantos pontos forem necessários (ex.: 0%, 50% e 100% da escala). Cada ponto possui
        valor nominal, valor medido, incerteza e resultado individual. O resultado geral é{" "}
        <span className="font-medium">Aprovado</span> apenas se{" "}
        <span className="font-medium">todos</span> os pontos forem conformes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs">Equipamento</Label>
          <select
            value={equipCode}
            onChange={(e) => setEquipCode(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {equipments.length === 0 && <option value="">— Cadastre um equipamento —</option>}
            {equipments.map((e) => (
              <option key={e.id} value={e.code}>
                {e.code} — {e.name}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-muted-foreground">
            {equip?.location ?? "—"} · limite máximo configurado ± {cfg.maxError} {cfg.unit}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Provedor</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Validade</Label>
          <Input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
          <Label className="text-xs">Certificado</Label>
          <Input
            value={certificate}
            onChange={(e) => setCertificate(e.target.value)}
            placeholder="ex: CERT-2026-0001"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
          <Label className="text-xs">Certificado (PDF/laudo)</Label>
          <div className="flex gap-2">
            <Input
              value={certificateUrl}
              onChange={(e) => setCertificateUrl(e.target.value)}
              placeholder="Cole um link ou faça upload do arquivo →"
              className="flex-1"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileUpload(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              {uploading ? "Enviando…" : "Anexar"}
            </Button>
          </div>
          {certificateUrl && (
            <a
              href={certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline truncate block"
            >
              {certificateUrl}
            </a>
          )}
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
          <div className="text-xs font-semibold flex items-center gap-2">
            <Calculator className="size-3.5" /> Pontos de Calibração ({points.length})
          </div>
          <Button size="sm" variant="outline" onClick={addPoint}>
            <Plus className="size-3.5" /> Adicionar ponto
          </Button>
        </div>
        <div className="divide-y divide-border">
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto_auto] gap-2 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground bg-background">
            <span>Identificação</span>
            <span>Nominal ({cfg.unit})</span>
            <span>Medido ({cfg.unit})</span>
            <span>Erro ({cfg.unit})</span>
            <span>Incerteza ({cfg.unit})</span>
            <span>Resultado</span>
            <span></span>
          </div>
          {points.map((p, idx) => {
            const ev = evaluatePoint(p);
            return (
              <div
                key={p.id}
                className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto_auto] gap-2 px-3 py-2 items-center"
              >
                <Input
                  className="h-9"
                  value={p.label}
                  onChange={(e) => updatePoint(p.id, { label: e.target.value })}
                  placeholder={`Ponto ${idx + 1}`}
                />
                <Input
                  className="h-9"
                  type="number"
                  step="0.0001"
                  value={p.nominal}
                  onChange={(e) => updatePoint(p.id, { nominal: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  className="h-9"
                  type="number"
                  step="0.0001"
                  value={p.measured}
                  onChange={(e) => updatePoint(p.id, { measured: parseFloat(e.target.value) || 0 })}
                />
                <div className="h-9 rounded-md border border-dashed border-border bg-muted/40 px-3 flex items-center text-xs font-mono">
                  {ev.error.toFixed(4)}
                </div>
                <Input
                  className="h-9"
                  type="number"
                  step="0.0001"
                  value={p.uncertainty}
                  onChange={(e) =>
                    updatePoint(p.id, { uncertainty: parseFloat(e.target.value) || 0 })
                  }
                />
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border",
                    ev.approved
                      ? "bg-success/15 text-success border-success/40"
                      : "bg-destructive/15 text-destructive border-destructive/40",
                  )}
                >
                  {ev.approved ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {ev.approved ? "Conforme" : "Não conforme"}
                </span>
                <button
                  onClick={() => removePoint(p.id)}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted"
                  aria-label="Remover ponto"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
          {!points.length && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum ponto adicionado.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Resultado geral:{" "}
          {overall ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border-2 ml-1",
                overall.allOk
                  ? "bg-success/15 text-success border-success"
                  : "bg-destructive/15 text-destructive border-destructive",
              )}
            >
              {overall.allOk ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              {overall.allOk ? "APROVADA" : "REPROVADA"}
            </span>
          ) : (
            <span className="italic">aguardando pontos</span>
          )}
        </div>
        <Button onClick={handleSave}>Salvar calibração</Button>
      </div>
    </section>
  );
}

function CalPage() {
  useAuditAccess("calibrations");
  const [refreshTick, setRefreshTick] = useState(0);
  const calibrations = useTableStore(calibrationsStore);
  const equipments = useTableStore(equipmentsStore);

  const [filterEquip, setFilterEquip] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterValidity, setFilterValidity] = useState("");
  const [filterProvider, setFilterProvider] = useState("");

  const hasFilter = filterEquip || filterResult || filterValidity || filterProvider;

  const today = new Date().toISOString().slice(0, 10);
  const plus30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const plus60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

  const filteredCalibrations = useMemo(() => {
    let list = calibrations;
    if (filterEquip) list = list.filter((c) => c.equipment_id === filterEquip);
    if (filterResult) {
      list = list.filter((c) => {
        const res = c.points?.length ? evaluateRecord(c) : (c.result ?? "");
        if (filterResult === "aprovado")
          return res.toLowerCase() === "aprovada" || res.toLowerCase() === "aprovado";
        if (filterResult === "reprovado")
          return res.toLowerCase() === "reprovada" || res.toLowerCase() === "reprovado";
        return true;
      });
    }
    if (filterValidity) {
      list = list.filter((c) => {
        if (!c.next_due_date) return false;
        if (filterValidity === "vencidas") return c.next_due_date < today;
        if (filterValidity === "30dias")
          return c.next_due_date >= today && c.next_due_date <= plus30;
        if (filterValidity === "60dias")
          return c.next_due_date >= today && c.next_due_date <= plus60;
        return true;
      });
    }
    if (filterProvider) {
      const q = filterProvider.toLowerCase();
      list = list.filter((c) => (c.provider ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [
    calibrations,
    filterEquip,
    filterResult,
    filterValidity,
    filterProvider,
    today,
    plus30,
    plus60,
  ]);

  const equipLabel = (id: string) => {
    const e = equipments.find((x) => x.id === id);
    return e ? `${e.code} — ${e.name}` : id.slice(0, 8);
  };

  const upcoming = [...calibrations]
    .filter((c) => c.next_due_date)
    .sort((a, b) => (a.next_due_date ?? "").localeCompare(b.next_due_date ?? ""))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Calibrações"
        description="Cronograma, certificados, rastreabilidade metrológica e múltiplos pontos por equipamento"
      />

      <LimitsConfigPanel equipments={equipments} />

      <MultiPointForm onSaved={() => setRefreshTick((t) => t + 1)} />

      {upcoming.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="size-4" /> Próximas calibrações
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {upcoming.map((c) => {
              const overdue = !!c.next_due_date && c.next_due_date < today;
              return (
                <div
                  key={c.id}
                  className={`border rounded-md p-3 bg-background ${overdue ? "border-destructive" : "border-border"}`}
                >
                  <div className="text-xs font-mono text-muted-foreground">
                    {c.certificate_number ?? c.id.slice(0, 8)}
                  </div>
                  <div className="text-sm font-medium truncate">{equipLabel(c.equipment_id)}</div>
                  <div
                    className={`text-xs mt-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                  >
                    {overdue ? `Vencida em ${c.next_due_date}` : `Vence em ${c.next_due_date}`}
                  </div>
                  <div className="mt-1.5">
                    <StatusBadge>{c.points?.length ? evaluateRecord(c) : c.result}</StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros personalizados */}
      <div className="bg-card border border-border rounded-lg px-5 py-3 shadow-sm mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Filter className="size-4 text-muted-foreground mt-5 shrink-0" />
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs">Equipamento</Label>
            <select
              value={filterEquip}
              onChange={(e) => setFilterEquip(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {equipments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs">Resultado</Label>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              <option value="aprovado">Aprovada</option>
              <option value="reprovado">Reprovada</option>
            </select>
          </div>
          <div className="space-y-1 min-w-[170px]">
            <Label className="text-xs">Validade</Label>
            <select
              value={filterValidity}
              onChange={(e) => setFilterValidity(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="vencidas">Vencidas</option>
              <option value="30dias">A vencer em 30 dias</option>
              <option value="60dias">A vencer em 60 dias</option>
            </select>
          </div>
          <div className="space-y-1 min-w-[150px]">
            <Label className="text-xs">Provedor</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Filtrar provedor…"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
            />
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={() => {
                setFilterEquip("");
                setFilterResult("");
                setFilterValidity("");
                setFilterProvider("");
              }}
            >
              <X className="size-3.5" /> Limpar filtros
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto self-end pb-1">
            {filteredCalibrations.length} registro(s)
          </span>
        </div>
      </div>

      <DataTable
        key={refreshTick}
        data={filteredCalibrations}
        searchKeys={["certificate_number", "provider", "result"]}
        newLabel="Nova calibração"
        hideNew
        exportName="calibracoes"
        columns={[
          {
            key: "certificate_number",
            header: "Certificado",
            render: (r) => <span className="font-mono text-xs">{r.certificate_number ?? "—"}</span>,
          },
          {
            key: "equipment_id",
            header: "Equipamento",
            accessor: (r) => equipLabel(r.equipment_id),
            render: (r) => equipLabel(r.equipment_id),
          },
          { key: "performed_at", header: "Data" },
          {
            key: "next_due_date",
            header: "Validade",
            render: (r) => {
              if (!r.next_due_date) return "—";
              const overdue = r.next_due_date < today;
              return (
                <span className={overdue ? "text-destructive font-medium" : ""}>
                  {r.next_due_date}
                </span>
              );
            },
          },
          { key: "provider", header: "Provedor", render: (r) => r.provider ?? "—" },
          {
            key: "certificate_url",
            header: "Anexo",
            render: (r) =>
              r.certificate_url ? (
                <a
                  href={r.certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-xs hover:underline"
                >
                  abrir
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              ),
          },
          {
            key: "result",
            header: "Resultado",
            render: (r) => (
              <StatusBadge>{r.points?.length ? evaluateRecord(r) : r.result}</StatusBadge>
            ),
          },
        ]}
      />
    </>
  );
}
