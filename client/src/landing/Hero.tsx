import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Lock, Pause, PencilLine, Play } from "lucide-react";
import { BuildingSvg } from "./BuildingSvg";
import { BRANDS, HERO_SCENES, STAGES } from "./data";
import { ButtonLink, DemoButton, RULE, Section, Swatch, TrafficLights, headline } from "./ui";

const HERO_STAGES = STAGES.slice(0, 5);
const STEP_MS = 5200;
const PROOF = ["Facts only from allhome.in", "Real research, with sources", "Nothing is sent from the demo"];

export function Hero() {
  const reduced = useReducedMotion() ?? false;
  const [stage, setStage] = useState(1);
  const [playing, setPlaying] = useState(!reduced);
  const tabsRef = useRef<HTMLDivElement>(null);

  // On narrow screens the stage list scrolls sideways: keep the active stage in view (horizontally only)
  useEffect(() => {
    const list = tabsRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduced ? "auto" : "smooth" });
  }, [stage, reduced]);

  useEffect(() => {
    if (!playing || reduced) return;
    const t = setInterval(() => setStage((s) => (s + 1) % HERO_STAGES.length), STEP_MS);
    return () => clearInterval(t);
  }, [playing, reduced]);

  const scene = HERO_SCENES[stage];
  // The brands this firm's first touch actually features, and its bundle's next-stage brands
  const now = scene.pitch.map((id) => BRANDS.find((b) => b.id === id)!).filter(Boolean);
  const next = scene.next.map((id) => BRANDS.find((b) => b.id === id)!).filter(Boolean);

  return (
    <Section inner="pt-16 sm:pt-24 pb-16 sm:pb-24">
      {/* Texture: a dot grid that fades out from the top centre */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-paper fade-hero" />

      <div className="relative text-center">
        <p className="inline-flex flex-col sm:flex-row items-center gap-2 text-[13px] sm:text-[14px] font-semibold text-black/55">
          <span className="flex -space-x-1" aria-hidden>
            {BRANDS.map((b) => (
              <span key={b.id} className="size-3 rounded-full border border-[#F9F5F2]" style={{ background: b.color }} />
            ))}
          </span>
          Specifier outreach for the AllHome collective
        </p>
        <h1 className={`${headline} mt-6 mx-auto max-w-[15ch] text-[clamp(2.7rem,6.2vw,5.2rem)] font-[650] leading-[0.97] tracking-[-0.045em] text-balance`}>
          Reach the architect before the facade is specified.
        </h1>
        <p className="mt-6 mx-auto max-w-[56ch] text-[1.13rem] leading-[1.6] text-black/65 text-pretty">
          NERVE finds the architects, designers, developers and contractors who are about to choose materials, pitches the AllHome brands their construction stage needs, and books them into the nearest experience centre.
        </p>
        <div className="mt-9 flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
          <DemoButton />
          <ButtonLink href="#how" plain>
            See how it works
          </ButtonLink>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-black/55">
          {PROOF.map((p) => (
            <li key={p} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-[#599D77]" strokeWidth={3} /> {p}
            </li>
          ))}
        </ul>
      </div>

      {/* The product frame, on a stacked sheet */}
      <div className="relative mt-14 sm:mt-16">
        <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] rounded-[16px] border-2 border-black bg-[#FFDA5C] overflow-hidden">
          <div className="absolute inset-0 dots opacity-60" />
        </div>
        <div className="relative border-2 border-black rounded-[16px] bg-white overflow-hidden">
          {/* Window bar */}
          <div className={`flex items-center gap-3 px-4 sm:px-5 min-h-12 py-2 sm:py-0 sm:h-12 border-b ${RULE} bg-[#F9F5F2]`}>
            <TrafficLights />
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={scene.project} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="ml-1 sm:ml-2 min-w-0 text-[13px] sm:text-[13.5px] font-bold leading-snug sm:truncate">
                {scene.project}
                <span className="block sm:inline sm:ml-2 font-medium text-black/50">{scene.firm}</span>
              </motion.p>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause the stage animation" : "Play the stage animation"}
              className="ml-auto size-8 shrink-0 grid place-items-center rounded-[6px] border border-black/20 bg-white hover:border-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[196px_0.92fr_1.18fr] [&>*]:min-w-0">
            {/* Stages */}
            <div ref={tabsRef} role="tablist" aria-label="Construction stage" className={`flex lg:flex-col overflow-x-auto lg:overflow-visible border-b lg:border-b-0 lg:border-r ${RULE} p-2 lg:p-3 gap-1`}>
              <p className="hidden lg:block px-3 pt-1 pb-2 text-[12px] font-semibold text-black/45">Construction stage</p>
              {HERO_STAGES.map((st, i) => (
                <button
                  key={st.id}
                  role="tab"
                  aria-selected={i === stage}
                  onClick={() => {
                    setStage(i);
                    setPlaying(false);
                  }}
                  className={`relative shrink-0 text-left rounded-[8px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                    i === stage ? "bg-black text-white" : i < stage ? "text-black/40 hover:bg-black/[0.04]" : "text-black/75 hover:bg-black/[0.04]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`size-1.5 rounded-full ${i === stage ? "bg-[#FFDA5C]" : i < stage ? "bg-black/30" : "bg-black/15"}`} />
                    {st.label}
                  </span>
                  {i === stage && playing && !reduced && (
                    <motion.span key={`p${stage}`} className="absolute left-3 right-3 bottom-1 h-[2px] origin-left bg-[#FFDA5C]/80 rounded-full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: STEP_MS / 1000, ease: "linear" }} />
                  )}
                </button>
              ))}
            </div>

            {/* Drawing + what to pitch */}
            <div className={`flex flex-col border-b lg:border-b-0 lg:border-r ${RULE}`}>
              <div className="relative flex-1 grid place-items-center px-5 pt-6 pb-3 bg-[#FBF9F7]">
                <div aria-hidden className="absolute inset-0 dots-fine fade-center opacity-70" />
                <div className="relative w-full max-w-[400px]">
                  <BuildingSvg stage={stage} reduced={reduced} />
                </div>
              </div>
              <div className={`px-5 py-4 border-t ${RULE} space-y-3`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[12px] font-semibold text-black/50">Pitch now</span>
                  {now.map((b) => (
                    <span key={b.id} className="flex items-center gap-1.5 rounded-full border border-black bg-white pl-2 pr-2.5 py-[3px] text-[12.5px] font-bold">
                      <Swatch color={b.color} /> {b.name}
                    </span>
                  ))}
                </div>
                {next.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[12px] font-semibold text-black/50">Next stage</span>
                    {next.map((b) => (
                      <span key={b.id} className="flex items-center gap-1.5 rounded-full border border-black/20 pl-2 pr-2.5 py-[3px] text-[12.5px] font-semibold text-black/60">
                        <Swatch color={b.color} /> {b.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* The draft: the highlight */}
            <div className="flex flex-col min-h-[440px]">
              <div className={`flex items-center gap-3 px-4 sm:px-5 min-h-14 py-2.5 sm:py-0 sm:h-14 border-b ${RULE}`}>
                <span className="size-9 shrink-0 grid place-items-center rounded-full bg-[#EA435F] text-white text-[12px] font-bold border border-black">AH</span>
                <div className="min-w-0">
                  <p className="text-[13.5px] sm:text-[14px] font-bold leading-tight sm:truncate">AllHome specification team</p>
                  <p className="text-[12px] text-black/50 leading-snug mt-0.5 sm:truncate">WhatsApp draft to {scene.to}, {scene.firm}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-[#FFF5CC] border border-black/15 px-2.5 py-1 text-[11.5px] font-bold">Draft</span>
              </div>

              <div className="relative flex-1 px-4 sm:px-6 py-6 bg-[#F4F1EC]" aria-live="polite">
                <div aria-hidden className="absolute inset-0 dots-fine opacity-60" />
                <div className="relative flex flex-col items-end gap-2.5">
                  <span className="self-center rounded-full bg-white/80 border border-black/10 px-3 py-1 text-[11.5px] font-semibold text-black/50">Today</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={scene.stage}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="w-full flex flex-col items-end gap-2"
                    >
                      <Bubble paragraphs={scene.paragraphs} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <p className={`flex items-start gap-2 px-5 py-3.5 border-t ${RULE} text-[12.5px] text-black/55`}>
                <Lock className="size-3.5 mt-0.5 shrink-0" />
                Written from verified brand facts. Not sent: AllHome connects its own WhatsApp number to send.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/** One WhatsApp message, exactly as drafted. It is a draft, so no delivery or read receipts. */
function Bubble({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="relative max-w-[94%] rounded-[14px] rounded-tr-[4px] bg-[#DDF3E4] border border-[#599D77]/30 px-4 pt-3 pb-2 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      <div className="space-y-2.5">
        {paragraphs.map((p, i) => (
          <p key={i} className={`text-[14.5px] leading-[1.55] ${i === paragraphs.length - 1 ? "font-semibold" : ""}`}>
            {p}
          </p>
        ))}
      </div>
      <p className="mt-1.5 flex items-center justify-end gap-1 text-[11px] font-medium text-black/45">
        <PencilLine className="size-3" /> Draft, not sent
      </p>
    </div>
  );
}
