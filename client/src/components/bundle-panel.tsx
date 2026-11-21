import { motion } from "framer-motion";
import { Layers, MapPin, Clock, ArrowRight, CalendarClock } from "lucide-react";
import type { BrandBundle, Brand, RadarEntry } from "@/lib/types";

const ROLE_LABEL: Record<string, { label: string; cls: string }> = {
  primary: { label: "Specify now", cls: "bg-[#599D77] text-white" },
  next_stage: { label: "Next stage", cls: "bg-secondary text-black" },
  add_on: { label: "Add-on", cls: "bg-muted text-black" },
};

function brandColor(brands: Brand[] | undefined, id: string) {
  return brands?.find((b) => b.id === id)?.color || "#000";
}

/** F1 — One-Collective Brand Bundle */
export function BundlePanel({ bundle, brands, compact = false }: { bundle: BrandBundle; brands?: Brand[]; compact?: boolean }) {
  return (
    <div className="space-y-3" data-tour="bundle">
      <div className="flex items-start gap-3">
        <div className="size-9 shrink-0 border-2 border-black bg-secondary flex items-center justify-center shadow-[2px_2px_0_0_#000]">
          <Layers className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">One-Collective Brand Bundle</p>
          <p className="text-sm font-black leading-snug">{bundle.headline}</p>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
            {bundle.vendorsReplaced} categories → one AllHome relationship (one palette, one schedule, one point of after-sales)
          </p>
        </div>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {bundle.items.map((item, i) => {
          const role = ROLE_LABEL[item.role];
          return (
            <motion.div
              key={item.brandId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_#000]"
            >
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full border border-black" style={{ background: brandColor(brands, item.brandId) }} />
                <span className="font-black text-sm">{item.brandName}</span>
                <span className={`ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 border-2 border-black ${role.cls}`}>{role.label}</span>
              </div>
              <p className="text-[11px] font-semibold mt-1.5">{item.productLines.join(" · ")}</p>
              {!compact && <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{item.reason}</p>}
              {item.centre && (
                <p className="text-[10px] font-bold mt-1.5 flex items-center gap-1">
                  <MapPin className="size-3" /> {item.centre.centre.city}
                  {item.centre.sameCity ? " · same city" : item.centre.distanceKm > 0 ? ` · ~${item.centre.distanceKm} km` : ""}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** F2 — Specification-Window Radar */
export function StageRadar({ radar, brands }: { radar: RadarEntry[]; brands?: Brand[] }) {
  const maxWeeks = Math.max(12, ...radar.filter((r) => r.status === "upcoming").map((r) => r.weeksUntil));
  return (
    <div className="space-y-3" data-tour="radar">
      <div className="flex items-start gap-3">
        <div className="size-9 shrink-0 border-2 border-black bg-[#CEEBFC] flex items-center justify-center shadow-[2px_2px_0_0_#000]">
          <CalendarClock className="size-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Specification-Window Radar</p>
          <p className="text-sm font-black">When each brand gets specified on this project</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {radar.map((r) => {
          const pct = r.status === "now" ? 100 : r.status === "upcoming" ? Math.max(8, 100 - (r.weeksUntil / maxWeeks) * 100) : 4;
          return (
            <div key={r.brandId} className="grid grid-cols-[110px_1fr_92px] sm:grid-cols-[150px_1fr_120px] items-center gap-2">
              <span className="text-[11px] font-black truncate flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-black shrink-0" style={{ background: brandColor(brands, r.brandId) }} />
                {r.brandName}
              </span>
              <div className="h-4 border-2 border-black bg-muted relative overflow-hidden">
                <motion.div
                  className={`h-full ${r.status === "now" ? "bg-[#599D77]" : r.status === "upcoming" ? "bg-secondary" : "bg-black/20"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
              <span className={`text-[10px] font-black uppercase text-right ${r.status === "passed" ? "text-muted-foreground" : ""}`}>
                {r.status === "now" ? "Open now" : r.status === "upcoming" ? `in ~${r.weeksUntil} wks` : "Passed"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] font-bold text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2.5 bg-[#599D77] border border-black" /> Window open</span>
        <span className="flex items-center gap-1"><span className="size-2.5 bg-secondary border border-black" /> Upcoming — pre-specify</span>
        <span className="flex items-center gap-1"><Clock className="size-3" /> Order-by dates in the spec sheet</span>
        <span className="flex items-center gap-1"><ArrowRight className="size-3" /> Touch 3 is timed to the next window</span>
      </div>
    </div>
  );
}
