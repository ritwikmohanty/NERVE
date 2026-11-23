import { RULE, Section, SectionHead } from "./ui";

/* Small drawn illustrations, one per point (same line weight as the pipeline icons) */
const svg = { width: 56, height: 40, viewBox: "0 0 56 40", fill: "none", stroke: "#000", strokeWidth: 1.6, "aria-hidden": true } as const;
function IconStage() {
  return (
    <svg {...svg}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={2 + i * 9} y="22" width="7" height="8" rx="1" fill={i === 1 ? "#0EA5E9" : i === 2 ? "#6B7280" : "#fff"} strokeWidth={1.2} />
      ))}
      <path d="M19 4v14M15 14l4 4 4-4" stroke="#EA435F" strokeWidth="1.8" />
      <path d="M2 36h52" strokeDasharray="2 3" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
function IconVendors() {
  return (
    <svg {...svg}>
      <rect x="3" y="4" width="12" height="12" rx="2" fill="#6B7280" />
      <rect x="22" y="2" width="12" height="12" rx="2" fill="#14B8A6" />
      <rect x="41" y="7" width="12" height="12" rx="2" fill="#F59E0B" />
      <rect x="9" y="24" width="12" height="12" rx="2" fill="#8B5CF6" />
      <rect x="33" y="25" width="12" height="12" rx="2" fill="#EF4444" />
      <path d="M15 12l7-4M34 9l7 3M17 24l5-10M38 25l3-6" strokeDasharray="2 2" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
function IconSamples() {
  return (
    <svg {...svg}>
      <rect x="10" y="8" width="20" height="28" rx="3" fill="#CEEBFC" transform="rotate(-14 20 22)" />
      <rect x="20" y="6" width="20" height="28" rx="3" fill="#FFDA5C" transform="rotate(2 30 20)" />
      <rect x="30" y="7" width="20" height="28" rx="3" fill="#fff" transform="rotate(16 40 21)" />
      <circle cx="39" cy="15" r="2" fill="#000" stroke="none" transform="rotate(16 40 21)" />
    </svg>
  );
}

const POINTS = [
  {
    Icon: IconStage,
    title: "They decide at one stage, then it's gone.",
    body: "Facades and windows are locked while the structure goes up. Bath fittings and lighting are chosen at MEP and fit-out. A pitch one stage late is a pitch for their next project.",
    answer: "NERVE reads the project's stage, leads with the brands whose window is open, and times the next message to the brand after that.",
  },
  {
    Icon: IconVendors,
    title: "They juggle a vendor for every category.",
    body: "Facade, windows, lighting, bath, hardware and finishes usually come from different suppliers, each with its own schedule and after-sales.",
    answer: "Every message leads with one brand but sells the collective: one relationship, one palette, one point of after-sales.",
  },
  {
    Icon: IconSamples,
    title: "They specify what they've seen in person.",
    body: "A PDF rarely moves a specifier. Seeing the panel, the finish or the fitting does.",
    answer: "The ask is always a short visit to the nearest experience centre, or a sample kit when the nearest one is in another city.",
  },
];

export function Problem() {
  return (
    <Section inner="!px-0">
      <div className={`grid lg:grid-cols-[1.25fr_1fr] border-b ${RULE}`}>
        <div className="px-5 sm:px-10 py-16 sm:py-20">
          <SectionHead title="In home improvement, the person who decides isn't the person who pays." lead="Architects, interior designers and contractors choose the materials. Their clients pay for them. AllHome wins when it reaches the first group at the right moment." />
        </div>
        <figure className={`relative px-5 sm:px-10 py-10 lg:py-20 border-t lg:border-t-0 lg:border-l ${RULE} flex flex-col justify-end`}>
          <div aria-hidden className="pointer-events-none absolute inset-0 dots fade-corner opacity-70" />
          <blockquote className="relative text-[1.2rem] leading-[1.5] font-medium">
            Architects, designers and contractors influence most purchase decisions, the way doctors do in healthcare.
          </blockquote>
          <figcaption className="relative mt-3 text-[13px] text-black/55">Paraphrasing Hardik Dedhia, AllHome co-founder</figcaption>
        </figure>
      </div>
      <div className="relative px-5 sm:px-10 pt-12 pb-16 sm:pb-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 dots-fine fade-bottom opacity-80" />
        <ul className="relative grid md:grid-cols-3 gap-6">
          {POINTS.map((p) => (
            <li key={p.title} className="flex flex-col rounded-[14px] border-2 border-black bg-white shadow-[5px_5px_0_0_#000] overflow-hidden">
              <div className="flex-1 p-6">
                <span className="grid place-items-center size-[72px] rounded-[10px] border-2 border-black bg-[#F9F5F2]">
                  <p.Icon />
                </span>
                <h3 className="mt-5 font-headline text-[1.15rem] font-[700] leading-snug tracking-[-0.01em]">{p.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-[1.65] text-black/60">{p.body}</p>
              </div>
              <div className="border-t-2 border-black bg-[#FFDA5C] px-6 py-5 md:min-h-[10rem]">
                <p className="text-[12px] font-bold">What NERVE does</p>
                <p className="mt-1.5 text-[14.5px] leading-[1.55] font-medium">{p.answer}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
