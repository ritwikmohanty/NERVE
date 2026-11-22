import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Loader2, CalendarCheck, Send, ExternalLink, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CentreWithStats, Visit } from "@/lib/types";

export default function CentresPage() {
  const { catalog } = useAuth();
  const [centres, setCentres] = useState<CentreWithStats[] | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [city, setCity] = useState("all");
  const [brand, setBrand] = useState("all");

  async function load() {
    const [c, v] = await Promise.all([api.centres(), api.visits()]);
    setCentres(c.centres);
    setVisits(v.visits);
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.centres(), api.visits()])
      .then(([c, v]) => {
        if (cancelled) return;
        setCentres(c.centres);
        setVisits(v.visits);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => Array.from(new Set((centres || []).map((c) => c.city))).sort(), [centres]);
  const shown = (centres || []).filter((c) => (city === "all" || c.city === city) && (brand === "all" || c.brandId === brand));
  const upcoming = visits.filter((v) => v.status === "scheduled").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const color = (id: string) => catalog?.brands.find((b) => b.id === id)?.color || "#000";

  async function setVisit(id: string, status: Visit["status"]) {
    await api.updateVisit(id, status);
    await load();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Experience Centres</h1>
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Every outreach ends with an invite to see the finishes. NERVE routes each lead to the nearest centre</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" data-tour="centres-filters">
              <select value={city} onChange={(e) => setCity(e.target.value)} className="h-9 border-2 border-black bg-white px-2 text-xs font-black uppercase">
                <option value="all">All cities</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-9 border-2 border-black bg-white px-2 text-xs font-black uppercase">
                <option value="all">All brands</option>
                {catalog?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <span className="text-xs font-black self-center">{shown.length} locations</span>
            </div>

            {!centres ? (
              <div className="py-16 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3" data-tour="centres-grid">
                {shown.map((c) => (
                  <div key={c.id} className="border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full border border-black" style={{ background: color(c.brandId) }} />
                      <span className="font-black text-sm">{c.brandName}</span>
                      <span className={`ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 border-2 border-black ${c.kind === "dealer" ? "bg-muted" : "bg-secondary"}`}>{c.kind === "dealer" ? "Dealer" : "Experience centre"}</span>
                    </div>
                    <p className="text-xs font-black flex items-center gap-1"><MapPin className="size-3" /> {c.city}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">{c.address}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-black border-2 border-black px-1.5 py-0.5 flex items-center gap-1"><Send className="size-3" /> {c.invited} invited</span>
                      <span className={`text-[10px] font-black border-2 border-black px-1.5 py-0.5 flex items-center gap-1 ${c.visits ? "bg-[#599D77] text-white" : ""}`}><CalendarCheck className="size-3" /> {c.visits} visit{c.visits === 1 ? "" : "s"}</span>
                      <a href={c.mapUrl} target="_blank" rel="noreferrer" className="ml-auto text-[10px] font-black underline flex items-center gap-1">Map <ExternalLink className="size-3" /></a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] space-y-3 lg:sticky lg:top-4" data-tour="centres-visits">
            <p className="text-xs font-black uppercase flex items-center gap-2"><CalendarCheck className="size-4" /> Upcoming visits ({upcoming.length})</p>
            {upcoming.length === 0 && <p className="text-xs font-semibold text-muted-foreground">No visits yet. They're booked automatically when a lead asks to see products in person.</p>}
            {upcoming.map((v) => (
              <div key={v.id} className="border-2 border-black p-2.5 bg-[#CEEBFC] space-y-1">
                <Link to={`/dashboard/pipeline/${v.leadId}`} className="text-xs font-black underline">{v.contactName} · {v.companyName}</Link>
                <p className="text-[11px] font-bold">{v.brandName}, {v.centreCity}</p>
                <p className="text-[11px] font-semibold">{new Date(v.scheduledAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST</p>
                <div className="flex gap-1.5 pt-1">
                  <button onClick={() => setVisit(v.id!, "completed")} className="text-[10px] font-black uppercase border-2 border-black bg-[#599D77] text-white px-2 py-0.5 flex items-center gap-1"><Check className="size-3" /> Done</button>
                  <button onClick={() => setVisit(v.id!, "no_show")} className="text-[10px] font-black uppercase border-2 border-black bg-white px-2 py-0.5 flex items-center gap-1"><X className="size-3" /> No-show</button>
                </div>
              </div>
            ))}
            {visits.filter((v) => v.status !== "scheduled").length > 0 && (
              <p className="text-[10px] font-bold text-muted-foreground">{visits.filter((v) => v.status === "completed").length} completed · {visits.filter((v) => v.status === "no_show").length} no-show</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
