import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "muted";

const STATUS_LABELS: Record<string, string> = {
  em_cotacao: "Em cotação",
  em_andamento: "Em andamento",
  em_revisao: "Em revisão",
  em_analise: "Em análise",
  em_tratamento: "Em tratamento",
  em_treinamento: "Em treinamento",
  em_manutencao: "Em manutenção",
  em_avaliacao: "Em avaliação",
  aprovado_restricao: "Aprovado com restrição",
  proxima_vencimento: "Próxima do vencimento",
  nao_critico: "Não crítico",
  concluida: "Concluída",
  concluido: "Concluído",
  solicitado: "Solicitado",
  planejada: "Planejada",
  agendada: "Agendada",
  identificado: "Identificado",
  pendente: "Pendente",
  cancelado: "Cancelado",
  cancelada: "Cancelada",
  rascunho: "Rascunho",
  obsoleto: "Obsoleto",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  reprovada: "Reprovada",
  ativo: "Ativo",
  inativo: "Inativo",
  suspenso: "Suspenso",
  vencido: "Vencido",
  vencida: "Vencida",
  vigente: "Vigente",
  manutencao: "Manutenção",
  monitorado: "Monitorado",
  recebido: "Recebido",
  inspecionado: "Inspecionado",
  aberta: "Aberta",
  critico: "Crítico",
  estrategico: "Estratégico",
  operacional: "Operacional",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

function formatStatus(raw: string): string {
  if (STATUS_LABELS[raw]) return STATUS_LABELS[raw];
  return raw.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

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
  const label = children ? formatStatus(children) : "—";
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
