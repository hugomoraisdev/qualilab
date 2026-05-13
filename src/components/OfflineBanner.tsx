import { CloudOff, CloudUpload, CheckCircle2 } from "lucide-react";
import { useOfflineStatus, type TableStore } from "@/lib/table-store";

interface Props {
  stores: TableStore<any>[];
  /** Mensagem curta exibida quando online e sem fila. Default: oculta. */
  showWhenIdle?: boolean;
}

/**
 * Mostra status de conectividade e mutações pendentes para os stores informados.
 * Pensado para módulos que precisam funcionar offline (ex: Auditorias em campo).
 */
export function OfflineBanner({ stores, showWhenIdle = false }: Props) {
  const { online, pending } = useOfflineStatus(stores);

  if (online && pending === 0) {
    if (!showWhenIdle) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 mb-3">
        <CheckCircle2 className="size-3.5" /> Sincronizado
      </div>
    );
  }

  if (!online) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <CloudOff className="size-4 shrink-0" />
        <span className="font-medium">Modo offline.</span>
        <span>
          Suas alterações são salvas localmente
          {pending > 0 ? ` (${pending} pendente${pending > 1 ? "s" : ""})` : ""} e serão enviadas
          assim que a conexão voltar.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
      <CloudUpload className="size-4 shrink-0 animate-pulse" />
      <span>Sincronizando {pending} alteraç{pending > 1 ? "ões" : "ão"} pendente{pending > 1 ? "s" : ""}…</span>
    </div>
  );
}
