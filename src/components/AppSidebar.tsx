import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  ShieldAlert,
  ListChecks,
  Wrench,
  Gauge,
  Truck,
  ShoppingCart,
  GraduationCap,
  Users2,
  Workflow,
  FormInput,
  BarChart3,
  Settings,
  Users,
  History,
  Rocket,
  LogOut,
  Headset,
  Target,
  KanbanSquare,
  X,
  CheckSquare,
  DatabaseZap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { useLabUnits } from "@/lib/lab-units-store";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

// Módulos sujeitos a restrição por unidade — devem bater com as chaves de
// `lab-units.tsx`. Itens fora desta lista são sempre exibidos (dashboards,
// POC, configurações, etc.).
const RESTRICTABLE = new Set([
  "documents",
  "occurrences",
  "audits",
  "risks",
  "indicators",
  "calibrations",
  "equipments",
  "suppliers",
  "purchases",
  "competencies",
  "meetings",
  "forms",
  "process-map",
  "reports",
]);
const moduleKeyOf = (to: string) => to.replace(/^\//, "").split("/")[0];

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: string;
};

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Visão Geral",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
      { to: "/poc", label: "Ambiente POC", icon: Rocket, perm: "poc" },
      { to: "/poc-checklist", label: "Checklist Edital", icon: CheckSquare, perm: "poc" },
    ],
  },
  {
    label: "Qualidade",
    items: [
      { to: "/documents", label: "Documentos", icon: FileText, perm: "documents.view" },
      { to: "/audits", label: "Auditorias", icon: ClipboardCheck, perm: "audits" },
      { to: "/occurrences", label: "Ocorrências / NC", icon: AlertTriangle, perm: "occurrences" },
      { to: "/risks", label: "Riscos", icon: ShieldAlert, perm: "risks" },
      { to: "/action-plans", label: "Planos de Ação", icon: ListChecks, perm: "action-plans" },
      { to: "/customer-service", label: "SAC", icon: Headset, perm: "customer-service" },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/equipments", label: "Equipamentos", icon: Wrench, perm: "equipments" },
      { to: "/calibrations", label: "Calibrações", icon: Gauge, perm: "calibrations" },
      { to: "/suppliers", label: "Fornecedores", icon: Truck, perm: "suppliers" },
      { to: "/purchases", label: "Processos de Compra", icon: ShoppingCart, perm: "purchases" },
      { to: "/competencies", label: "Competências", icon: GraduationCap, perm: "competencies" },
      { to: "/meetings", label: "Reuniões", icon: Users2, perm: "meetings" },
      { to: "/process-map", label: "Mapa de Processos", icon: Workflow, perm: "process-map" },
      { to: "/forms", label: "Formulários", icon: FormInput, perm: "forms" },
      { to: "/projects", label: "Projetos", icon: KanbanSquare, perm: "projects" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/reports", label: "Relatórios", icon: BarChart3, perm: "reports" },
      { to: "/indicators", label: "Indicadores", icon: Target, perm: "indicators" },
      { to: "/data-migration", label: "Importação / Migração", icon: DatabaseZap, perm: "all" },
      { to: "/settings", label: "Configurações", icon: Settings, perm: "all" },
      { to: "/users", label: "Usuários e Permissões", icon: Users, perm: "all" },
      { to: "/audit-log", label: "Log de Auditoria", icon: History, perm: "audit-log" },
    ],
  },
];

export function AppSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const { currentUnitId, getAllowedModules } = useLabUnits();

  const allowed = getAllowedModules(currentUnitId);
  const isAdmin = user?.role === "admin";
  const passesUnit = (to: string) => {
    if (isAdmin || allowed.length === 0) return true;
    const key = moduleKeyOf(to);
    return !RESTRICTABLE.has(key) || allowed.includes(key);
  };

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => hasPermission(user?.role, it.perm) && passesUnit(it.to)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "fixed inset-y-0 left-0 z-50 transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5">
          <img
            src={logo}
            alt="QualiLab"
            className="size-10 rounded-lg object-contain bg-white p-1 ring-1 ring-white/10"
          />
          <div className="flex-1">
            <div className="text-base font-semibold leading-tight tracking-tight">QualiLab</div>
            <div className="text-[11px] text-sidebar-foreground/60">Gestão da Qualidade</div>
          </div>
          <button
            className="md:hidden rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {visibleGroups.map((g) => (
            <div key={g.label}>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                {g.label}
              </div>
              <ul className="mt-1 space-y-0.5">
                {g.items.map((it) => {
                  const active = path === it.to || path.startsWith(it.to + "/");
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <it.icon className="size-4 shrink-0" />
                        <span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="size-9 rounded-full bg-sidebar-primary/20 grid place-items-center text-sm font-semibold">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-sidebar-foreground/60 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="rounded-md p-2 hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
