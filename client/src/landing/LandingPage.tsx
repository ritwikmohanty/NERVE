import { AutopilotBand } from "./AutopilotBand";
import { Centres, FinalCta, Footer, Safeguards } from "./Closing";
import { Hero } from "./Hero";
import { BrandStrip, Nav } from "./Nav";
import { Problem } from "./Problem";
import { Walkthrough } from "./Walkthrough";
import { WindowGrid } from "./WindowGrid";

/**
 * NERVE for AllHome: landing page.
 * Order follows the reader's questions: what is it (hero), for whom (brands), why it matters
 * (problem), how it works (walkthrough), can it find firms itself (Autopilot), how it decides
 * what to pitch (window grid), can we trust it (safeguards), where leads end up (centres).
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9F5F2] text-black overflow-x-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white border-2 border-black px-3 py-2 font-bold">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <BrandStrip />
        <Problem />
        <Walkthrough />
        <AutopilotBand />
        <WindowGrid />
        <Safeguards />
        <Centres />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
