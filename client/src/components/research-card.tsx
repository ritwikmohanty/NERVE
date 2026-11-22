import { ExternalLink, Search, ShieldCheck, UserX, FlaskConical } from "lucide-react";
import type { FirmResearch } from "@/lib/types";

/** Phase 1: what live research found about a real firm — every line traceable to a source. */
export function ResearchCard({ research, contactUnknown, projectAssumed }: { research: FirmResearch; contactUnknown?: boolean; projectAssumed?: boolean }) {
  const found = research.status === "found" || research.status === "partial";
  return (
    <div className="border-2 border-black bg-white shadow-[2px_2px_0_0_#000]" data-tour="research-card">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b-2 border-black bg-[#CEEBFC]">
        <Search className="size-4" />
        <span className="text-xs font-black uppercase">Live research</span>
        <span className="text-[10px] font-bold">via {research.providers.join(" + ") || "-"} · read-only, nothing sent</span>
        <span className={`ml-auto text-[9px] font-black uppercase border-2 border-black px-1.5 py-0.5 ${found ? "bg-[#599D77] text-white" : "bg-secondary"}`}>
          {research.status === "found" ? "Profile found" : research.status === "partial" ? "Partial profile" : research.status === "not_found" ? "Nothing found" : "Unavailable"}
        </span>
      </div>
      <div className="p-4 space-y-3 text-[12px]">
        {research.summary ? <p className="font-semibold leading-relaxed">{research.summary}</p> : <p className="font-semibold text-muted-foreground">No public profile found for “{research.query}”. Outreach will stay generic and nothing is invented.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {research.website && (
            <p><span className="text-[10px] font-black uppercase text-muted-foreground block">Website</span><a className="font-bold underline break-all" href={research.website} target="_blank" rel="noreferrer">{research.domain}</a></p>
          )}
          {research.founded && <p><span className="text-[10px] font-black uppercase text-muted-foreground block">Founded</span><span className="font-bold">{research.founded}</span></p>}
          {research.principals.length > 0 && (
            <p><span className="text-[10px] font-black uppercase text-muted-foreground block">Principals (public sources)</span><span className="font-bold">{research.principals.map((p) => `${p.name}${p.title ? `, ${p.title}` : ""}`).join(", ")}</span></p>
          )}
          {research.notableProjects.length > 0 && (
            <p><span className="text-[10px] font-black uppercase text-muted-foreground block">Public projects</span><span className="font-bold">{research.notableProjects.join(" · ")}</span></p>
          )}
        </div>
        <div className="space-y-1.5">
          {contactUnknown && (
            <p className="text-[11px] font-bold flex items-start gap-1.5"><UserX className="size-3.5 shrink-0 mt-0.5" /> No named contact found publicly, so drafts address the studio. Add the principal's name and number in New Mission to personalise.</p>
          )}
          <p className="text-[11px] font-bold flex items-start gap-1.5"><ShieldCheck className="size-3.5 shrink-0 mt-0.5" /> Emails and phone numbers are never guessed for real people. They're used only if you enter them.</p>
          {projectAssumed && (
            <p className="text-[11px] font-bold flex items-start gap-1.5"><FlaskConical className="size-3.5 shrink-0 mt-0.5" /> No project details given. Type and stage are planning assumptions, and the drafts don't mention a specific project.</p>
          )}
          {research.apollo.status === "unavailable" && research.apollo.note && (
            <p className="text-[10px] font-semibold text-muted-foreground">Apollo: {research.apollo.note}</p>
          )}
        </div>
        {research.sources.length > 0 && (
          <details className="border-t-2 border-black pt-2">
            <summary className="text-[11px] font-black uppercase cursor-pointer">Sources ({research.sources.length})</summary>
            <ul className="mt-1.5 space-y-1">
              {research.sources.map((s) => (
                <li key={s.url} className="text-[11px] flex items-start gap-1.5">
                  <ExternalLink className="size-3 shrink-0 mt-0.5" />
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline break-all">{s.title}</a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

export function SampleDataNote() {
  return (
    <div className="border-2 border-dashed border-black bg-white px-3 py-2 text-[11px] font-bold flex items-center gap-2" data-tour="research-card">
      <FlaskConical className="size-4" /> Fictional demo profile: this firm, its contacts and its project are sample data. Launch a mission with a real firm name to see live research.
    </div>
  );
}
