import { Link } from "react-router-dom";
import { BadgeCheck, Gauge, Lock, Search } from "lucide-react";
import { BRANDS, CENTRES, PER_PIPELINE } from "./data";
import { Logo } from "./Nav";
import { DemoButton, RULE, ScrollWords, Section, SectionHead, Swatch, headline } from "./ui";

const SAFEGUARDS = [
  {
    icon: BadgeCheck,
    title: "Facts only from the AllHome Brief",
    body: "Every figure in a message comes from AllHome's own website and brochure. The AI edits a checked draft, and its version is thrown out if it changes a figure, invents a project, praises old news or slips into filler.",
    tone: "bg-[#CEEBFC]", ink: "",
  },
  {
    icon: Search,
    title: "Real research, with sources",
    body: "For a real firm, every line of the profile links to where it was found. Emails and phone numbers are never guessed. Demo firms are fictional and labelled that way.",
    tone: "bg-white", ink: "",
  },
  {
    icon: Lock,
    title: "Nothing is sent until AllHome connects its accounts",
    body: "Sending is locked in the demo. In production, WhatsApp, email and LinkedIn messages go out from AllHome's own number, domain and profiles, and warm leads land in Zoho CRM.",
    tone: "bg-[#EA435F] text-white", ink: "text-white/90",
  },
  {
    icon: Gauge,
    title: "Costs are capped every day",
    body: `A full pipeline costs about ${PER_PIPELINE.searches} web searches and ${PER_PIPELINE.aiCalls} AI calls. Daily limits cover every feature, and if a provider fails or a limit is reached, the feature falls back and Settings shows exactly what happened.`,
    tone: "bg-[#E7F6EC]", ink: "",
  },
];

/** Centres and dealer showrooms per city, from allhome.in/experience-centres. */
const CITY_CENTRES: Array<{ city: string; brands: string[] }> = [
  { city: "Mumbai", brands: ["fiamarc", "house-of-w", "window-factory", "colour-coats", "shapes"] },
  { city: "Hyderabad", brands: ["house-of-w", "window-factory", "metalia", "ledlum"] },
  { city: "Delhi", brands: ["colour-coats", "metalia"] },
  { city: "Jaipur", brands: ["window-factory", "metalia"] },
  { city: "Indore", brands: ["house-of-w", "window-factory"] },
  { city: "Kolkata", brands: ["colour-coats", "ledlum"] },
  { city: "Coimbatore", brands: ["colour-coats", "ledlum"] },
  { city: "Bengaluru", brands: ["house-of-w"] },
  { city: "Chennai", brands: ["ledlum"] },
  { city: "Chandigarh", brands: ["house-of-w"] },
  { city: "Raipur", brands: ["metalia"] },
  { city: "Tirupur", brands: ["house-of-w"] },
  { city: "Pune", brands: ["ledlum"] },
  { city: "Mohali", brands: ["ledlum"] },
  { city: "Vadodara", brands: ["ledlum"] },
  { city: "Bhubaneswar", brands: ["ledlum"] },
];
const colorOf = (id: string) => BRANDS.find((b) => b.id === id)?.color || "#000";
const nameOf = (id: string) => BRANDS.find((b) => b.id === id)?.name || id;

export function Safeguards() {
  return (
    <Section id="safeguards" inner="py-16 sm:py-24">
      <SectionHead title="Built to be trusted with AllHome's name." lead="Outreach to an architect is a first impression for seven brands at once. These rules hold on every message." />
      <div className="mt-12 grid md:grid-cols-2 gap-6">
        {SAFEGUARDS.map((g) => (
          <article key={g.title} className={`relative overflow-hidden rounded-[14px] border-2 border-black shadow-[6px_6px_0_0_#000] p-7 sm:p-8 ${g.tone}`}>
            <div aria-hidden className={`pointer-events-none absolute inset-0 fade-corner ${g.tone.includes("text-white") ? "dots-light opacity-70" : "dots opacity-60"}`} />
            <g.icon aria-hidden className={`pointer-events-none absolute -right-6 -bottom-8 size-44 ${g.tone.includes("text-white") ? "text-white/[0.07]" : "text-black/[0.05]"}`} strokeWidth={1.2} />
            <g.icon className="relative size-7" strokeWidth={2.2} />
            <h3 className="relative mt-6 font-headline text-[1.3rem] font-[700] leading-snug tracking-[-0.01em]">{g.title}</h3>
            <p className={`relative mt-2.5 text-[15px] leading-[1.65] ${g.ink || "text-black/65"}`}>{g.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function Centres() {
  return (
    <Section inner="!px-0">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="px-5 sm:px-10 py-16 sm:py-20">
          <SectionHead title="Every pitch ends at a showroom." lead={`${CENTRES.experienceCentres} experience centres and ${CENTRES.dealers} Ledlum dealer showrooms across ${CENTRES.cities} cities. NERVE invites each lead to the nearest one, and offers a sample kit when the nearest is in another city.`} />
          <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2" aria-label="Brand colours">
            {BRANDS.map((b) => (
              <li key={b.id} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-black/70">
                <Swatch color={b.color} size={10} /> {b.name}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[12.5px] text-black/45">Addresses from allhome.in/experience-centres</p>
        </div>
        <ul className={`relative grid grid-cols-2 sm:grid-cols-4 border-t lg:border-t-0 lg:border-l ${RULE} self-start`}>
          {CITY_CENTRES.map((c, i) => (
            <li key={c.city} className={`px-4 py-3.5 sm:px-5 sm:py-5 border-black/[0.12] ${i % 2 ? "border-l" : ""} sm:border-l-0 ${i % 4 ? "sm:border-l" : ""} ${i >= 2 ? "border-t" : ""} ${i < 4 ? "sm:border-t-0" : "sm:border-t"}`}>
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-bold">{c.city}</span>
                <span className="text-[11.5px] font-semibold tabular-nums text-black/40">{c.brands.length}</span>
              </p>
              <p className="mt-2.5 flex flex-wrap gap-1" aria-label={c.brands.map(nameOf).join(", ")}>
                {c.brands.map((b) => (
                  <span key={b} title={nameOf(b)}>
                    <Swatch color={colorOf(b)} size={12} />
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <Section inner="py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[20px] bg-[#EA435F] text-white border-2 border-black shadow-[6px_6px_0_0_#000] px-6 sm:px-12 py-12 sm:py-16 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 dots-light fade-corner" />
        <div className="relative">
          <h2 className={`${headline} text-[clamp(1.9rem,3.6vw,3rem)] font-[650] leading-[1.05] tracking-[-0.03em] text-balance`}>
            {/* Near the page bottom it can never reach the upper third, so it completes lower down */}
            <ScrollWords text="Open a workspace that already has missions running." dim={0.35} range={["start 0.9", "start 0.62"]} />
          </h2>
          <p className="mt-4 text-[1.05rem] leading-[1.6] text-white/85 max-w-[52ch] text-pretty">
            Eleven missions across all seven brands, a finished Autopilot scan, booked visits and a guide on every page. Research is live. Sending is not.
          </p>
        </div>
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
          <DemoButton variant="white" />
          <Link to="/signup" className="text-[15px] font-bold underline underline-offset-[6px] decoration-2 decoration-white/60 hover:decoration-white">
            Create your own workspace
          </Link>
        </div>
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className={`mx-auto max-w-[1200px] border-x ${RULE} px-5 sm:px-10 py-10 flex flex-col md:flex-row gap-6 md:items-center`}>
        <Logo />
        <p className="text-[13px] text-black/55 max-w-[58ch]">
          A prototype built for AllHome. Not an official AllHome product. Demo firms and contacts are fictional. Brand facts are from allhome.in and AllHome's 2026 brochure.
        </p>
        <nav aria-label="Footer" className="md:ml-auto flex gap-6 text-[14px] font-semibold text-black/70">
          <a href="#how" className="hover:text-black">How it works</a>
          <a href="#autopilot" className="hover:text-black">Autopilot</a>
          <Link to="/login" className="hover:text-black">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
