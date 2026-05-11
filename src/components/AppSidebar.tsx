import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, ClipboardCheck, AlertTriangle, ShieldAlert, ListChecks,
  Wrench, Gauge, Truck, ShoppingCart, GraduationCap, Users2, Workflow, FormInput,
  BarChart3, Settings, Users, History, Rocket, FlaskConical, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const groups: { label: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Visão Geral",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/poc", label: "Ambiente POC", icon: Rocket },
    ],
  },
  {
    label: "Qualidade",
    items: [
      { to: "/documents", label: "Documentos", icon: FileText },
      { to: "/audits", label: "Auditorias", icon: ClipboardCheck },
      { to: "/occurrences", label: "Ocorrências / NC", icon: AlertTriangle },
      { to: "/risks", label: "Riscos", icon: ShieldAlert },
      { to: "/action-plans", label: "Planos de Ação", icon: ListChecks },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/equipments", label: "Equipamentos", icon: Wrench },
      { to: "/calibrations", label: "Calibrações", icon: Gauge },
      { to: "/suppliers", label: "Fornecedores", icon: Truck },
      { to: "/purchases", label: "Processos de Compra", icon: ShoppingCart },
      { to: "/competencies", label: "Competências", icon: GraduationCap },
      { to: "/meetings", label: "Reuniões", icon: Users2 },
      { to: "/process-map", label: "Mapa de Processos", icon: Workflow },
      { to: "/forms", label: "Formulários", icon: FormInput },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/reports", label: "Relatórios", icon: BarChart3 },
      { to: "/settings", label: "Configurações", icon: Settings },
      { to: "/users", label: "Usuários e Permissões", icon: Users },
      { to: "/audit-log", label: "Log de Auditoria", icon: History },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2">
        <img src={logo} alt="QualiLab" className="size-9 rounded-lg object-contain bg-white/5 p-1" />
        <div>
          <div className="text-sm font-semibold leading-tight">QualiLab</div>
          <div className="text-[11px] text-sidebar-foreground/60">SaaS · ISO/IEC 17025</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">{g.label}</div>
            <ul className="mt-1 space-y-0.5">
              {g.items.map((it) => {
                const active = path === it.to || path.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
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
            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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
  );
}
