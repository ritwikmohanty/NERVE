import { Link } from "react-router-dom";
import { BadgeCheck, Gauge, Lock, Search } from "lucide-react";
import { BRANDS, CENTRES, PER_PIPELINE } from "./data";
import { Logo } from "./Nav";
import { DemoButton, Section, SectionHead, Swatch, display } from "./ui";

const SAFEGUARDS = [
  {
    icon: BadgeCheck,
    title: "Facts only from the AllHome Brief",
    body: "Every figure in a message comes from AllHome's own website and brochure. The AI edits a checked draft, and its version is thrown out if it changes a figure, invents a project, praises old news or slips into filler.",
    tone: "bg-[#CEEBFC]",
  },
  {
    icon: Search,
    title: "Real research, with sources",
    body: "For a real firm, every line of the profile links to where it was found. Emails and phone numbers are never guessed. Demo firms are fictional and labelled that way.",
    tone: "bg-white",
  },
  {
    icon: Lock,
    title: "Nothing is sent until AllHome connects its accounts",
    body: "Sending is locked in the demo. In production, WhatsApp, email and LinkedIn messages go out from AllHome's own number, domain and profiles, and warm leads land in Zoho CRM.",
    tone: "bg-[#EA435F] text-white",
  },
  {
    icon: Gauge,
    title: "Costs are capped every day",
    body: `A full pipeline costs about ${PER_PIPELINE.searches} web searches and ${PER_PIPELINE.aiCalls} AI calls. Daily limits cover every feature, and if a provider fails or a limit is reached, the feature falls back and Settings shows exactly what happened.`,
    tone: "bg-[#E7F6EC]",
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
    <Section id="safeguards" className="py-16 sm:py-24 border-t-[3px] border-black">
      <SectionHead
        title="Built to be trusted with AllHome's name."
        lead="Outreach to an architect is a first impression for seven brands at once. These rules hold on every message."
      />
      <div className="mt-10 grid md:grid-cols-2 gap-5">
        {SAFEGUARDS.map((s) => (
          <article key={s.title} className={`border-[3px] border-black rounded-[10px] shadow-[6px_6px_0_0_#000] p-6 ${s.tone}`}>
            <s.icon className="size-7" strokeWidth={2.5} />
            <h3 className="mt-4 text-[1.25rem] font-black leading-snug">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-[1.6] opacity-85">{s.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function Centres() {
  return (
    <Section className="py-16 sm:py-24 border-t-[3px] border-black bg-white">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
        <div>
          <SectionHead
            title="Every pitch ends at a showroom."
            lead={`NERVE invites each lead to the nearest place they can see the product: ${CENTRES.experienceCentres} experience centres and ${CENTRES.dealers} Ledlum dealer showrooms across ${CENTRES.cities} cities. When the nearest one is in another city, it offers a sample kit instead.`}
          />
          <p className="mt-6 text-[13px] font-semibold text-black/55">Addresses from allhome.in/experience-centres.</p>
        </div>
        <div>
        <ul className="grid grid-cols-2 sm:grid-cols-4 border-[3px] border-black rounded-[10px] overflow-hidden">
          {CITY_CENTRES.map((c, i) => (
            <li key={c.city} className={`p-3.5 border-black ${i % 2 ? "border-l-2" : ""} sm:border-l-0 ${i % 4 ? "sm:border-l-2" : ""} ${i >= 2 ? "border-t-2" : ""} ${i < 4 ? "sm:border-t-0" : "sm:border-t-2"}`}>
              <p className="text-[14px] font-black">{c.city}</p>
              <p className="mt-2 flex flex-wrap gap-1" aria-label={c.brands.map(nameOf).join(", ")}>
                {c.brands.map((b) => (
                  <span key={b} title={nameOf(b)}>
                    <Swatch color={colorOf(b)} size={14} />
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Brand colours">
          {BRANDS.map((b) => (
            <li key={b.id} className="flex items-center gap-1.5 text-[12.5px] font-bold">
              <Swatch color={b.color} size={12} /> {b.name}
            </li>
          ))}
        </ul>
        </div>
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 sm:px-8 py-16 sm:py-20 bg-[#EA435F] border-t-[3px] border-black text-white">
      <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
        <div>
          <h2 className={`${display} text-[clamp(1.9rem,3.8vw,3rem)] font-[900] leading-[1] tracking-[-0.03em]`}>
            Open a workspace that already has missions running.
          </h2>
          <p className="mt-4 text-[1.05rem] leading-[1.6] max-w-[56ch] text-white/90">
            The demo has eleven missions across all seven brands, an Autopilot run, booked visits and a guide on every page. Try it on a real firm name too: research is live, sending is not.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-4 lg:justify-end">
          <DemoButton variant="white" />
          <Link to="/signup" className="h-12 inline-flex items-center px-2 text-[15px] font-extrabold underline underline-offset-4 decoration-2 hover:decoration-4">
            Create your own workspace
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="px-4 sm:px-8 py-10 bg-[#F9F5F2] border-t-[3px] border-black">
      <div className="mx-auto max-w-[1180px] flex flex-col md:flex-row gap-6 md:items-center">
        <Logo />
        <p className="text-[13px] font-medium text-black/65 max-w-[60ch]">
          A prototype built for AllHome. Not an official AllHome product. Demo firms and contacts are fictional. Brand facts are from allhome.in and AllHome's 2026 brochure.
        </p>
        <nav aria-label="Footer" className="md:ml-auto flex gap-5 text-[14px] font-bold">
          <a href="#how" className="hover:underline">How it works</a>
          <a href="#autopilot" className="hover:underline">Autopilot</a>
          <Link to="/login" className="hover:underline">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
