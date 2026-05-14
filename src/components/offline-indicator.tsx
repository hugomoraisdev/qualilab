import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { countOutbox, flushOutbox, subscribe } from "@/lib/offline-outbox";
import { toast } from "sonner";

export function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const refresh = () => countOutbox().then(setPending).catch(() => {});
    refresh();
    const unsub = subscribe(refresh);
    const goOnline = async () => {
      setOnline(true);
      setSyncing(true);
      const { sent } = await flushOutbox();
      setSyncing(false);
      await refresh();
      if (sent > 0) {
        toast.success(`Sincronizado: ${sent} ${sent === 1 ? "registro enviado" : "registros enviados"}.`);
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
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [qc]);

  if (online && pending === 0) return null;

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
                const { sent } = await flushOutbox();
                setSyncing(false);
                if (sent > 0) {
                  toast.success(`${sent} ${sent === 1 ? "registro enviado" : "registros enviados"}.`);
                  qc.invalidateQueries();
                }
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
