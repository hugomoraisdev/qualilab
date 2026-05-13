import { Bell, Gauge, ListChecks, GraduationCap, Users2, FileText, Truck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type NotificationItem, type NotificationCategory } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  calibration: Gauge,
  action: ListChecks,
  competency: GraduationCap,
  meeting: Users2,
  document: FileText,
  supplier: Truck,
};

const LEVEL_DOT = {
  danger: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
} as const;

export function NotificationBell() {
  const items = useNotifications();
  const danger = items.filter((i) => i.level === "danger").length;
  const warning = items.filter((i) => i.level === "warning").length;
  const total = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Notificações"
          aria-label={`${total} notificações`}
        >
          <Bell className="size-5" />
          {total > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold grid place-items-center text-white",
                danger > 0 ? "bg-destructive" : warning > 0 ? "bg-warning" : "bg-info"
              )}
            >
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b border-border">
          <div className="text-sm font-semibold">Central de notificações</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {danger > 0 && <span className="text-destructive font-medium">{danger} vencido(s)</span>}
            {danger > 0 && warning > 0 && " · "}
            {warning > 0 && <span className="text-warning font-medium">{warning} próximo(s)</span>}
            {total === 0 && "Nenhum alerta no momento"}
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {total === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Tudo em dia. As notificações aparecem quando há prazos próximos ou vencidos.
            </div>
          )}
          {items.slice(0, 30).map((it) => (
            <NotifRow key={it.id} item={it} />
          ))}
        </div>
        {total > 30 && (
          <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
            Mostrando 30 de {total}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotifRow({ item }: { item: NotificationItem }) {
  const Icon = ICONS[item.category];
  return (
    <Link
      to={item.href}
      className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 border-b border-border/60 last:border-b-0"
    >
      <div className={cn("mt-1 size-2 rounded-full shrink-0", LEVEL_DOT[item.level])} />
      <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{item.title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{item.date}</div>
      </div>
    </Link>
  );
}
