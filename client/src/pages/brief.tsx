import { BookOpen, ExternalLink, Loader2, Quote, Building2, Target } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** The exact knowledge the agents draft from — every figure traceable to AllHome's own material. */
export default function BriefPage() {
  const { catalog } = useAuth();
  if (!catalog) return <div className="h-full flex items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>;
  const a = catalog.allhome;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-3"><BookOpen className="size-8" /> AllHome Brief</h1>
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">The knowledge every agent drafts from — drafts may only use facts on this page</p>
        </div>

        <section className="border-2 border-black bg-[#1A1A18] text-white p-5 shadow-[4px_4px_0_0_#000] space-y-3" data-tour="brief-company">
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Company</p>
          <p className="text-lg font-black leading-snug">{a.positioning}</p>
          <p className="text-sm text-white/80">{a.model}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {a.facts.map((f) => <div key={f} className="border border-white/25 px-3 py-2 text-[12px] font-bold">{f}</div>)}
          </div>
          <div className="grid md:grid-cols-2 gap-4 pt-2 text-[12px]">
            <div>
              <p className="text-[10px] font-black uppercase text-secondary mb-1">Founders & funding</p>
              <p className="text-white/85">{a.founders}. {a.funding}.</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-secondary mb-1">Headquarters</p>
              <p className="text-white/85">{a.hq} · {a.email}</p>
            </div>
          </div>
          <p className="flex items-start gap-2 text-[12px] border-l-4 border-secondary pl-3 italic text-white/90"><Quote className="size-4 shrink-0" /> {a.insight}</p>
        </section>

        <section className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]" data-tour="brief-pain">
          <p className="text-xs font-black uppercase flex items-center gap-2 mb-3"><Target className="size-4" /> The specifier problem NERVE is built around</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {a.painPoints.map((p) => <div key={p} className="border-2 border-black bg-accent px-3 py-2 text-[12px] font-bold">{p}</div>)}
          </div>
          <p className="text-[12px] font-semibold text-muted-foreground mt-3">Every draft connects one recipient-specific detail to one concrete brand capability below, with exactly one ask — usually a visit to the nearest experience centre.</p>
        </section>

        <div className="grid lg:grid-cols-2 gap-4" data-tour="brief-brands">
          {catalog.brands.map((b) => (
            <article key={b.id} className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-black" style={{ background: `${b.color}22` }}>
                <span className="size-3 rounded-full border border-black" style={{ background: b.color }} />
                <h2 className="font-black">{b.name}{b.formalName ? <span className="font-bold text-muted-foreground"> · {b.formalName}</span> : null}</h2>
                <span className="ml-auto text-[10px] font-black uppercase">{catalog.categories[b.category]}</span>
              </div>
              <div className="p-4 space-y-3 text-[12px] flex-1">
                <p className="font-semibold">{b.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {b.facts.map((f) => <span key={f} className="text-[10px] font-black border-2 border-black px-1.5 py-0.5 bg-secondary">{f}</span>)}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Product systems</p>
                  <p className="font-semibold">{b.productLines.join(" · ")}</p>
                </div>
                {b.services.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Services</p>
                    <p className="font-semibold">{b.services.join(" · ")}</p>
                  </div>
                )}
                {b.partners.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">International brands carried</p>
                    <p className="font-semibold">{b.partners.join(" · ")}</p>
                  </div>
                )}
                <div className="border-l-4 border-black pl-2 bg-accent py-1.5">
                  <p className="text-[10px] font-black uppercase">How drafts describe it</p>
                  <p className="font-semibold">{b.pitch}</p>
                </div>
                <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5"><Building2 className="size-3.5" /> Founders: {b.founders} · Typically specified at: {b.specifyAt.map((s) => catalog.stages.find((x) => x.id === s)?.label).join(", ")}</p>
              </div>
              <div className="px-4 py-2 border-t-2 border-black flex gap-3 text-[11px] font-black">
                <a href={b.website} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">allhome.in <ExternalLink className="size-3" /></a>
                {b.externalSite && <a href={b.externalSite} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">Brand site <ExternalLink className="size-3" /></a>}
              </div>
            </article>
          ))}
        </div>

        <section className="border-2 border-black bg-white p-4 text-[11px] font-semibold space-y-1" data-tour="brief-sources">
          <p className="text-xs font-black uppercase">Sources</p>
          <p>Figures, product systems, partners and founders are taken from AllHome's website and its 2026 brochure. Specification stages and lead times are NERVE's planning estimates and are labelled as such in every spec sheet.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {Object.entries(catalog.sources).map(([k, url]) => (
              <a key={k} href={url} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">{k} <ExternalLink className="size-3" /></a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
