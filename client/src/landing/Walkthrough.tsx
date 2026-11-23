import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Check, FileText, MapPin, MessageCircle, Mail } from "lucide-react";
import { RULE, Section, SectionHead, Swatch, TrafficLights } from "./ui";

/** One demo mission (Studio Kaarva Architects), exactly as the seeded pipeline produces it. */
const STEPS: Array<{ title: string; line: string; agents: string; panel: () => ReactNode }> = [
  {
    title: "Research the firm",
    line: "Who they are, who decides, and what they're building.",
    agents: "Agent 1",
    panel: () => (
      <div className="space-y-4">
        <Row k="Firm" v="Studio Kaarva Architects, Mumbai" />
        <Row k="Decision maker" v="Ishita Khanna, Founding Partner" />
        <Row k="Project" v="Kaarva Villa, Alibaug" />
        <Row k="Stage and value" v="Structure, about ₹14 Cr" />
        <p className="text-[13px] leading-[1.55] font-semibold border-2 border-black rounded-[8px] bg-[#CEEBFC] p-3">
          For a real firm, this card is built from live web and news search. Every line links to its source, and emails or phone numbers are never guessed.
        </p>
      </div>
    ),
  },
  {
    title: "Read the signals and score intent",
    line: "Recent launches, awards and hiring, weighed into one score.",
    agents: "Agents 2, 3 and 4",
    panel: () => (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Signal strength="High" title="Studio Kaarva Architects unveils Kaarva Villa" />
          <Signal strength="Medium" title="Latest project featured in a design publication" />
          <Signal strength="High" title="Team visited the Design POV exhibition" />
        </div>
        <div className="flex items-end gap-4">
          <p className="text-[44px] font-black leading-none tabular-nums">81</p>
          <p className="pb-1 text-[13px] font-bold">out of 100. Warm: worth engaging now.</p>
        </div>
        <div className="space-y-1.5">
          <Bar label="Specifier influence" v={93} />
          <Bar label="Project value" v={78} />
          <Bar label="Stage fit" v={71} />
          <Bar label="Signal strength" v={70} />
        </div>
        <p className="text-[13px] font-semibold">Persona: design-led architect. Tone: insight-led, about the project and its materials.</p>
      </div>
    ),
  },
  {
    title: "Pick the brands and the timing",
    line: "Which brands are specified now, which come next, and where to invite them.",
    agents: "Agent 5",
    panel: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Window color="#0EA5E9" name="The Window Factory" when="Window open now" on />
          <Window color="#6B7280" name="Metalia" when="Window open now" on />
          <Window color="#14B8A6" name="House of W" when="Next: MEP & services" />
          <Window color="#F59E0B" name="Ledlum" when="Next: MEP & services" />
        </div>
        <ol className="space-y-1.5 text-[13.5px] font-semibold">
          <li className="flex gap-2"><MessageCircle className="size-4 shrink-0 mt-0.5" /> Touch 1 on WhatsApp, today</li>
          <li className="flex gap-2"><Mail className="size-4 shrink-0 mt-0.5" /> Touch 2 by email, three days later, with a spec sheet</li>
          <li className="flex gap-2"><MessageCircle className="size-4 shrink-0 mt-0.5" /> Touch 3 just before MEP, when House of W is specified</li>
        </ol>
        <p className="flex gap-2 text-[13.5px] font-bold border-2 border-black rounded-[8px] bg-white p-3">
          <MapPin className="size-4 shrink-0 mt-0.5" /> Invite: the Window Factory experience centre, Mulund West, Mumbai
        </p>
      </div>
    ),
  },
  {
    title: "Write the messages",
    line: "Three touches and a spec sheet, using only verified brand facts.",
    agents: "Agents 6 and 7",
    panel: () => (
      <div className="space-y-3">
        <Msg channel="WhatsApp, touch 1" text="Hi Ishita, this is the specification team at AllHome. Congratulations on Kaarva Villa in Alibaug. With the structure going up, this is when The Window Factory and Metalia are usually specified. The Window Factory has delivered 1,000+ projects across 30+ cities." />
        <Msg channel="Email, touch 2" text="Following up on my note about Kaarva Villa in Alibaug. I've put together a one-page specification sheet for it, covering the recommended Window Factory and Metalia systems with lead times and order-by dates." />
        <p className="flex items-center gap-2 text-[13px] font-bold">
          <FileText className="size-4" /> Spec sheet attached. Every reason behind each choice is written out in plain English.
        </p>
      </div>
    ),
  },
  {
    title: "Book the visit",
    line: "Read the reply, book the centre, hand the lead to sales.",
    agents: "Agents 8 and 9",
    panel: () => (
      <div className="space-y-3">
        <div className="border-2 border-black rounded-[10px] rounded-tr-[2px] bg-white p-3 ml-8">
          <p className="text-[11.5px] font-extrabold text-black/55">Ishita replied</p>
          <p className="mt-1 text-[14px] leading-[1.5]">Lovely timing. Can we visit your experience centre next week to see the facade panels and window samples in person?</p>
        </div>
        <p className="flex items-center gap-2 text-[13.5px] font-bold">
          <Check className="size-4 text-[#599D77]" strokeWidth={3} /> Classified positive: wants to see the products
        </p>
        <p className="flex gap-2 text-[13.5px] font-bold border-2 border-black rounded-[8px] bg-[#E7F6EC] p-3">
          <CalendarCheck className="size-4 shrink-0 mt-0.5" /> Visit booked at the Window Factory centre, Mumbai, Tuesday 11:00 am
        </p>
        <p className="text-[13px] font-semibold">The lead goes to the Mumbai sales team in Zoho CRM with the full context: project, stage, score, bundle and visit.</p>
      </div>
    ),
  },
  {
    title: "Learn from the outcome",
    line: "Every reply adjusts how the next lead is scored.",
    agents: "Agent 10",
    panel: () => (
      <div className="space-y-3">
        <Weight label="Project value" delta="+0.015" up />
        <Weight label="Specifier influence" delta="+0.009" up />
        <Weight label="Stage fit" delta="+0.009" up />
        <Weight label="Signal strength" delta="−0.013" />
        <p className="text-[13.5px] font-semibold border-2 border-black rounded-[8px] bg-white p-3">
          The Window Factory, Metalia, House of W and Ledlum converted for an architect at the structure stage, so that bundle is favoured for similar projects.
        </p>
      </div>
    ),
  },
];

export function Walkthrough() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const step = STEPS[active];
  return (
    <Section id="how" inner="py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 dots-fine fade-top opacity-80" />
      <SectionHead className="relative" title="One mission, from a firm name to a booked visit." lead="Here's how NERVE handles all three, for one demo firm: Studio Kaarva Architects. Ten agents run in sequence on every lead. Step through what they produced." />
      <div className="relative mt-12 grid lg:grid-cols-[320px_1fr] gap-8 lg:gap-12 items-stretch">
        <ol role="tablist" aria-label="Pipeline steps" className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible -mx-5 px-5 lg:mx-0 lg:px-0 pt-1 pb-3 lg:pb-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="shrink-0 lg:shrink">
              <button
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`group w-[240px] lg:w-full text-left rounded-[10px] border-2 border-black px-4 py-3.5 transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25 ${
                  i === active ? "bg-[#FFDA5C] shadow-[4px_4px_0_0_#000] -translate-x-[2px] -translate-y-[2px]" : "bg-white hover:bg-[#FFF5CC] hover:shadow-[2px_2px_0_0_#000]"
                }`}
              >
                <span className="flex items-start gap-3">
                  <span className={`-mt-0.5 size-[28px] shrink-0 grid place-items-center rounded-full border-2 border-black text-[12px] font-bold tabular-nums ${i === active ? "bg-black text-white" : i < active ? "bg-black text-white" : "bg-white text-black"}`}>{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold leading-tight">{s.title}</span>
                    {i === active && <span className="block mt-1.5 text-[13px] leading-snug text-black/65">{s.line}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-col border-2 border-black rounded-[14px] bg-white shadow-[6px_6px_0_0_#000] overflow-hidden">
          <div className={`flex items-center gap-2 px-5 h-12 border-b ${RULE} bg-[#F9F5F2]`}>
            <TrafficLights />
            <span className="ml-2 text-[13.5px] font-bold">Studio Kaarva Architects</span>
            <span className="ml-auto text-[12.5px] font-semibold text-black/50">{step.agents}</span>
          </div>
          <div className="flex-1 p-6 sm:p-8 min-h-[380px] flex flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={active} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {step.panel()}
              </motion.div>
            </AnimatePresence>
            <div aria-hidden className="flex-1 min-h-6" />
            <div className={`pt-5 flex items-center gap-3 border-t ${RULE} text-[13px] font-semibold`}>
              <button type="button" disabled={active === 0} onClick={() => setActive((a) => a - 1)} className="rounded-[6px] px-2 py-1 text-black/60 hover:text-black disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                Previous
              </button>
              <span className="whitespace-nowrap text-black/40 tabular-nums">{active + 1} of {STEPS.length}</span>
              <button type="button" disabled={active === STEPS.length - 1} onClick={() => setActive((a) => a + 1)} className="ml-auto rounded-[6px] border border-black/20 bg-white px-3 py-1.5 hover:border-black disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                {active < STEPS.length - 1 ? (
                  <>
                    <span className="sm:hidden">Next</span>
                    <span className="hidden sm:inline">Next: {STEPS[active + 1].title}</span>
                  </>
                ) : (
                  "Done"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b-2 border-black/10 pb-2 text-[14px]">
      <span className="font-semibold text-black/60">{k}</span>
      <span className="font-extrabold">{v}</span>
    </div>
  );
}

function Signal({ strength, title }: { strength: "High" | "Medium"; title: string }) {
  return (
    <div className="flex items-center gap-2 border-2 border-black rounded-[8px] bg-white px-2.5 py-2 text-[13px]">
      <span className={`text-[11px] font-black px-1.5 py-0.5 border border-black rounded-[3px] ${strength === "High" ? "bg-[#EA435F] text-white" : "bg-[#FFDA5C]"}`}>{strength}</span>
      <span className="font-semibold truncate">{title}</span>
    </div>
  );
}

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="grid grid-cols-[140px_1fr_32px] items-center gap-2 text-[12.5px] font-bold">
      <span>{label}</span>
      <span className="h-3 border-2 border-black bg-white rounded-[3px] overflow-hidden">
        <span className="block h-full bg-[#599D77]" style={{ width: `${v}%` }} />
      </span>
      <span className="tabular-nums text-right">{v}</span>
    </div>
  );
}

function Window({ color, name, when, on }: { color: string; name: string; when: string; on?: boolean }) {
  return (
    <div className={`border-2 rounded-[6px] p-2.5 ${on ? "border-black bg-white border-black/60" : "border-black/40 bg-white/60"}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-black"><Swatch color={color} /> {name}</p>
      <p className={`mt-1 text-[12px] font-bold ${on ? "text-[#2F7A50]" : "text-black/55"}`}>{when}</p>
    </div>
  );
}

function Msg({ channel, text }: { channel: string; text: string }) {
  return (
    <div className="border-2 border-black rounded-[10px] rounded-tl-[2px] bg-white p-3">
      <p className="text-[11.5px] font-extrabold text-black/55">{channel}</p>
      <p className="mt-1 text-[13.5px] leading-[1.5]">{text}</p>
    </div>
  );
}

function Weight({ label, delta, up }: { label: string; delta: string; up?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-2 border-black rounded-[8px] bg-white px-3 py-2 text-[14px]">
      <span className="font-bold">{label}</span>
      <span className={`ml-auto font-black tabular-nums ${up ? "text-[#2F7A50]" : "text-[#C8263E]"}`}>{delta}</span>
    </div>
  );
}
