import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Play, Download, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/poc/varredura")({ component: Varredura });

type Status = "pending" | "running" | "ok" | "fail" | "warn";

interface RouteCheck {
  path: string;
  label: string;
  group: string;
  status: Status;
  message?: string;
  durationMs?: number;
}

const ROUTES: Omit<RouteCheck, "status">[] = [
  // Núcleo
  { path: "/dashboard",        label: "Dashboard",                group: "Núcleo" },
  { path: "/indicators",       label: "Indicadores",              group: "Núcleo" },
  { path: "/reports",          label: "Relatórios",               group: "Núcleo" },
  { path: "/audit-log",        label: "Log de Auditoria",         group: "Núcleo" },
  { path: "/settings",         label: "Configurações",            group: "Núcleo" },
  { path: "/users",            label: "Usuários",                 group: "Núcleo" },

  // Documental
  { path: "/documents",        label: "Documentos (lista)",       group: "Documental" },
  { path: "/documents/DOC-001",label: "Documento DOC-001",        group: "Documental" },

  // Equipamentos / Calibrações
  { path: "/equipments",       label: "Equipamentos (lista)",     group: "Equipamentos" },
  { path: "/equipments/EQ-001",label: "Equipamento EQ-001",       group: "Equipamentos" },
  { path: "/calibrations",     label: "Calibrações",              group: "Equipamentos" },

  // Pessoas / Fornecedores
  { path: "/competencies",     label: "Competências",             group: "Pessoas" },
  { path: "/suppliers",        label: "Fornecedores (lista)",     group: "Fornecedores" },
  { path: "/purchases",        label: "Compras",                  group: "Fornecedores" },

  // Qualidade
  { path: "/occurrences",      label: "Ocorrências (lista)",      group: "Qualidade" },
  { path: "/action-plans",     label: "Planos de Ação",           group: "Qualidade" },
  { path: "/audits",           label: "Auditorias (lista)",       group: "Qualidade" },
  { path: "/risks",            label: "Riscos (lista)",           group: "Qualidade" },
  { path: "/process-map",      label: "Mapa de Processos",        group: "Qualidade" },

  // Reuniões / Formulários
  { path: "/meetings",         label: "Reuniões (lista)",         group: "Gestão" },
  { path: "/meetings/new",     label: "Nova reunião",             group: "Gestão" },
  { path: "/forms",            label: "Formulários (lista)",      group: "Gestão" },
  { path: "/forms/new",        label: "Novo formulário",          group: "Gestão" },
  { path: "/projects",         label: "Projetos",                 group: "Gestão" },

  // SAC
  { path: "/customer-service",     label: "SAC (lista)",          group: "SAC" },
  { path: "/customer-service/new", label: "Novo chamado SAC",     group: "SAC" },

  // POC
  { path: "/poc",              label: "POC — visão geral",        group: "POC" },
  { path: "/poc/roteiro",      label: "POC — roteiro",            group: "POC" },
  { path: "/poc-checklist",    label: "POC — checklist do edital",group: "POC" },
  { path: "/data-migration",   label: "Migração de dados",        group: "POC" },
];

function Varredura() {
  const [checks, setChecks] = useState<RouteCheck[]>(
    ROUTES.map((r) => ({ ...r, status: "pending" as Status })),
  );
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const summary = {
    total: checks.length,
    ok: checks.filter((c) => c.status === "ok").length,
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
    pending: checks.filter((c) => c.status === "pending" || c.status === "running").length,
  };

  function update(i: number, patch: Partial<RouteCheck>) {
    setChecks((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function runOne(i: number): Promise<void> {
    return new Promise((resolve) => {
      const iframe = iframeRef.current;
      if (!iframe) return resolve();
      const start = performance.now();
      let done = false;

      const finish = (status: Status, message?: string) => {
        if (done) return;
        done = true;
        update(i, { status, message, durationMs: Math.round(performance.now() - start) });
        iframe.onload = null;
        resolve();
      };

      const timeout = window.setTimeout(() => finish("warn", "Tempo limite (8s)"), 8000);

      iframe.onload = () => {
        window.clearTimeout(timeout);
        try {
          const doc = iframe.contentDocument;
          if (!doc) return finish("warn", "Sem acesso ao documento");
          const text = doc.body?.innerText || "";
          const hasErrorBoundary =
            /Algo deu errado|Something went wrong|Application Error|Unexpected Application Error/i.test(text);
          const hasReactRoot = !!doc.querySelector("main, [role='main'], #root, body > div");
          if (hasErrorBoundary) return finish("fail", "Boundary de erro detectado");
          if (!hasReactRoot || text.trim().length < 10) return finish("warn", "Conteúdo mínimo não detectado");
          finish("ok");
        } catch {
          finish("warn", "Acesso cross-origin bloqueado");
        }
      };

      update(i, { status: "running" });
      iframe.src = checks[i].path + "?__scan=1";
    });
  }

  async function runAll() {
    setRunning(true);
    for (let i = 0; i < checks.length; i++) {
      setCurrentIdx(i);
      // eslint-disable-next-line no-await-in-loop
      await runOne(i);
    }
    setCurrentIdx(-1);
    setRunning(false);
  }

  function exportReport() {
    const now = new Date().toLocaleString("pt-BR");
    const lines = [
      "RELATÓRIO DE VARREDURA — QualiLab POC",
      `Gerado em: ${now}`,
      "",
      `Total de telas: ${summary.total}`,
      `OK: ${summary.ok}   Falhas: ${summary.fail}   Avisos: ${summary.warn}`,
      "",
      "Detalhe por rota:",
      "------------------------------------------------------------",
      ...checks.map(
        (c) =>
          `[${c.status.toUpperCase().padEnd(7)}] ${c.path.padEnd(32)} ${c.label}${
            c.message ? `  — ${c.message}` : ""
          }${c.durationMs ? `  (${c.durationMs}ms)` : ""}`,
      ),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `varredura-poc-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Agrupa
  const groups = Array.from(new Set(checks.map((c) => c.group)));

  useEffect(() => {
    // hide iframe content from layout
  }, []);

  return (
    <>
      <PageHeader
        title="Varredura automática de telas"
        description="Carrega cada rota do sistema em segundo plano e valida se a tela renderiza sem erro"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={runAll} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Executando..." : "Iniciar varredura"}
            </Button>
            <Button size="sm" variant="outline" onClick={exportReport} disabled={running}>
              <Download className="size-4" /> Exportar relatório
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total" value={summary.total} />
        <Stat label="OK"     value={summary.ok}   tone="success" />
        <Stat label="Falhas" value={summary.fail} tone="danger" />
        <Stat label="Avisos" value={summary.warn} tone="warn" />
      </div>

      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g} className="bg-card border border-border rounded-lg shadow-sm">
            <header className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">{g}</h3>
              <span className="text-xs text-muted-foreground">
                {checks.filter((c) => c.group === g && c.status === "ok").length}/
                {checks.filter((c) => c.group === g).length} OK
              </span>
            </header>
            <ul className="divide-y divide-border">
              {checks
                .map((c, i) => ({ c, i }))
                .filter(({ c }) => c.group === g)
                .map(({ c, i }) => (
                  <li
                    key={c.path}
                    className={`px-4 py-2.5 flex items-center gap-3 text-sm ${
                      currentIdx === i ? "bg-primary/5" : ""
                    }`}
                  >
                    <StatusIcon status={c.status} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.label}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{c.path}</div>
                    </div>
                    {c.message && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">{c.message}</span>
                    )}
                    {c.durationMs !== undefined && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">{c.durationMs}ms</span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {/* iframe oculto usado para carregar cada rota */}
      <iframe
        ref={iframeRef}
        title="scanner"
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: -10000,
          width: 1024,
          height: 768,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "warn" }) {
  const cls =
    tone === "success" ? "text-success" :
    tone === "danger"  ? "text-destructive" :
    tone === "warn"    ? "text-warning" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok")      return <CheckCircle2 className="size-4 text-success" />;
  if (status === "fail")    return <XCircle className="size-4 text-destructive" />;
  if (status === "warn")    return <AlertTriangle className="size-4 text-warning" />;
  if (status === "running") return <Loader2 className="size-4 animate-spin text-primary" />;
  return <span className="size-4 rounded-full border border-border inline-block" />;
}
