import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NerveLogo } from "@/components/brand/logo";
import { BRANDS, STAGES } from "./data";
import { DemoButton, RULE, Section, Swatch } from "./ui";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#autopilot", label: "Autopilot" },
  { href: "#windows", label: "Brands & stages" },
  { href: "#safeguards", label: "Safeguards" },
];

export function Logo() {
  return (
    <Link to="/" className="rounded-[4px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25">
      <NerveLogo size={34} />
    </Link>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className={`sticky top-0 z-40 bg-[#F9F5F2]/90 backdrop-blur-md border-b ${RULE}`}>
      <div className={`mx-auto max-w-[1200px] border-x ${RULE} h-16 flex items-stretch`}>
        <div className="flex items-center px-5 sm:px-6">
          <Logo />
        </div>
        <nav aria-label="Sections" className={`hidden lg:flex items-stretch border-l ${RULE}`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`flex items-center px-5 text-[14px] font-semibold text-black/70 border-r ${RULE} hover:text-black hover:bg-black/[0.03] focus-visible:outline-none focus-visible:bg-[#FFF5CC]`}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden sm:flex items-center gap-4 px-5 sm:px-6">
          <Link to="/login" className="text-[14px] font-semibold text-black/70 hover:text-black">
            Sign in
          </Link>
          <DemoButton label="Open the demo" size="sm" />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className={`lg:hidden ml-auto sm:ml-0 w-16 grid place-items-center border-l ${RULE}`}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className={`lg:hidden border-t ${RULE} bg-[#F9F5F2] px-5 py-3`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={`block py-3 text-[15px] font-semibold border-b ${RULE}`}>
              {l.label}
            </a>
          ))}
          <div className="pt-4 pb-2 flex items-center gap-4">
            <DemoButton label="Open the demo" size="sm" />
            <Link to="/login" className="text-[14px] font-semibold underline">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/** The seven brands, in the order a building needs them, as a hairline grid (no card). */
export function BrandStrip() {
  return (
    <Section inner="!px-0" marks={false}>
      <p className={`px-5 sm:px-10 py-4 border-b ${RULE} text-[13px] font-semibold text-black/55`}>
        Seven specialist brands, pitched in the order a building needs them. The bar shows each brand&apos;s stages, from design to handover.
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {BRANDS.map((b, i) => (
          <li key={b.id} className={`flex flex-col px-5 py-5 border-black/[0.12] ${i % 2 ? "border-l" : ""} sm:border-l-0 ${i % 4 ? "sm:border-l" : ""} ${i ? "lg:border-l" : "lg:border-l-0"} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i >= 4 ? "sm:border-t lg:border-t-0" : ""}`}>
            <div className="flex items-center gap-2">
              <Swatch color={b.color} size={11} />
              <span className="text-[14.5px] font-bold leading-tight">{b.name}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-black/55">{b.category}</p>
            {/* Where in the build this brand is specified: six stages, design to handover */}
            <div className="mt-auto pt-3.5 flex gap-[3px]" title={`Specified at: ${STAGES.filter((st) => b.specifyAt.includes(st.id)).map((st) => st.label.toLowerCase()).join(", ")}`} aria-label={`Specified at ${STAGES.filter((st) => b.specifyAt.includes(st.id)).map((st) => st.label.toLowerCase()).join(" and ")}`}>
              {STAGES.map((st) => (
                <span key={st.id} className="h-[5px] flex-1 rounded-[1px]" style={{ background: b.specifyAt.includes(st.id) ? b.color : "rgb(0 0 0 / 0.08)" }} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
