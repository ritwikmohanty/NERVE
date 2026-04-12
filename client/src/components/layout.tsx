import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UserPlus,
  Activity,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Overview", description: "Pipeline overview" },
  { to: "/new", icon: UserPlus, label: "New Lead", description: "Launch pipeline" },
  { to: "/activity", icon: Activity, label: "Activity", description: "System logs" },
] as const;

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Overview";
  if (pathname.startsWith("/new")) return "New Lead";
  if (pathname.startsWith("/pipeline")) return "Pipeline";
  if (pathname.startsWith("/activity")) return "Activity";
  if (pathname.startsWith("/settings")) return "Settings";
  return "NERVE";
}

export default function Layout() {
  const location = useLocation();
  const [health, setHealth] = useState<{
    connectedClients?: number;
    simulationMode?: boolean;
  } | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await api.health();
        setHealth(h as typeof health);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="border-b border-sidebar-border px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            NERVE Engine
          </p>
          <h1 className="mt-1 text-lg font-semibold">Outreach Control</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, icon: Icon, label, description }) => {
            const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{description}</p>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">API Status</span>
            <Badge variant={online ? "default" : "secondary"} className="h-6 rounded-sm px-2 text-[11px]">
              {online ? (
                <span className="flex items-center gap-1">
                  <Wifi className="size-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="size-3" /> Offline
                </span>
              )}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Simulation: {health?.simulationMode ? "Enabled" : "Disabled"}</p>
            <p>SSE Streams: {health?.connectedClients ?? 0}</p>
          </div>

          <NavLink
            to="/settings"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-3.5" /> Settings
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
          <div>
            <p className="text-sm font-semibold">{pageTitle}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Autonomous outreach workspace</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-sm px-2 text-[11px]">
              {health?.simulationMode ? "Simulation" : "Live"}
            </Badge>
            <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
              {health?.connectedClients ?? 0} streams
            </Badge>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
