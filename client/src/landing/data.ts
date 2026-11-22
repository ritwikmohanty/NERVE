/**
 * Landing page content. Every figure here mirrors the server's AllHome catalogue
 * (server/src/allhome/catalog.ts) or real NERVE output from the seeded demo.
 */

export type StageId = "design" | "structure" | "mep" | "fitout" | "finishing" | "handover";

export const STAGES: Array<{ id: StageId; label: string; short: string }> = [
  { id: "design", label: "Concept & design", short: "Design" },
  { id: "structure", label: "Structure", short: "Structure" },
  { id: "mep", label: "MEP & services", short: "MEP" },
  { id: "fitout", label: "Interiors & fit-out", short: "Fit-out" },
  { id: "finishing", label: "Finishing", short: "Finishing" },
  { id: "handover", label: "Handover", short: "Handover" },
];

export interface LandingBrand {
  id: string;
  name: string;
  category: string;
  color: string;
  fact: string;
  specifyAt: StageId[];
}

export const BRANDS: LandingBrand[] = [
  { id: "metalia", name: "Metalia", category: "Metal facades", color: "#6B7280", fact: "500+ facades installed", specifyAt: ["design", "structure"] },
  { id: "window-factory", name: "The Window Factory", category: "Windows & glazing", color: "#0EA5E9", fact: "1,000+ projects", specifyAt: ["design", "structure"] },
  { id: "ledlum", name: "Ledlum", category: "Architectural lighting", color: "#F59E0B", fact: "3,500+ SKUs", specifyAt: ["mep", "fitout"] },
  { id: "house-of-w", name: "House of W", category: "Luxury bathware", color: "#14B8A6", fact: "15+ imported brands", specifyAt: ["mep", "fitout"] },
  { id: "fiamarc", name: "Fiamarc", category: "Architectural hardware", color: "#8B5CF6", fact: "15+ international brands", specifyAt: ["fitout"] },
  { id: "shapes", name: "Shapes", category: "Handles & hardware", color: "#EC4899", fact: "1,200+ designs", specifyAt: ["fitout", "finishing"] },
  { id: "colour-coats", name: "Colour Coats", category: "Surface finishes", color: "#EF4444", fact: "Custom finishes, applied on site", specifyAt: ["finishing", "handover"] },
];

/** One real opening per stage, as NERVE's checked templates write it for the seeded demo firms. */
export const HERO_SCENES: Array<{ stage: StageId; firm: string; project: string; to: string; message: string; ask: string }> = [
  {
    stage: "design",
    firm: "Meridian Habitat Developers",
    project: "Meridian Skyline, Kokapet",
    to: "Arjun",
    message: "Congratulations on Meridian Skyline in Kokapet. While the design is still being finalised, this is when Metalia and The Window Factory are usually specified.",
    ask: "Would you have 20 minutes next week to see the panel and window samples at the Metalia experience centre in Hyderabad?",
  },
  {
    stage: "structure",
    firm: "Studio Kaarva Architects",
    project: "Kaarva Villa, Alibaug",
    to: "Ishita",
    message: "Congratulations on Kaarva Villa in Alibaug. With the structure going up, this is when The Window Factory and Metalia are usually specified.",
    ask: "Would you have 20 minutes next week to see the panel and window samples at the Window Factory experience centre in Mumbai?",
  },
  {
    stage: "mep",
    firm: "Kosha Design Studio",
    project: "Boutique Hotel, Chhatarpur",
    to: "Neel",
    message: "Congratulations on the boutique hotel in Chhatarpur. With MEP and services under way, this is when House of W and Ledlum are usually specified.",
    ask: "Shall I send a House of W sample kit to your studio?",
  },
  {
    stage: "fitout",
    firm: "Prism Build PMC",
    project: "Grade-A Office Fit-out, Powai",
    to: "Dev",
    message: "Congratulations on the Grade-A office fit-out in Powai. With interiors and fit-out under way, this is when Fiamarc, Shapes and Ledlum are usually specified.",
    ask: "Would you have 20 minutes next week to see the fittings and finishes at the Fiamarc experience centre in Mumbai?",
  },
  {
    stage: "finishing",
    firm: "The Rao Residence",
    project: "Rao Villa, Jubilee Hills",
    to: "Ananya",
    message: "Good to see Rao Villa in Jubilee Hills nearing completion. With finishing work under way, this is when Shapes and Colour Coats are usually specified.",
    ask: "Shall I send a Shapes sample kit to your home?",
  },
];

export const CENTRES = { total: 28, experienceCentres: 21, dealers: 7, cities: 16 };

export const PER_PIPELINE = { searches: 2, aiCalls: 7 };
