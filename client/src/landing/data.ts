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

/**
 * The first WhatsApp touch NERVE writes for one seeded demo firm at each stage, copied verbatim from
 * the seed output (server/src/db/seed-demo.ts run through the real pipeline), with the brands that
 * touch features (pitch) and the bundle's next-stage brands (next).
 */
export interface HeroScene {
  stage: StageId;
  firm: string;
  project: string;
  to: string;
  paragraphs: [string, string, string];
  pitch: string[];
  next: string[];
}

export const HERO_SCENES: HeroScene[] = [
  {
    stage: "design",
    firm: "Monsoon House Architects",
    project: "Forest Retreat, Devanahalli",
    to: "Kabir",
    paragraphs: [
      "Hi Kabir, this is the specification team at AllHome. Congratulations on the forest retreat in Devanahalli.",
      "While the design is still being finalised, this is when Metalia and The Window Factory are usually specified. Metalia has installed 500+ facades.",
      "Shall I send a Metalia sample kit to your studio? You'd also be welcome at the House of W experience centre in Bengaluru to see the wider AllHome range.",
    ],
    pitch: ["metalia", "window-factory"],
    next: ["house-of-w", "ledlum"],
  },
  {
    stage: "structure",
    firm: "Studio Kaarva Architects",
    project: "Kaarva Villa, Alibaug",
    to: "Ishita",
    paragraphs: [
      "Hi Ishita, this is the specification team at AllHome. Congratulations on Kaarva Villa in Alibaug.",
      "With the structure going up, this is when The Window Factory and Metalia are usually specified. The Window Factory has delivered 1,000+ projects across 30+ cities.",
      "Would you have 20 minutes next week to see the panel and window samples at the Window Factory experience centre in Mumbai? If a visit is hard to fit in, I can send a sample kit to your studio instead.",
    ],
    pitch: ["window-factory", "metalia"],
    next: ["house-of-w", "ledlum"],
  },
  {
    stage: "mep",
    firm: "Kosha Design Studio",
    project: "Boutique Hotel, Chhatarpur",
    to: "Neel",
    paragraphs: [
      "Hi Neel, this is the specification team at AllHome. Congratulations on the boutique hotel in Chhatarpur.",
      "With MEP and services under way, this is when House of W and Ledlum are usually specified. House of W carries 15+ imported bathware brands, including THG Paris and Victoria + Albert.",
      "Shall I send a House of W sample kit to your studio? You'd also be welcome at the Colour Coats experience centre in Delhi to see the wider AllHome range.",
    ],
    pitch: ["house-of-w", "ledlum"],
    next: ["fiamarc", "colour-coats"],
  },
  {
    stage: "fitout",
    firm: "Prism Build PMC",
    project: "Grade-A Office Fit-out, Powai",
    to: "Dev",
    paragraphs: [
      "Hi Dev, this is the specification team at AllHome. Congratulations on the Grade-A office fit-out in Powai.",
      "With interiors and fit-out under way, this is when Fiamarc, Shapes and Ledlum are usually specified. Fiamarc carries hardware from 15+ international brands.",
      "Would you have 20 minutes next week to see the fittings and finishes at the Fiamarc experience centre in Mumbai? If a visit is hard to fit in, I can send a sample kit to your site office instead.",
    ],
    pitch: ["fiamarc", "shapes", "ledlum"],
    next: ["colour-coats"],
  },
  {
    stage: "finishing",
    firm: "The Rao Residence",
    project: "Rao Villa, Jubilee Hills",
    to: "Ananya",
    paragraphs: [
      "Hi Ananya, this is the specification team at AllHome. Good to see Rao Villa in Jubilee Hills nearing completion.",
      "With finishing work under way, this is when Shapes and Colour Coats are usually specified. Shapes has 1,200+ handle and hardware designs.",
      "Shall I send a Shapes sample kit to your home? You'd also be welcome at the Window Factory experience centre in Hyderabad to see the wider AllHome range.",
    ],
    pitch: ["shapes", "colour-coats"],
    next: [],
  },
];

export const CENTRES = { total: 28, experienceCentres: 21, dealers: 7, cities: 16 };

export const PER_PIPELINE = { searches: 2, aiCalls: 7 };
