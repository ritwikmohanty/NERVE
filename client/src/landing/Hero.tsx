import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { BuildingSvg } from "./BuildingSvg";
import { BRANDS, HERO_SCENES, STAGES } from "./data";
import { ButtonLink, DemoButton, Section, Swatch, display } from "./ui";

const HERO_STAGES = STAGES.slice(0, 5);
const STEP_MS = 4600;

export function Hero() {
  const reduced = useReducedMotion() ?? false;
  const [stage, setStage] = useState(1);
  const [playing, setPlaying] = useState(!reduced);

  useEffect(() => {
    if (!playing || reduced) return;
    const t = setInterval(() => setStage((s) => (s + 1) % HERO_STAGES.length), STEP_MS);
    return () => clearInterval(t);
  }, [playing, reduced]);

  const scene = HERO_SCENES[stage];
  const stageId = HERO_STAGES[stage].id;
  const nextId = HERO_STAGES[stage + 1]?.id;

  return (
    <Section className="pt-10 sm:pt-16 pb-16 sm:pb-24">
      <div className="grid lg:grid-cols-[1fr_1.08fr] gap-10 lg:gap-14 items-start">
        <div className="lg:pt-8">
          <p className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1 rounded-full text-[13px] font-bold">
            <span className="size-2 rounded-full bg-[#599D77] border border-black" />
            Specifier outreach for the AllHome collective
          </p>
          <h1 className={`${display} mt-6 text-[clamp(2.5rem,6.2vw,4.6rem)] font-[900] leading-[0.95] tracking-[-0.035em]`}>
            Reach the architect before the facade is specified.
          </h1>
          <p className="mt-6 text-[1.13rem] leading-[1.6] text-black/75 max-w-[54ch]">
            NERVE finds the architects, designers, developers and contractors who are about to choose materials. It pitches the AllHome brand their construction stage needs, then books them into the nearest experience centre.
          </p>
          <div className="mt-8 flex flex-wrap items-start gap-3">
            <DemoButton />
            <ButtonLink href="#how">See one mission</ButtonLink>
          </div>
          <p className="mt-6 text-[13px] font-semibold text-black/55 max-w-[46ch]">
            The demo opens a workspace with eleven missions already run. Nothing is ever sent from it.
          </p>
        </div>

        {/* The project card: a building at its current stage, the brands whose window is open, and the message NERVE drafts */}
        <div className="relative">
          <div className="border-[3px] border-black bg-white rounded-[10px] shadow-[8px_8px_0_0_#000] overflow-hidden">
            <div className="flex items-center gap-3 border-b-[3px] border-black px-4 py-3 bg-[#FFDA5C]">
              <div className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p key={scene.project} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="text-[15px] font-black truncate">
                    {scene.project}
                  </motion.p>
                </AnimatePresence>
                <p className="text-[12px] font-semibold text-black/70 truncate">{scene.firm}</p>
              </div>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause the stage animation" : "Play the stage animation"}
                className="ml-auto size-9 shrink-0 grid place-items-center border-2 border-black bg-white rounded-[6px] hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </div>

            <div role="tablist" aria-label="Construction stage" className="grid grid-cols-5 border-b-[3px] border-black">
              {HERO_STAGES.map((st, i) => (
                <button
                  key={st.id}
                  role="tab"
                  aria-selected={i === stage}
                  onClick={() => {
                    setStage(i);
                    setPlaying(false);
                  }}
                  className={`relative py-2.5 text-[11px] sm:text-[12px] font-extrabold border-r-2 last:border-r-0 border-black transition-colors focus-visible:outline-none focus-visible:bg-[#FFF5CC] ${
                    i === stage ? "bg-black text-white" : i < stage ? "bg-[#EDE8E3]" : "bg-white hover:bg-[#FFF5CC]"
                  }`}
                >
                  {st.short}
                  {i === stage && playing && !reduced && (
                    <motion.span key={`p${stage}`} className="absolute left-0 bottom-0 h-[3px] bg-[#FFDA5C]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: STEP_MS / 1000, ease: "linear" }} />
                  )}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-[1.25fr_1fr]">
              <div className="p-3 sm:p-4 sm:pb-12 flex items-center border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-black bg-[#F9F5F2]">
                <BuildingSvg stage={stage} reduced={reduced} />
              </div>
              <div className="p-3 sm:p-4 sm:pb-12">
                <p className="text-[12px] font-extrabold mb-2">Specified at {HERO_STAGES[stage].label.toLowerCase()}</p>
                <ul className="space-y-1.5">
                  {BRANDS.map((b) => {
                    const now = b.specifyAt.includes(stageId);
                    const next = !now && !!nextId && b.specifyAt.includes(nextId);
                    return (
                      <li
                        key={b.id}
                        className={`flex items-center gap-2 border-2 rounded-[5px] px-2 py-1.5 transition-all duration-300 ${
                          now ? "border-black bg-white shadow-[3px_3px_0_0_#000]" : next ? "border-black/40 bg-white" : "border-transparent opacity-35"
                        }`}
                      >
                        <Swatch color={b.color} />
                        <span className="text-[12.5px] font-extrabold truncate">{b.name}</span>
                        {now && <span className="ml-auto text-[10.5px] font-black bg-[#599D77] text-white px-1.5 py-0.5 rounded-[3px] border border-black whitespace-nowrap">Pitch now</span>}
                        {next && <span className="ml-auto text-[10.5px] font-bold text-black/60 whitespace-nowrap">Next stage</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* The draft NERVE writes for this stage */}
          <div className="relative -mt-3 sm:-mt-9 mx-2 sm:ml-10 sm:mr-[-14px]" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={scene.stage}
                initial={reduced ? false : { opacity: 0, y: 14, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="border-[3px] border-black bg-[#E7F6EC] rounded-[10px] rounded-tl-[2px] shadow-[6px_6px_0_0_#000] p-4"
              >
                <p className="text-[11.5px] font-extrabold text-black/60">WhatsApp draft for {scene.to} at {scene.firm}</p>
                <p className="mt-1.5 text-[14px] leading-[1.5]">
                  Hi {scene.to}, this is the specification team at AllHome. {scene.message}
                </p>
                <p className="mt-2 text-[14px] leading-[1.5] font-semibold">{scene.ask}</p>
                <p className="mt-3 text-[11.5px] font-bold text-black/55">Written by NERVE from verified brand facts. Sent only once AllHome connects its own WhatsApp.</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Section>
  );
}
