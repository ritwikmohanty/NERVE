import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { BRANDS } from "./data";
import { DemoButton, Section, Swatch, display } from "./ui";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#autopilot", label: "Autopilot" },
  { href: "#windows", label: "Brands & stages" },
  { href: "#safeguards", label: "Safeguards" },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30 rounded-[4px]">
      <span aria-hidden className="size-9 grid place-items-center bg-[#EA435F] border-[3px] border-black rounded-[6px] shadow-[2px_2px_0_0_#000]">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M4 20V4l16 16V4" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`${display} block text-[19px] font-[900] tracking-[-0.02em]`}>NERVE</span>
        <span className="block text-[10.5px] font-bold text-black/60 mt-0.5">for AllHome</span>
      </span>
    </Link>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-[#F9F5F2]/95 backdrop-blur border-b-[3px] border-black">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8 h-[68px] flex items-center gap-6">
        <Logo />
        <nav aria-label="Sections" className="hidden md:flex items-center gap-1 ml-4">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="px-3 py-2 text-[14px] font-bold rounded-[6px] hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden sm:flex items-center gap-3">
          <Link to="/login" className="px-3 py-2 text-[14px] font-bold underline-offset-4 hover:underline">
            Sign in
          </Link>
          <DemoButton label="Open the demo" />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden ml-auto sm:ml-0 size-10 grid place-items-center border-[3px] border-black bg-white rounded-[6px]"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t-[3px] border-black bg-white px-4 py-3 space-y-1">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-2 py-2.5 text-[15px] font-bold border-b border-black/10">
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex items-center gap-3">
            <DemoButton label="Open the demo" />
            <Link to="/login" className="text-[14px] font-bold underline">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/** The seven brands NERVE sells, in the order a building needs them. */
export function BrandStrip() {
  return (
    <Section className="pb-16">
      <div className="border-[3px] border-black rounded-[10px] bg-white">
        <p className="px-5 pt-4 text-[14px] font-bold text-black/70">One collective, seven specialist brands, pitched in the order a building needs them</p>
        <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {BRANDS.map((b, i) => (
            <li key={b.id} className={`px-5 py-4 border-black ${i > 0 ? "lg:border-l-2" : ""} ${i % 2 ? "border-l-2 sm:border-l-0" : ""} ${i % 4 ? "sm:border-l-2" : ""} border-t-2 lg:border-t-0 lg:mt-3`}>
              <div className="flex items-center gap-2">
                <Swatch color={b.color} size={12} />
                <span className="text-[14px] font-black leading-tight">{b.name}</span>
              </div>
              <p className="mt-1 text-[12px] font-semibold text-black/60">{b.category}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
