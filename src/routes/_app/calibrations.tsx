import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { calibrations, equipments } from "@/lib/mock-data";
import { CalendarDays, Calculator, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calibrations")({ component: CalPage });

// Tabela mock de limites máximos de erro por equipamento (configurável no cadastro do equipamento).
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

function CalibrationCalculator() {
  const [equipCode, setEquipCode] = useState("BAL-001");
  const [errorMeasured, setErrorMeasured] = useState<string>("");
  const [uncertainty, setUncertainty] = useState<string>("");

  const limit = LIMITS[equipCode] ?? { maxError: 1, unit: "—" };
  const equip = equipments.find((e) => e.code === equipCode);

  const result = useMemo(() => {
    const err = parseFloat(errorMeasured);
    const unc = parseFloat(uncertainty);
    if (Number.isNaN(err) || Number.isNaN(unc)) return null;
    const total = Math.abs(err) + Math.abs(unc);
    const approved = total <= limit.maxError;
    return { total, approved };
  }, [errorMeasured, uncertainty, limit.maxError]);

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Registro de calibração — aprovação automática</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Insira erro medido e incerteza. O sistema avalia <span className="font-mono">|erro| + incerteza ≤ limite máximo</span> e
        retorna <span className="font-medium">APROVADO</span> ou <span className="font-medium">REPROVADO</span> em tempo real.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
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
          <div className="text-[11px] text-muted-foreground">{equip?.location} · {equip?.responsible}</div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Erro medido ({limit.unit})</Label>
          <Input
            type="number" step="0.0001" inputMode="decimal"
            value={errorMeasured}
            onChange={(e) => setErrorMeasured(e.target.value)}
            placeholder="ex: 0,0008"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Incerteza ({limit.unit})</Label>
          <Input
            type="number" step="0.0001" inputMode="decimal"
            value={uncertainty}
            onChange={(e) => setUncertainty(e.target.value)}
            placeholder="ex: 0,0002"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Limite máximo configurado</Label>
          <div className="h-9 rounded-md border border-dashed border-border bg-muted/40 px-3 flex items-center text-sm font-mono">
            ± {limit.maxError} {limit.unit}
          </div>
        </div>
        <Button
          disabled={!result}
          onClick={() => result && toast[result.approved ? "success" : "error"](
            `Calibração ${result.approved ? "APROVADA" : "REPROVADA"}`,
            { description: `Equipamento ${equipCode} · |erro|+u = ${result.total.toFixed(4)} ${limit.unit}` },
          )}
        >
          Salvar registro
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="text-xs text-muted-foreground">Resultado em tempo real:</div>
        {!result && <span className="text-xs text-muted-foreground italic">aguardando dados…</span>}
        {result && (
          <>
            <div className="text-xs font-mono text-muted-foreground">
              |{parseFloat(errorMeasured)}| + {parseFloat(uncertainty)} = <span className="font-semibold text-foreground">{result.total.toFixed(4)}</span> {limit.unit}
              <span className="mx-2">vs.</span>
              limite ± {limit.maxError} {limit.unit}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border-2 transition-colors",
                result.approved
                  ? "bg-success/15 text-success border-success"
                  : "bg-destructive/15 text-destructive border-destructive",
              )}
            >
              {result.approved ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
              {result.approved ? "APROVADO" : "REPROVADO"}
            </span>
          </>
        )}
      </div>
    </section>
  );
}

function CalPage() {
  const upcoming = [...calibrations]
    .filter(c => c.status !== "Vencida" && c.status !== "Reprovada")
    .sort((a, b) => a.validity.localeCompare(b.validity))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Calibrações" description="Cronograma, certificados, rastreabilidade metrológica e validade" />

      <CalibrationCalculator />

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CalendarDays className="size-4" /> Próximas calibrações</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {upcoming.map(c => (
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
