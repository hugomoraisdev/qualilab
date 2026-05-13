import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/auth";
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 sm:px-6">
          <button
            className="md:hidden rounded-md p-2 hover:bg-accent text-muted-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Buscar em todo o sistema..." className="pl-9 h-9 bg-background" />
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
