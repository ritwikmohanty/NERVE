import { Check } from "lucide-react";
import { PER_PIPELINE } from "./data";
import { ScrollWords, Section, headline } from "./ui";

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
  const full = FIRMS.filter((f) => f.full);
  const rest = FIRMS.filter((f) => !f.full);
  return (
    <Section id="autopilot" inner="py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[20px] bg-[#FFDA5C] border-2 border-black p-4 sm:p-10 lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 dots fade-corner opacity-45" />
        <div className="relative grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-14 items-end">
          <h2 className={`${headline} text-[clamp(1.9rem,3.4vw,2.9rem)] font-[650] leading-[1.06] tracking-[-0.03em] text-balance`}>
            <ScrollWords text="You don't have to bring the firm names. Autopilot finds them in the news." dim={0.22} />
          </h2>
          <p className="text-[1.03rem] leading-[1.65] text-black/75 max-w-[50ch] text-pretty">
            Pick the events that matter and the cities you sell in. On demand or on a daily schedule, Autopilot searches recent news, keeps only firms named in the article, ranks them for free and runs the full pipeline on the best few.
          </p>
        </div>

        {/* One connected card. Row 1: what to watch. Row 2: the ranked firms beside what it costs. */}
        <div className="relative mt-10 rounded-[16px] bg-white border-2 border-black shadow-[6px_6px_0_0_#000] overflow-hidden">
          <div className="p-4 sm:p-7 border-b-2 border-black min-w-0">
            <StepTitle step="1" title="Watch for these events" />
            <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {TRIGGERS.map((t) => (
                <li key={t.label} className="flex gap-3">
                  <span className="mt-[3px] size-4 shrink-0 grid place-items-center rounded-[4px] bg-black">
                    <Check className="size-2.5 text-[#FFDA5C]" strokeWidth={4} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold leading-snug">{t.label}</span>
                    <span className="block mt-0.5 text-[12.5px] leading-snug text-black/50">{t.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
            <div className="p-4 sm:p-7">
              <StepTitle step="2" title="Rank every firm it finds" />
              <ol className="mt-5 space-y-2">
                {full.map((f) => (
                  <FirmRow key={f.name} firm={f} />
                ))}
              </ol>
              <div className="my-3 flex items-center gap-3 text-[11.5px] font-semibold text-black/50">
                <span className="flex-1 border-t-2 border-dashed border-black/50" />
                Full pipeline above, shortlist below
                <span className="flex-1 border-t-2 border-dashed border-black/50" />
              </div>
              <ol className="space-y-2">
                {rest.map((f) => (
                  <FirmRow key={f.name} firm={f} />
                ))}
              </ol>
              <p className="mt-4 text-[12px] leading-snug text-black/45">Fictional firms from the demo&apos;s sample run, with their real scores. A live run links each one to its article.</p>
            </div>

            <div className="p-4 sm:p-7 border-t-2 lg:border-t-0 lg:border-l-2 border-black flex flex-col">
              <StepTitle step="3" title="Spend only where it counts" />
              <dl className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ["12", "found"],
                  ["3", "full runs"],
                  ["9", "shortlisted"],
                ].map(([n, l]) => (
                  <div key={l} className="min-w-0 flex flex-col-reverse rounded-[8px] border-2 border-black bg-[#F9F5F2] px-3 py-3">
                    <dt className="mt-1.5 text-[12px] leading-tight text-black/55 whitespace-nowrap">{l}</dt>
                    <dd className="text-[24px] font-bold tabular-nums leading-none">{n}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[13.5px] leading-[1.6] text-black/65">
                Finding and ranking firms is cheap. A full pipeline costs about {PER_PIPELINE.searches} web searches and {PER_PIPELINE.aiCalls} AI calls per firm.
              </p>
              <div className="mt-5 space-y-4">
                <Meter label="Top 3 firms" searches={10} calls={25} max={88} />
                <Meter label="All 12 firms" searches={28} calls={88} max={88} faded />
              </div>
              <p className="mt-auto pt-6">
                <span className="block rounded-[8px] border-2 border-black bg-[#FFF5CC] px-3.5 py-3 text-[13px] leading-[1.55] shadow-[3px_3px_0_0_#000]">
                  The other 9 wait on a shortlist, one click away. A shared daily budget stops any run before it overspends.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function StepTitle({ step, title }: { step: string; title: string }) {
  return (
    <p className="flex items-center gap-2.5">
      <span className="size-6 grid place-items-center rounded-full bg-black text-[11.5px] font-bold text-[#FFDA5C] tabular-nums">{step}</span>
      <span className="text-[15px] font-bold">{title}</span>
    </p>
  );
}

function FirmRow({ firm }: { firm: (typeof FIRMS)[number] }) {
  return (
    <li className={`flex items-center gap-3 rounded-[8px] border-2 px-3 ${firm.full ? "py-2.5 border-black bg-white" : "py-2 border-black/25 bg-[#F9F5F2]"}`}>
      <span className={`w-7 text-[15px] font-bold tabular-nums ${firm.full ? "" : "text-black/35"}`}>{firm.score}</span>
      <span className="min-w-0 flex-1">
        <span className={`text-[13.5px] font-semibold leading-snug ${firm.full ? "block" : "block sm:inline text-black/55"}`}>{firm.name}</span>
        <span className={`text-[12.5px] leading-snug text-black/45 ${firm.full ? "block" : "block sm:inline sm:ml-2"}`}>{firm.event}</span>
      </span>
      <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${firm.full ? "bg-[#599D77] text-white border-2 border-black" : "border-2 border-black/25 bg-white text-black/55"}`}>
        {firm.full ? "Full pipeline" : "Shortlisted"}
      </span>
    </li>
  );
}

function Meter({ label, searches, calls, max, faded }: { label: string; searches: number; calls: number; max: number; faded?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-black/50">{searches} searches, {calls} AI calls</span>
      </div>
      <div className="mt-1.5 h-3.5 rounded-full border-2 border-black bg-white overflow-hidden">
        <div className={`h-full rounded-full ${faded ? "bg-[#EA435F]" : "bg-black"}`} style={{ width: `${(calls / max) * 100}%` }} />
      </div>
    </div>
  );
}
