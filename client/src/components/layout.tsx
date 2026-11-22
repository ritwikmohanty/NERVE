import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { NerveLogo } from "@/components/brand/logo";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, UserPlus, Activity, Calendar, Settings, MapPin, BarChart3, LogOut, HelpCircle, Menu, X, BookOpen, Radar,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Tour, startTour } from "@/components/tour";
import { PAGE_TOURS, tourIdForPath } from "@/components/tour-steps";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Command Center", accent: "bg-primary", tour: "nav-home" },
  { to: "/dashboard/new", icon: UserPlus, label: "New Mission", accent: "bg-[#CEEBFC]", tour: "nav-new" },
  { to: "/dashboard/autopilot", icon: Radar, label: "Autopilot", accent: "bg-[#FFDA5C]", tour: "nav-autopilot" },
  { to: "/dashboard/centres", icon: MapPin, label: "Experience Centres", accent: "bg-[#CEEBFC]", tour: "nav-centres" },
  { to: "/dashboard/brief", icon: BookOpen, label: "AllHome Brief", accent: "bg-accent", tour: "nav-brief" },
  { to: "/dashboard/calendar", icon: Calendar, label: "Calendar", accent: "bg-[#FFDA5C]", tour: "nav-calendar" },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", accent: "bg-secondary", tour: "nav-analytics" },
  { to: "/dashboard/activity", icon: Activity, label: "Live Activity", accent: "bg-secondary", tour: "nav-activity" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings", accent: "bg-muted", tour: "nav-settings" },
] as const;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, logout } = useAuth();
  const [health, setHealth] = useState<{ simulationMode?: boolean; liveResearch?: boolean; sendingLocked?: boolean } | null>(null);
  const [online, setOnline] = useState(true);
  // Drawer is "open for this path" — navigating anywhere closes it without an effect
  const [openAt, setOpenAt] = useState<string | null>(null);
  const mobileOpen = openAt === location.pathname;
  const setMobileOpen = (open: boolean) => setOpenAt(open ? location.pathname : null);

  useEffect(() => {
    const check = async () => {
      try {
        setHealth((await api.health()) as typeof health);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };
    void check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const tourId = tourIdForPath(location.pathname);
  const isActive = (to: string) => (to === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(to));

  const sidebar = (
    <>
      <Link to="/dashboard" className="p-5 pb-4 block border-b-2 border-black hover:bg-secondary transition-colors">
        <NerveLogo size={40} sub="AllHome edition" />
      </Link>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, accent, tour }) => {
          const active = isActive(to);
          return (
            <NavLink key={to} to={to} end={to === "/dashboard"} className="block" data-tour={tour}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 border-2 ${active ? `${accent} border-black shadow-[3px_3px_0_0_#000]` : "border-transparent hover:border-black hover:shadow-[2px_2px_0_0_#000] hover:bg-muted/30"}`}>
                <div className={`size-7 rounded-md border-2 flex items-center justify-center shrink-0 ${active ? "border-black bg-white" : "border-transparent"}`}>
                  <Icon className="size-4" />
                </div>
                <span className={`font-bold text-sm ${active ? "text-black" : "text-black/70"}`}>{label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 space-y-2 border-t-2 border-black">
        {/* Status: plain information, not controls. Connection only shows when it's broken. */}
        <dl aria-label="Workspace status" className="px-1 pt-0.5 space-y-1.5">
          {!online && <StatusLine dot="bg-[#EA435F]" label="Server unreachable" note="retrying" title="NERVE can't reach the API. It retries every few seconds." />}
          <StatusLine
            dot={health?.liveResearch ? "bg-[#0EA5E9]" : "bg-black/25"}
            label={health?.liveResearch ? "Research live" : "Sample research"}
            note={health?.liveResearch ? "read-only" : "fictional firms"}
            title={health?.liveResearch ? "Real firms are researched with web and news search. This only reads information; nothing is sent." : "Live research is off, so missions use fictional sample firms."}
          />
          <StatusLine
            dot={health?.sendingLocked ? "bg-[#FFDA5C]" : "bg-[#599D77]"}
            label={health?.sendingLocked ? "Sending off" : "Sending on"}
            note={health?.sendingLocked ? "nothing leaves" : "live channels"}
            title={health?.sendingLocked ? "Messages are drafted and tracked but never sent from this deployment." : "Messages go out on the connected WhatsApp, email and LinkedIn accounts."}
          />
        </dl>
        <button onClick={startTour} data-tour="help" title="Show the guide for this page" className="w-full h-9 px-2.5 border-2 border-black rounded-md flex items-center justify-center gap-1.5 bg-white hover:bg-secondary text-[12px] font-black">
          <HelpCircle className="size-4" /> Guide for this page
        </button>
        {session && (
          <div className="border-2 border-black rounded-md p-2.5 bg-white">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md border-2 border-black bg-[#CEEBFC] flex items-center justify-center text-xs font-black">{session.user.name.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black truncate">{session.user.name}</p>
                <p className="text-[10px] font-semibold text-muted-foreground truncate">{session.org.name}{session.org.isDemo ? " · demo" : ""}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                title="Sign out"
                className="size-7 border-2 border-black rounded flex items-center justify-center hover:bg-primary hover:text-white"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          </div>
        )}
        <p className="text-[9px] leading-tight text-muted-foreground font-semibold px-0.5">Prototype built for AllHome. Not an official AllHome product. Demo prospects are fictional.</p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r-2 border-black bg-white flex-col">{sidebar}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 w-72 z-50 bg-white border-r-2 border-black flex flex-col md:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "tween", duration: 0.2 }}>
              <button className="absolute top-3 right-3 size-8 border-2 border-black flex items-center justify-center bg-white" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden h-12 shrink-0 border-b-2 border-black bg-white flex items-center px-3 gap-3">
          <button onClick={() => setMobileOpen(true)} className="size-8 border-2 border-black flex items-center justify-center" aria-label="Open menu">
            <Menu className="size-4" />
          </button>
          <NerveLogo size={28} sub={null} />
          <button onClick={startTour} className="ml-auto h-8 px-2 border-2 border-black flex items-center gap-1 text-[11px] font-black uppercase" aria-label="Show the guide for this page">
            <HelpCircle className="size-4" /> Guide
          </button>
        </div>
        <main className="flex-1 overflow-hidden relative bg-background">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Page-specific guide: auto-opens on first visit to each page; "?" replays it */}
      <Tour
        key={tourId}
        tourId={tourId}
        steps={PAGE_TOURS[tourId]}
        force={tourId === "dashboard" && params.get("tour") === "1"}
      />
    </div>
  );
}

/** One line of the sidebar status readout: a coloured dot, a label and a short note. */
function StatusLine({ dot, label, note, title }: { dot: string; label: string; note: string; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] leading-none" title={title}>
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full border-[1.5px] border-black ${dot}`} />
      <dt className="font-extrabold">{label}</dt>
      <dd className="ml-auto text-[11px] font-semibold text-black/50">{note}</dd>
    </div>
  );
}
