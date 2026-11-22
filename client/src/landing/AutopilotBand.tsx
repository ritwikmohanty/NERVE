import { Check } from "lucide-react";
import { PER_PIPELINE } from "./data";
import { display } from "./ui";

const TRIGGERS = [
  { label: "New project launches", why: "Facades and windows get locked within months" },
  { label: "Hotel signings", why: "Every category is specified at once" },
  { label: "Office and retail fit-outs", why: "Lighting, hardware and doors are being bought" },
  { label: "Developer land deals and funding", why: "Towers and villas follow" },
  { label: "Awards and design features", why: "Recognised studios win the next commissions" },
  { label: "New studios", why: "No supplier habits yet" },
];

const FIRMS: Array<{ name: string; event: string; score: number; full?: boolean }> = [
  { name: "Saltpan Hospitality Studio", event: "Appointed for a 160-key resort in Alibaug", score: 95, full: true },
  { name: "Saffron Edge Developers", event: "Launches a villa project in Jubilee Hills", score: 94, full: true },
  { name: "Vastu Verde Developers", event: "Launches Verde Heights in Baner", score: 94, full: true },
  { name: "Studio Anvaya", event: "Designs a corporate HQ in New Town", score: 84 },
  { name: "Atelier Nirvaan", event: "Restores a haveli as a heritage hotel", score: 84 },
  { name: "Arcadia Fitouts", event: "Delivers a flagship store on MG Road", score: 81 },
  { name: "Granite Peak Estates", event: "Raises funds for luxury floors", score: 77 },
];

export function AutopilotBand() {
  return (
    <section id="autopilot" className="scroll-mt-20 bg-[#FFDA5C] border-y-[3px] border-black px-4 sm:px-8 py-16 sm:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-end">
          <h2 className={`${display} text-[clamp(1.9rem,4.4vw,3.4rem)] font-[900] leading-[1] tracking-[-0.025em]`}>
            You don't have to bring the firm names. Autopilot finds them in the news.
          </h2>
          <p className="text-[1.05rem] leading-[1.6] font-medium max-w-[56ch]">
            Pick the events that matter and the cities you sell in. On demand or on a daily schedule, Autopilot searches recent news, keeps only firms named in the article, ranks them for free, and runs the full ten-agent pipeline on the best few.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[1fr_1.25fr_0.9fr] gap-5">
          <Panel title="1. Watch for these events">
            <ul className="space-y-2">
              {TRIGGERS.map((t) => (
                <li key={t.label} className="flex gap-2.5">
                  <span className="mt-0.5 size-5 shrink-0 grid place-items-center bg-black rounded-[4px]">
                    <Check className="size-3.5 text-[#FFDA5C]" strokeWidth={3.5} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-extrabold leading-tight">{t.label}</span>
                    <span className="block text-[12.5px] font-medium text-black/65">{t.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* The first seven firms of the demo's sample run, with their real triage scores */}
          <Panel title="2. Rank every firm found">
            <ol className="space-y-1.5">
              {FIRMS.map((f, i) => (
                <li key={f.name}>
                  {i === 3 && (
                    <div className="my-2.5 flex items-center gap-2 text-[11.5px] font-black">
                      <span className="h-[3px] flex-1 bg-black" style={{ backgroundImage: "repeating-linear-gradient(90deg,#000 0 8px,transparent 8px 14px)", backgroundColor: "transparent" }} />
                      Full pipeline above this line
                      <span className="h-[3px] flex-1" style={{ backgroundImage: "repeating-linear-gradient(90deg,#000 0 8px,transparent 8px 14px)" }} />
                    </div>
                  )}
                  <div className={`flex items-center gap-3 border-2 border-black rounded-[6px] px-2.5 py-2 ${f.full ? "bg-white" : "bg-white/55"}`}>
                    <span className="w-8 text-[15px] font-black tabular-nums">{f.score}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-extrabold truncate">{f.name}</span>
                      <span className="block text-[12px] font-medium text-black/60 truncate">{f.event}</span>
                    </span>
                    <span className={`ml-auto shrink-0 text-[11px] font-black px-1.5 py-0.5 border-2 border-black rounded-[3px] ${f.full ? "bg-[#599D77] text-white" : "bg-[#FFF5CC]"}`}>
                      {f.full ? "Running" : "Shortlisted"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] font-semibold text-black/60">Fictional firms from the demo's sample run. A live run shows the source article for each.</p>
          </Panel>

          <Panel title="3. Spend only where it counts">
            <p className="text-[14px] leading-[1.55] font-medium">
              Finding and ranking firms is cheap. A full pipeline is not: about {PER_PIPELINE.searches} web searches and {PER_PIPELINE.aiCalls} AI calls per firm.
            </p>
            <div className="mt-4 space-y-3">
              <Meter label="Top 3 firms" searches={10} calls={25} max={88} />
              <Meter label="All 12 firms" searches={28} calls={88} max={88} faded />
            </div>
            <p className="mt-4 text-[13.5px] leading-[1.55] font-semibold border-t-2 border-black pt-3">
              The rest wait on a shortlist. Run any of them with one click, and a shared daily budget stops every run before it overspends.
            </p>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-[3px] border-black rounded-[10px] bg-[#F9F5F2] shadow-[6px_6px_0_0_#000] p-5">
      <h3 className="text-[15px] font-black mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Meter({ label, searches, calls, max, faded }: { label: string; searches: number; calls: number; max: number; faded?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px] font-bold">
        <span>{label}</span>
        <span className="tabular-nums">{searches} searches, {calls} AI calls</span>
      </div>
      <div className="mt-1 h-4 border-2 border-black rounded-[4px] bg-white overflow-hidden">
        <div className={`h-full ${faded ? "bg-[#EA435F]" : "bg-black"}`} style={{ width: `${(calls / max) * 100}%` }} />
      </div>
    </div>
  );
}
