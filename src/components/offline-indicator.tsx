import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { countOutbox, flushOutbox, subscribe } from "@/lib/offline-outbox";
import { occurrencesStore } from "@/lib/occurrences-store";
import { calibrationsStore } from "@/lib/calibrations-store";
import { auditsStore, auditFindingsStore } from "@/lib/audits-store";
import { toast } from "sonner";

const offlineStores = [occurrencesStore, calibrationsStore, auditsStore, auditFindingsStore];

export function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const refresh = async () => {
      const fromOutbox = await countOutbox().catch(() => 0);
      const fromStores = offlineStores.reduce((acc, s) => acc + s.pendingCount(), 0);
      setPending(fromOutbox + fromStores);
    };
    void refresh();
    // Drena fila residual do localStorage na montagem inicial (itens presos de sessões anteriores)
    if (navigator.onLine) {
      void Promise.all(offlineStores.map((s) => s.flushQueue())).then(() => flushOutbox()).then(() => refresh());
    }
    const unsub = subscribe(() => { void refresh(); });
    const storeHandlers = offlineStores.map((s) => {
      const h = () => { void refresh(); };
      window.addEventListener(`storage:${s.table}`, h);
      return () => window.removeEventListener(`storage:${s.table}`, h);
    });
    const goOnline = async () => {
      setOnline(true);
      setSyncing(true);
      await Promise.all(offlineStores.map((s) => s.flushQueue()));
      const { sent } = await flushOutbox();
      setSyncing(false);
      await refresh();
      if (sent > 0 || offlineStores.some((s) => s.pendingCount() === 0)) {
        toast.success("Alterações sincronizadas com sucesso.");
        qc.invalidateQueries();
      }
    };
    const goOffline = () => {
      setOnline(false);
      toast.warning("Você está offline. As alterações serão enviadas ao reconectar.");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsub();
      storeHandlers.forEach((off) => off());
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [qc]);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm shadow-lg backdrop-blur ${
          !online
            ? "bg-amber-500/95 text-white"
            : syncing
            ? "bg-blue-500/95 text-white"
            : "bg-slate-900/95 text-white"
        }`}
        role="status"
        aria-live="polite"
      >
        {!online ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline{pending > 0 ? ` · ${pending} pendente${pending > 1 ? "s" : ""}` : ""}</span>
          </>
        ) : syncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sincronizando…</span>
          </>
        ) : (
          <>
            <CloudUpload className="h-4 w-4" />
            <span>{pending} registro{pending > 1 ? "s" : ""} aguardando envio</span>
            <button
              type="button"
              onClick={async () => {
                setSyncing(true);
                await Promise.all(offlineStores.map((s) => s.flushQueue()));
                const { sent } = await flushOutbox();
                setSyncing(false);
                toast.success(sent > 0 ? `${sent} registro(s) enviado(s).` : "Sincronização concluída.");
                qc.invalidateQueries();
              }}
              className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30"
            >
              Enviar agora
            </button>
            <Wifi className="h-4 w-4 opacity-70" />
          </>
        )}
      </div>
    </div>
  );
}
