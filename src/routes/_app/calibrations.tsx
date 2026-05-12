import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { calibrations, equipments } from "@/lib/mock-data";
import { CalendarDays, Calculator, CheckCircle2, XCircle, Plus, Trash2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type CalibrationPoint, type CalibrationRecord,
  evaluatePoint, evaluateRecord, listCalibrations, saveCalibration, newId,
} from "@/lib/calibration-store";
import { useAuth } from "@/lib/auth";

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
  const [equipCode, setEquipCode] = useState("BAL-001");
  const [lab, setLab] = useState("INMETRO");
  const [certificate, setCertificate] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [validity, setValidity] = useState("");
  const [points, setPoints] = useState<CalibrationPoint[]>(() => [
    emptyPoint("BAL-001", 0),
    emptyPoint("BAL-001", 1),
    emptyPoint("BAL-001", 2),
  ]);

  const equip = equipments.find((e) => e.code === equipCode);
  const cfg = LIMITS[equipCode] ?? { maxError: 1, unit: "—" };

  // Atualiza limites/unidade dos pontos quando o equipamento muda
  useEffect(() => {
    setPoints((pts) => pts.map((p) => ({ ...p, maxError: cfg.maxError, unit: cfg.unit })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipCode]);

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

  function handleSave() {
    if (!certificate.trim() || !date || !validity) {
      toast.error("Preencha certificado, data e validade.");
      return;
    }
    if (!points.length) { toast.error("Adicione ao menos um ponto."); return; }
    const rec: CalibrationRecord = {
      id: newId("CAL"),
      equipmentCode: equipCode,
      equipmentName: equip?.name ?? equipCode,
      date, validity, lab, certificate,
      responsible: user?.name ?? "—",
      points,
      createdAt: new Date().toISOString(),
    };
    saveCalibration(rec);
    const status = evaluateRecord(rec);
    toast[status === "Aprovada" ? "success" : "error"](
      `Calibração ${status}`,
      { description: `${rec.id} · ${equipCode} · ${points.length} ponto(s)` },
    );
    setCertificate("");
    onSaved();
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Nova calibração — múltiplos pontos por equipamento</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Adicione quantos pontos forem necessários (ex.: 0%, 50% e 100% da escala). Cada ponto possui valor nominal,
        valor medido, incerteza e resultado individual. O resultado geral é <span className="font-medium">Aprovado</span> apenas
        se <span className="font-medium">todos</span> os pontos forem conformes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs">Equipamento</Label>
          <select
            value={equipCode}
            onChange={(e) => setEquipCode(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {equipments.map((e) => (
              <option key={e.code} value={e.code}>{e.code} — {e.name}</option>
            ))}
          </select>
          <div className="text-[11px] text-muted-foreground">
            {equip?.location} · limite máximo configurado ± {cfg.maxError} {cfg.unit}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Laboratório</Label>
          <Input value={lab} onChange={(e) => setLab(e.target.value)} />
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
          <Input value={certificate} onChange={(e) => setCertificate(e.target.value)} placeholder="ex: CERT-2026-0001" />
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
              <div key={p.id} className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto_auto] gap-2 px-3 py-2 items-center">
                <Input
                  className="h-9"
                  value={p.label}
                  onChange={(e) => updatePoint(p.id, { label: e.target.value })}
                  placeholder={`Ponto ${idx + 1}`}
                />
                <Input className="h-9" type="number" step="0.0001"
                  value={p.nominal}
                  onChange={(e) => updatePoint(p.id, { nominal: parseFloat(e.target.value) || 0 })} />
                <Input className="h-9" type="number" step="0.0001"
                  value={p.measured}
                  onChange={(e) => updatePoint(p.id, { measured: parseFloat(e.target.value) || 0 })} />
                <div className="h-9 rounded-md border border-dashed border-border bg-muted/40 px-3 flex items-center text-xs font-mono">
                  {ev.error.toFixed(4)}
                </div>
                <Input className="h-9" type="number" step="0.0001"
                  value={p.uncertainty}
                  onChange={(e) => updatePoint(p.id, { uncertainty: parseFloat(e.target.value) || 0 })} />
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border",
                  ev.approved ? "bg-success/15 text-success border-success/40" : "bg-destructive/15 text-destructive border-destructive/40"
                )}>
                  {ev.approved ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
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
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum ponto adicionado.</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Resultado geral:{" "}
          {overall ? (
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border-2 ml-1",
              overall.allOk ? "bg-success/15 text-success border-success" : "bg-destructive/15 text-destructive border-destructive",
            )}>
              {overall.allOk ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
              {overall.allOk ? "APROVADA" : "REPROVADA"}
            </span>
          ) : <span className="italic">aguardando pontos</span>}
        </div>
        <Button onClick={handleSave}>Salvar calibração</Button>
      </div>
    </section>
  );
}

function SavedCalibrations() {
  const [items, setItems] = useState<CalibrationRecord[]>([]);
  useEffect(() => {
    const refresh = () => setItems(listCalibrations());
    refresh();
    const handler = () => refresh();
    window.addEventListener(`storage:qualilab_calibrations_v2`, handler);
    return () => window.removeEventListener(`storage:qualilab_calibrations_v2`, handler);
  }, []);

  if (!items.length) return null;
  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
      <h3 className="text-sm font-semibold mb-3">Calibrações registradas nesta sessão (multi-pontos)</h3>
      <div className="space-y-3">
        {items.map((rec) => {
          const status = evaluateRecord(rec);
          return (
            <details key={rec.id} className="border border-border rounded-md">
              <summary className="cursor-pointer px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs">{rec.id}</span>
                  <span className="font-medium">{rec.equipmentCode}</span>
                  <span className="text-muted-foreground text-xs">{rec.points.length} ponto(s) · cert. {rec.certificate}</span>
                </div>
                <StatusBadge>{status}</StatusBadge>
              </summary>
              <div className="px-3 pb-3">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1.5">Ponto</th><th>Nominal</th><th>Medido</th>
                      <th>Erro</th><th>Incerteza</th><th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.points.map((p) => {
                      const ev = evaluatePoint(p);
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="py-1.5">{p.label}</td>
                          <td>{p.nominal} {p.unit}</td>
                          <td>{p.measured} {p.unit}</td>
                          <td className="font-mono">{ev.error.toFixed(4)}</td>
                          <td>{p.uncertainty} {p.unit}</td>
                          <td>
                            <StatusBadge>{ev.approved ? "Conforme" : "Não conforme"}</StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function CalPage() {
  const [refreshTick, setRefreshTick] = useState(0);
  const upcoming = [...calibrations]
    .filter((c) => c.status !== "Vencida" && c.status !== "Reprovada")
    .sort((a, b) => a.validity.localeCompare(b.validity))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Calibrações" description="Cronograma, certificados, rastreabilidade metrológica e múltiplos pontos por equipamento" />

      <MultiPointForm onSaved={() => setRefreshTick((t) => t + 1)} />
      <SavedCalibrations key={refreshTick} />

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CalendarDays className="size-4" /> Próximas calibrações</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {upcoming.map((c) => (
            <div key={c.id} className="border border-border rounded-md p-3 bg-background">
              <div className="text-xs font-mono text-muted-foreground">{c.id}</div>
              <div className="text-sm font-medium truncate">{c.equipment.split(" — ")[0]}</div>
              <div className="text-xs text-muted-foreground mt-1">Vence em {c.validity}</div>
              <div className="mt-1.5"><StatusBadge>{c.status}</StatusBadge></div>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        data={calibrations}
        searchKeys={["id", "equipment", "lab", "certificate", "status", "result"]}
        newLabel="Nova calibração"
        exportName="calibracoes"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "equipment", header: "Equipamento" },
          { key: "date", header: "Data" },
          { key: "validity", header: "Validade" },
          { key: "lab", header: "Laboratório" },
          { key: "certificate", header: "Certificado", render: (r) => <span className="font-mono text-xs">{r.certificate}</span> },
          { key: "uncertainty", header: "Incerteza" },
          { key: "result", header: "Resultado", render: (r) => <StatusBadge>{r.result}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
