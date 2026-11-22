/**
 * Autopilot trigger catalogue — the real-world events that mean "materials will be
 * specified soon" in AllHome's market, plus a clearly fictional sample pool used when
 * live research is off (or when someone runs a no-cost sample scan).
 */
import type { ProjectStage, ProjectType, Segment } from "../allhome/catalog.js";
import type { TriggerSignal } from "../types/index.js";

export type TriggerType =
  | "project_launch"
  | "hospitality"
  | "commercial_fitout"
  | "award_feature"
  | "new_studio"
  | "developer_expansion";

export interface TriggerDef {
  id: TriggerType;
  label: string;
  description: string;
  /** Why this event matters to AllHome (shown in the UI and in the prospect's reason) */
  allhomeAngle: string;
  /** Segments that usually appear in this kind of news */
  segments: Segment[];
  signalCategory: TriggerSignal["category"];
  /** Most likely construction stage right after this event */
  stageHint: ProjectStage;
  projectType?: ProjectType;
  /** Base weight in the triage score (0–30) */
  weight: number;
  query: (city: string) => string;
}

export const TRIGGERS: Record<TriggerType, TriggerDef> = {
  project_launch: {
    id: "project_launch",
    label: "New project launches",
    description: "Luxury residential launches, villa communities and new RERA registrations",
    allhomeAngle: "Launched projects lock facades and windows within months — the Metalia and Window Factory window is opening.",
    segments: ["developer", "architect"],
    signalCategory: "project_launch",
    stageHint: "design",
    weight: 30,
    query: (city) => `new luxury residential project launch ${city} villas premium apartments RERA`,
  },
  hospitality: {
    id: "hospitality",
    label: "Hotel signings & openings",
    description: "New hotels, resorts and branded residences signed or announced",
    allhomeAngle: "Hospitality projects specify every AllHome category at once — facade, lighting, bath, hardware and finishes.",
    segments: ["developer", "architect", "id_firm"],
    signalCategory: "project_launch",
    stageHint: "design",
    projectType: "hospitality",
    weight: 30,
    query: (city) => `new luxury hotel signed OR resort announced OR upcoming hotel ${city} India developer architect`,
  },
  commercial_fitout: {
    id: "commercial_fitout",
    label: "Office & retail fit-outs",
    description: "New corporate campuses, flagship stores and office fit-outs",
    allhomeAngle: "Fit-out is when lighting, hardware and doors are bought — Ledlum, House of W and Shapes are in play.",
    segments: ["id_firm", "contractor"],
    signalCategory: "office_opening",
    stageHint: "fitout",
    projectType: "office",
    weight: 26,
    query: (city) => `new corporate office campus OR flagship store ${city} interior fit-out design firm`,
  },
  award_feature: {
    id: "award_feature",
    label: "Awards & design features",
    description: "Firms winning design awards or featured for recent work",
    allhomeAngle: "Recognised studios win the next premium commissions — reach them before those projects are specified.",
    segments: ["architect", "id_firm"],
    signalCategory: "award_publication",
    stageHint: "design",
    weight: 20,
    query: (city) => `${city} architecture OR interior design firm award winning project 2026`,
  },
  new_studio: {
    id: "new_studio",
    label: "New studios & expansions",
    description: "New design studios, new offices and principals starting their own practice",
    allhomeAngle: "A new studio has no supplier habits yet — the first brands they specify tend to stick.",
    segments: ["architect", "id_firm"],
    signalCategory: "office_opening",
    stageHint: "design",
    weight: 18,
    query: (city) => `new architecture OR interior design studio opens office ${city}`,
  },
  developer_expansion: {
    id: "developer_expansion",
    label: "Developer land deals & funding",
    description: "Land acquisitions, joint development deals and fundraises by developers",
    allhomeAngle: "Land and capital today mean towers and villas tomorrow — get on the approved-vendor list early.",
    segments: ["developer"],
    signalCategory: "funding",
    stageHint: "design",
    projectType: "apartment_tower",
    weight: 24,
    query: (city) => `real estate developer land acquisition OR joint development OR raises funds ${city} premium housing`,
  },
};

export const TRIGGER_IDS = Object.keys(TRIGGERS) as TriggerType[];

// ─── Sample pool (fictional firms — every name is in SAMPLE_FIRMS, so it is never researched live) ───

export interface SampleTrigger {
  firm: string;
  segment: Segment;
  city: string;
  trigger: TriggerType;
  title: string;
  detail: string;
  projectName?: string;
  projectType?: ProjectType;
  stage?: ProjectStage;
  daysAgo: number;
}

export const SAMPLE_TRIGGERS: SampleTrigger[] = [
  { firm: "Studio Kaarva Architects", segment: "architect", city: "Mumbai", trigger: "project_launch", title: "Studio Kaarva Architects unveils Kaarva Villa in Alibaug", detail: "A 14,000 sq ft villa with a perforated metal screen facade and floor-to-ceiling glazing; structure work has started.", projectName: "Kaarva Villa, Alibaug", projectType: "villa", stage: "structure", daysAgo: 6 },
  { firm: "Meridian Habitat Developers", segment: "developer", city: "Hyderabad", trigger: "project_launch", title: "Meridian Habitat registers Meridian Skyline tower in Kokapet", detail: "A new RERA registration lists a 42-storey premium residential tower with a unitised glass facade.", projectName: "Meridian Skyline, Kokapet", projectType: "apartment_tower", stage: "design", daysAgo: 9 },
  { firm: "Banyan Grove Realty", segment: "developer", city: "Bengaluru", trigger: "developer_expansion", title: "Banyan Grove Realty acquires 18 acres in Whitefield for a villa community", detail: "The developer plans 120 premium villas; master planning is under way.", projectName: "Banyan Grove Villas, Whitefield", projectType: "villa", stage: "structure", daysAgo: 12 },
  { firm: "Vastu Verde Developers", segment: "developer", city: "Pune", trigger: "project_launch", title: "Vastu Verde Developers launches Verde Heights in Baner", detail: "Two premium residential towers with sky decks; the launch brochure highlights imported bath fittings and smart lighting.", projectName: "Verde Heights, Baner", projectType: "apartment_tower", stage: "design", daysAgo: 4 },
  { firm: "Tidewater Realty", segment: "developer", city: "Chennai", trigger: "developer_expansion", title: "Tidewater Realty signs a joint development deal on ECR", detail: "A joint development agreement for a low-rise luxury community along East Coast Road.", projectName: "Tidewater Shores, ECR", projectType: "villa", stage: "design", daysAgo: 18 },
  { firm: "Saltpan Hospitality Studio", segment: "architect", city: "Mumbai", trigger: "hospitality", title: "Saltpan Hospitality Studio appointed architect for a 160-key resort in Alibaug", detail: "The studio will design a coastal resort with villas, a spa and an all-day dining pavilion.", projectName: "Coastal Resort, Alibaug", projectType: "hospitality", stage: "design", daysAgo: 7 },
  { firm: "Monsoon House Architects", segment: "architect", city: "Bengaluru", trigger: "hospitality", title: "Monsoon House Architects to design a forest retreat in Devanahalli", detail: "A 60-key boutique retreat built around existing trees, with large timber-and-glass pavilions.", projectName: "Forest Retreat, Devanahalli", projectType: "hospitality", stage: "design", daysAgo: 15 },
  { firm: "Kosha Design Studio", segment: "id_firm", city: "Delhi", trigger: "hospitality", title: "Kosha Design Studio wins interiors for a boutique hotel in Chhatarpur", detail: "Interiors for a 40-room boutique hotel; MEP coordination is starting.", projectName: "Boutique Hotel, Chhatarpur", projectType: "hospitality", stage: "mep", daysAgo: 10 },
  { firm: "Prism Build PMC", segment: "contractor", city: "Mumbai", trigger: "commercial_fitout", title: "Prism Build PMC wins a Grade-A office fit-out in Powai", detail: "A 2.2 lakh sq ft fit-out for a technology company; hardware and lighting packages go to tender next month.", projectName: "Grade-A Office Fit-out, Powai", projectType: "office", stage: "fitout", daysAgo: 5 },
  { firm: "Arcadia Fitouts", segment: "contractor", city: "Bengaluru", trigger: "commercial_fitout", title: "Arcadia Fitouts to deliver a flagship store on MG Road", detail: "A two-level flagship retail store with feature lighting and custom metal cladding.", projectName: "Flagship Store, MG Road", projectType: "retail", stage: "fitout", daysAgo: 8 },
  { firm: "Ochre & Oak Interiors", segment: "id_firm", city: "Mumbai", trigger: "award_feature", title: "Ochre & Oak Interiors featured for a Worli sea-view residence", detail: "A design publication featured the studio's material-led apartment interiors; the studio is taking on two new residences.", projectName: "Worli Sea-view Residence", projectType: "premium_apartment", stage: "fitout", daysAgo: 20 },
  { firm: "Ferrous Line Architects", segment: "architect", city: "Pune", trigger: "award_feature", title: "Ferrous Line Architects shortlisted for a residential design award", detail: "Recognised for a courtyard house with a weathering-steel screen facade.", projectType: "villa", stage: "design", daysAgo: 24 },
  { firm: "Halden & Rao Architects", segment: "architect", city: "Chennai", trigger: "new_studio", title: "Halden & Rao Architects opens a second studio in Chennai", detail: "The practice is expanding to take on hospitality and premium residential work in Tamil Nadu.", stage: "design", daysAgo: 11 },
  { firm: "Kiln & Clay Interiors", segment: "id_firm", city: "Jaipur", trigger: "new_studio", title: "Former design director launches Kiln & Clay Interiors in Jaipur", detail: "A new studio focused on heritage-inspired luxury homes and boutique stays.", stage: "design", daysAgo: 16 },
  { firm: "Studio Anvaya", segment: "id_firm", city: "Kolkata", trigger: "commercial_fitout", title: "Studio Anvaya designs a new corporate headquarters in New Town", detail: "Workplace interiors for a financial-services firm; joinery and lighting are being specified.", projectName: "Corporate HQ, New Town", projectType: "office", stage: "fitout", daysAgo: 13 },
  { firm: "Atelier Nirvaan", segment: "architect", city: "Jaipur", trigger: "hospitality", title: "Atelier Nirvaan to restore a haveli as a heritage hotel", detail: "A 30-room heritage hotel with new guest wings; facade and window restoration is planned.", projectName: "Heritage Haveli Hotel, Jaipur", projectType: "hospitality", stage: "design", daysAgo: 21 },
  { firm: "Granite Peak Estates", segment: "developer", city: "Delhi", trigger: "developer_expansion", title: "Granite Peak Estates raises funds for luxury floors in Golf Links", detail: "Funding for a portfolio of independent luxury floors; construction starts this year.", projectName: "Golf Links Floors", projectType: "premium_apartment", stage: "structure", daysAgo: 27 },
  { firm: "Aster Lane Interiors", segment: "id_firm", city: "Bengaluru", trigger: "award_feature", title: "Aster Lane Interiors wins a workplace design award", detail: "Recognised for a modular office with warm architectural lighting.", projectType: "office", stage: "fitout", daysAgo: 33 },
  { firm: "Saffron Edge Developers", segment: "developer", city: "Hyderabad", trigger: "project_launch", title: "Saffron Edge Developers launches a villa project in Jubilee Hills", detail: "Twelve luxury villas with private pools; architects are finalising elevations.", projectName: "Saffron Villas, Jubilee Hills", projectType: "villa", stage: "design", daysAgo: 3 },
  { firm: "Ironbark Turnkey Contracting", segment: "contractor", city: "Delhi", trigger: "commercial_fitout", title: "Ironbark Turnkey wins a hotel fit-out package in Aerocity", detail: "Turnkey interiors for 220 rooms and public areas; procurement starts next quarter.", projectName: "Hotel Fit-out, Aerocity", projectType: "hospitality", stage: "fitout", daysAgo: 19 },
];
