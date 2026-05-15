import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "muted";

const POSITIVE = ["aprovado", "ativo", "concluída", "concluído", "competente", "válida", "realizada", "monitorado", "recebido", "inspecionado"];
const WARNING = ["em revisão", "em análise", "em tratamento", "em andamento", "aguardando validação", "pendente", "em treinamento", "em manutenção", "próxima do vencimento", "em avaliação", "em cotação", "agendada", "planejada", "solicitado", "identificado", "aprovado com restrição", "com restrição"];
const DANGER = ["vencido", "vencida", "obsoleto", "atrasado", "reprovado", "reprovada", "crítico", "alta", "suspenso", "inativo", "fora de uso", "cancelada", "cancelado"];
const INFO = ["rascunho", "aberta", "baixa", "média", "médio", "alto"];

function toneFor(label: string): Tone {
  const v = (label ?? "").toLowerCase().trim();
  if (POSITIVE.some((x) => v === x || v.includes(x))) return "success";
  if (DANGER.some((x) => v === x || v.includes(x))) return "destructive";
  if (WARNING.some((x) => v === x || v.includes(x))) return "warning";
  if (INFO.some((x) => v === x || v.includes(x))) return "info";
  return "muted";
}

export function StatusBadge({ children, tone }: { children?: string | null; tone?: Tone }) {
  const label = children ?? "—";
  const t = tone ?? toneFor(label);
  const styles: Record<Tone, string> = {
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/20 text-warning-foreground border-warning/40",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-info/15 text-info border-info/30",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", styles[t])}>
      {label}
    </span>
  );
}
