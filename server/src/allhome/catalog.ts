/**
 * AllHome knowledge base — brands, categories, project stages and experience centres.
 *
 * Brand descriptions and product lines are taken from AllHome's public website
 * (allhome.in). Specification stages and lead times are planning heuristics used by
 * the bundler / radar — they are editable per workspace from Settings.
 */

// ─── Segments & projects ───

export type Segment = "architect" | "id_firm" | "developer" | "contractor" | "homeowner";
export type ProjectType = "villa" | "premium_apartment" | "apartment_tower" | "hospitality" | "office" | "retail";
export type ProjectStage = "design" | "structure" | "mep" | "fitout" | "finishing" | "handover";
export type CategoryId = "facades_windows" | "lighting" | "hardware_bath" | "surfaces";

export const SEGMENTS: Record<Segment, { label: string; market: "B2B" | "B2C"; description: string }> = {
  architect: { label: "Architect", market: "B2B", description: "Principal / partner at an architecture practice; specifies facades, windows and lighting early" },
  id_firm: { label: "Interior Design Firm", market: "B2B", description: "Interior designers who specify hardware, bath, lighting and finishes" },
  developer: { label: "Real-Estate Developer", market: "B2B", description: "Premium residential / commercial developers buying at project scale" },
  contractor: { label: "Contractor / PMC", market: "B2B", description: "Turnkey contractors and project-management consultants who execute and procure" },
  homeowner: { label: "Premium Homeowner", market: "B2C", description: "Owners building or renovating a premium home or villa" },
};

export const PROJECT_TYPES: Record<ProjectType, string> = {
  villa: "Luxury Villa",
  premium_apartment: "Premium Apartment",
  apartment_tower: "Residential Tower",
  hospitality: "Hospitality / Hotel",
  office: "Corporate Office",
  retail: "Retail / Showroom",
};

/** Ordered construction stages with a typical start week (from design kick-off). */
export const STAGES: Array<{ id: ProjectStage; label: string; startWeek: number; description: string }> = [
  { id: "design", label: "Concept & Design", startWeek: 0, description: "Drawings, elevations, material palette" },
  { id: "structure", label: "Structure", startWeek: 8, description: "RCC / steel frame; facade & window systems are locked" },
  { id: "mep", label: "MEP & Services", startWeek: 30, description: "Electrical, plumbing, HVAC; lighting layout and concealed bath parts" },
  { id: "fitout", label: "Interiors & Fit-out", startWeek: 42, description: "Joinery, modular, doors; hardware and bath fixtures" },
  { id: "finishing", label: "Finishing", startWeek: 58, description: "Coatings, polish, textures, final fixtures" },
  { id: "handover", label: "Handover / Renovation", startWeek: 68, description: "Possession, snagging, or a renovation of an existing space" },
];

export function stageIndex(stage: ProjectStage): number {
  return Math.max(0, STAGES.findIndex((s) => s.id === stage));
}

export const CATEGORIES: Record<CategoryId, string> = {
  facades_windows: "External Facades & Windows",
  lighting: "Lighting",
  hardware_bath: "Home Hardware & Bath",
  surfaces: "Surface Treatments",
};

// ─── Brands ───

export interface Brand {
  id: string;
  name: string;
  /** Formal / alternate name used in AllHome material */
  formalName?: string;
  category: CategoryId;
  tagline: string;
  description: string;
  /** Named product systems / lines, as listed by AllHome */
  productLines: string[];
  /** Services beyond product supply (design support, calculations, installation…) */
  services: string[];
  /** Verified figures from AllHome's brochure / brand pages */
  facts: string[];
  /** International brands carried (where applicable) */
  partners: string[];
  founders: string;
  /** One precise, specifier-relevant sentence the agents may quote */
  pitch: string;
  /** Stages at which this brand is typically specified / ordered (planning heuristic) */
  specifyAt: ProjectStage[];
  /** Planning heuristic — not a published figure */
  leadTimeWeeks: number;
  projectTypes: ProjectType[];
  segments: Segment[];
  color: string;
  website: string;
  externalSite?: string;
}

/** Sources for every fact in the knowledge base. */
export const SOURCES = {
  site: "https://www.allhome.in/",
  brochure: "https://www.allhome.in/resources/AllHome_Brochure_2026_digital.pdf",
  centres: "https://www.allhome.in/experience-centres",
  about: "https://www.allhome.in/our-vision",
  seriesB: "https://inc42.com/buzz/pharmeasy-cofounders-home-interiors-startup-allhome-raises-%e2%82%b9200-cr/",
} as const;

/** AllHome — company-level context (allhome.in, AllHome brochure 2026, press). */
export const ALLHOME = {
  name: "AllHome",
  positioning: "A first-of-its-kind collective of architectural and interior product brands: one destination where architects, designers, developers and homeowners can design, source and get support across categories.",
  promise: "One collective, multiple experts. Design simplified. Brands empowered. Homes transformed.",
  model: "AllHome designs, manufactures, sources and supplies. It partners with and builds specialist brands rather than acting as a reseller.",
  categories: ["Lighting", "External Facades", "Home Hardware & Bath", "Surface Treatments"],
  facts: [
    "5,000+ sites delivered across the collective",
    "50+ cities serviced",
    "1,000+ member team",
    "Experience centres across Mumbai, Delhi, Bengaluru, Hyderabad, Jaipur, Indore, Kolkata, Coimbatore, Chandigarh, Raipur and more",
  ],
  founders: "Dharmil Sheth, Dhaval Shah, Siddharth Shah and Hardik Dedhia, the co-founders of PharmEasy (API Holdings)",
  funding: "₹200 Cr Series B led by Bessemer Venture Partners at a ₹2,000 Cr valuation (press reports); company-reported ₹400 Cr+ annual revenue run rate and EBITDA-positive",
  insight: "In home improvement, architects, designers and contractors influence most purchase decisions, the way doctors do in healthcare (Hardik Dedhia, co-founder).",
  painPoints: ["Coordinating multiple vendors per project", "Long and unpredictable turnaround times", "Lack of design cohesion across categories", "Weak after-sales support"],
  hq: "18th Floor, One45 Business Bay, Ghatkopar East, Mumbai",
  email: "contact@allhome.in",
  website: "https://www.allhome.in",
};

export const BRANDS: Brand[] = [
  {
    id: "metalia",
    name: "Metalia",
    category: "facades_windows",
    tagline: "The Future of Facade Design",
    description: "India's first dedicated design-led metal facade brand, offering bespoke envelope solutions that integrate aesthetics, performance and sustainability for luxury residential, commercial and institutional buildings.",
    productLines: ["Aluminium Profiles & Fins", "C-Channels", "Gates, Slide & Fold Systems", "3D Parametric Panels", "Shingles & Coin Matrix Panels", "3D Designs & Louvers", "Metal Panels & Kinetic Facades", "Corten Steel Meshes"],
    services: ["Facade design tailored to the building's architecture and climate", "Engineering and installation"],
    facts: ["500+ facades installed", "100+ finishes", "30+ cities serviced", "50+ team members"],
    partners: [],
    founders: "Kartikeya Batra",
    pitch: "Metalia designs custom metal envelopes (aluminium fins, Corten meshes, kinetic facades and 3D parametric panels) tailored to each building's architecture and climate (500+ facades installed).",
    specifyAt: ["design", "structure"],
    leadTimeWeeks: 10,
    projectTypes: ["villa", "apartment_tower", "hospitality", "office", "retail"],
    segments: ["architect", "developer", "contractor"],
    color: "#6B7280",
    website: "https://www.allhome.in/brands/metalia",
    externalSite: "https://metaliaindia.com/",
  },
  {
    id: "window-factory",
    name: "The Window Factory",
    formalName: "TWF",
    category: "facades_windows",
    tagline: "Framing Memories, One View at a Time",
    description: "High-end window manufacturer with 35+ years of manufacturing, investing in advanced technology and global best practices, and supports projects from concept to post-completion.",
    productLines: ["Glide (Sliding Windows)", "Awning (Casement Windows)", "Vents (Louvers)", "Skye (Skylights)", "Indoors (Interior Partitions)", "Balustrade (Railings)", "Screens (Mosquito & Sun Shading)", "Outdoor Retreat (Gazebos)"],
    services: ["Concept-to-post-completion project support", "In-house manufacturing"],
    facts: ["1,000+ projects", "65+ finishes", "30+ cities serviced", "100+ team members", "Established 35+ years ago"],
    partners: [],
    founders: "Ashit, Nimit and Kashvi Vora",
    pitch: "The Window Factory manufactures high-end sliding, casement, louver and skylight systems in 65+ finishes, with 1,000+ projects across 30+ cities.",
    specifyAt: ["design", "structure"],
    leadTimeWeeks: 8,
    projectTypes: ["villa", "premium_apartment", "apartment_tower", "hospitality", "office"],
    segments: ["architect", "developer", "contractor", "homeowner"],
    color: "#0EA5E9",
    website: "https://www.allhome.in/brands/window-factory",
  },
  {
    id: "ledlum",
    name: "Ledlum",
    category: "lighting",
    tagline: "Design-Led Architectural Lighting & Fans",
    description: "Premium architectural lighting and design-forward fans for luxury residential, commercial and hospitality spaces, with in-house lighting design support for architects and designers.",
    productLines: ["Landscape Lighting (bollards, wall washers, in-ground, underwater)", "Low-voltage Magnetic Tracks (5 to 26 mm)", "Customised Indoor Lighting (multiple optics & CCTs)", "Accent Lighting", "Smart Lighting (Bluetooth, Zigbee, DT6, DT8, DMX)", "Decorative & Architectural Fans (Volaris)", "Outdoor Solar Lighting"],
    services: ["In-house lighting design", "Lux calculations", "3D lighting visualisations", "End-to-end architectural lighting recommendations"],
    facts: ["3,500+ SKUs", "1,000+ projects", "350+ channel partners", "20+ years of experience", "Divisions: Artizan, Astara, Volaris, Klewe"],
    partners: [],
    founders: "Sumeet Malhotra, with Abheek, Abhav and Pooja Malhotra",
    pitch: "Ledlum's in-house team does lighting design, lux calculations and 3D visualisations before anything is ordered, backed by 3,500+ SKUs from magnetic tracks to smart DALI/DMX control and Volaris architectural fans.",
    specifyAt: ["mep", "fitout"],
    leadTimeWeeks: 4,
    projectTypes: ["villa", "premium_apartment", "apartment_tower", "hospitality", "office", "retail"],
    segments: ["architect", "id_firm", "developer", "contractor", "homeowner"],
    color: "#F59E0B",
    website: "https://www.allhome.in/brands/ledlum",
  },
  {
    id: "house-of-w",
    name: "House of W",
    formalName: "House of Waterways",
    category: "hardware_bath",
    tagline: "Curated Global Bathware",
    description: "Luxury bathware with exclusive partnerships with leading international brands, used in luxury homes, five-star hotels and marquee real-estate projects.",
    productLines: ["Bath Fittings", "Sanitaryware", "Health & Well-being", "Bath Accessories", "Bathtubs & Spa", "Bathroom Furniture"],
    services: ["Single specification window across 15+ imported brands", "Experience centres in Mumbai, Bengaluru, Hyderabad, Indore, Chandigarh and Tirupur"],
    facts: ["15+ imported brands", "50+ developer projects", "5,000+ sites", "Five-star hotel and marquee real-estate projects"],
    partners: ["THG Paris", "Tonino Lamborghini", "Alpi", "Sunshower", "House of ROHL", "Victoria + Albert", "1962 Italia", "Olympia", "ISVEA", "Windisch", "Meir", "Decor Walther", "Total Living"],
    founders: "Kamlesh Choudhari, Rajesh Jain and Sejal Jain",
    pitch: "House of W brings 15+ international bathware brands (including THG Paris, House of ROHL and Victoria + Albert) under one specification window, with 50+ developer projects delivered.",
    specifyAt: ["mep", "fitout"],
    leadTimeWeeks: 6,
    projectTypes: ["villa", "premium_apartment", "hospitality"],
    segments: ["architect", "id_firm", "developer", "homeowner"],
    color: "#14B8A6",
    website: "https://www.allhome.in/brands/house-of-w",
    externalSite: "https://thw.co.in/",
  },
  {
    id: "fiamarc",
    name: "Fiamarc",
    category: "hardware_bath",
    tagline: "Premium Architectural & Furniture Hardware",
    description: "Premium architectural and furniture hardware from leading European brands, tailored to modern interior and construction needs.",
    productLines: ["Sliding Systems", "Furniture Hardware", "Door Hardware", "Modular Hardware", "Laminates & Surface Solutions"],
    services: ["Specification support across 15+ international brands"],
    facts: ["15+ international brands", "1,000+ products", "350+ touchpoints", "20+ years of experience"],
    partners: [],
    founders: "Nitul Sanghavi, Ronak Panchmia and Manan Panchmia",
    pitch: "Fiamarc supplies sliding systems, door, furniture and modular hardware from 15+ European brands: 1,000+ products through 350+ touchpoints.",
    specifyAt: ["fitout"],
    leadTimeWeeks: 3,
    projectTypes: ["villa", "premium_apartment", "apartment_tower", "hospitality", "office", "retail"],
    segments: ["architect", "id_firm", "contractor", "developer"],
    color: "#8B5CF6",
    website: "https://www.allhome.in/brands/fiamarc",
    externalSite: "https://www.fiamarc.com/",
  },
  {
    id: "shapes",
    name: "Shapes",
    category: "hardware_bath",
    tagline: "Design-Led Hardware for Modern Living",
    description: "Indian hardware and furniture-fittings brand since 1992. The team introduced aluminium handles to India in 2000 and relaunched the brand in 2020 with a design-led range.",
    productLines: ["Door Locks & Handles", "Main-door / Glass-door Handles", "Wardrobe & Profile Handles", "Drawer Knobs", "Bathroom Accessories", "Furniture Accessories"],
    services: ["Pan-India dealer availability"],
    facts: ["1,200+ designs", "1,000+ dealer network", "3 specialised divisions", "Since 1992"],
    partners: [],
    founders: "Mukesh, Shivam and Karishma Modi",
    pitch: "Shapes offers 1,200+ handle and hardware designs (main-door, profile, wardrobe and mortise handles), available through a 1,000+ dealer network.",
    specifyAt: ["fitout", "finishing"],
    leadTimeWeeks: 2,
    projectTypes: ["villa", "premium_apartment", "apartment_tower", "office", "retail"],
    segments: ["id_firm", "contractor", "developer", "homeowner"],
    color: "#EC4899",
    website: "https://www.allhome.in/brands/shapes",
  },
  {
    id: "colour-coats",
    name: "Colour Coats",
    category: "surfaces",
    tagline: "Surface Coating Excellence",
    description: "Italian-grade wood coatings, wall paints and textured finishes, made with architects, designers, contractors and builders on customised solutions for walls, furniture and flooring.",
    productLines: ["Metallic Coatings", "Wall Textures", "Seamless Flooring", "Exterior Coatings", "Lamination & PU Finishes", "Veneer Coatings", "Wood Polishing", "Custom Paint Applications"],
    services: ["Custom finishes developed with designers and builders", "On-site application"],
    facts: ["30+ years of founder experience", "Experience centres in Mumbai, Delhi, Kolkata and Coimbatore"],
    partners: [],
    founders: "Manish Shah",
    pitch: "Colour Coats develops custom finishes with designers (metallic coatings, wall textures, seamless flooring, PU and veneer coatings) and applies them on site.",
    specifyAt: ["finishing", "handover"],
    leadTimeWeeks: 2,
    projectTypes: ["villa", "premium_apartment", "apartment_tower", "hospitality", "office", "retail"],
    segments: ["architect", "id_firm", "contractor", "developer", "homeowner"],
    color: "#EF4444",
    website: "https://www.allhome.in/brands/colour-coats",
    externalSite: "https://www.colourcoats.com/",
  },
];

export function getBrand(id: string): Brand | undefined {
  return BRANDS.find((b) => b.id === id);
}

// ─── Experience centres (from allhome.in/experience-centres) ───

export interface ExperienceCentre {
  id: string;
  brandId: string;
  city: string;
  address: string;
  mapUrl: string;
  kind: "experience_centre" | "dealer";
}

const C = (brandId: string, city: string, address: string, mapUrl: string, kind: ExperienceCentre["kind"] = "experience_centre"): ExperienceCentre => ({
  id: `${brandId}-${city.toLowerCase().replace(/[^a-z]/g, "")}-${address.length}`,
  brandId,
  city,
  address,
  mapUrl,
  kind,
});

export const EXPERIENCE_CENTRES: ExperienceCentre[] = [
  C("fiamarc", "Mumbai", "A-103, Sagar Tech Plaza, Sakinaka, Andheri East, Mumbai 400072", "https://maps.google.com/?q=A-103+Sagar+Tech+Plaza+Sakinaka+Andheri+East+Mumbai+400072"),
  C("house-of-w", "Mumbai", "Ground Floor, 216A, Manish Commercial, Dr. Annie Besant Road, Worli, Mumbai 400030", "https://share.google/huavhOdx6uNJIh5sa"),
  C("house-of-w", "Bengaluru", "No 271, First Floor, 100 Feet Rd, Amarjyoti Layout, Domlur, Bengaluru", "https://share.google/OJuOF4363zoTO68FO"),
  C("house-of-w", "Chandigarh", "Plot No. 272, Industrial Area, Phase 2, Panchkula", "https://www.google.com/maps?q=30.6819,76.8346"),
  C("house-of-w", "Indore", "A 15, Meerapath Dhenu, Indore 452003", "https://www.google.com/maps?q=22.7212,75.8713"),
  C("house-of-w", "Tirupur", "389, Gandhi Rd, Periyar Colony, Velampalayam, Tirupur", "https://www.google.com/maps?q=11.1362,77.3229"),
  C("house-of-w", "Hyderabad", "Plot 1029, Road No. 45, Jubilee Hills, Hyderabad 500033", "https://share.google/CrqHlfNOjbCFW3tm7"),
  C("window-factory", "Mumbai", "Unit No. 6, New Anupam Ind. Estate, M.M. Malviya Road, Mulund West, Mumbai 400080", "https://maps.app.goo.gl/x14Ds3FiQHX1rboM9"),
  C("window-factory", "Indore", "4th Floor, Parag Traders, 12/4 Racecourse Rd, Narayan Kothi, Indore 452003", "https://share.google/E3CX3fyjE39z8RBnM"),
  C("window-factory", "Hyderabad", "V V One, Kavuri Hills, Madhapur, Hyderabad 500033", "https://share.google/M5JCCuGxoRKfGkUq8"),
  C("window-factory", "Jaipur", "12A Dharam Nagar, Opp CLKM, Mangyawas, Jaipur", "https://maps.app.goo.gl/7tU4Qq1nmiZpqGLr8"),
  C("colour-coats", "Mumbai", "Unit 804, 8th Floor, Hubtown Solaris, Prof. NS Phadke Rd, Andheri East, Mumbai 400069", "https://share.google/IL6TNvBpkkGAlo0ge"),
  C("colour-coats", "Delhi", "356-357, Mehrauli-Gurgaon Rd, Sultanpur, New Delhi 110030", "https://share.google/YULJTQXSS6TNyz56l"),
  C("colour-coats", "Kolkata", "2nd Floor, Tirumala 22 Topsia, E Topsia Rd, Kolkata 700046", "https://share.google/Q92Miy83xpJdY906T"),
  C("colour-coats", "Coimbatore", "1, W Ponnurangam Rd, R.S. Puram, Coimbatore 641002", "https://share.google/kzbvgx3ZA95mfKt9s"),
  C("metalia", "Delhi", "First Floor, 349, Mehrauli-Gurgaon Rd, Sultanpur, New Delhi 110030", "https://share.google/BlFPbeh1fKtrqxFVz"),
  C("metalia", "Jaipur", "Golden Wings Tile, Dharam Nagar, 12 Gopalpura Bypass Rd, Jaipur 302018", "https://share.google/QOlX8JoQM4gydBhzZ"),
  C("metalia", "Hyderabad", "Plot 1029, Road No. 45, Jubilee Hills, Hyderabad 500033", "https://share.google/ZSk3ZHbmxQvtPtROm"),
  C("metalia", "Raipur", "Plot No. A5, Laxmi Group, New Dhamtari Road, Deopuri, Raipur 492015", "https://maps.app.goo.gl/LWRq9rzKQTvca5Go9"),
  C("shapes", "Mumbai", "Shreeji Krupa, Shivaji Rd, Near Rasoi Hotel, Kandivali West, Mumbai 400067", "https://g.co/kgs/qbPnEb"),
  C("ledlum", "Chennai", "The Wings, 1st Ave, Shastri Nagar, Adyar, Chennai 600020", "https://maps.app.goo.gl/csYrsrPUz2xjbVid9"),
  C("ledlum", "Coimbatore", "Aura Home, 115 VJ Complex, Avinashi Road, Coimbatore 641018", "https://maps.app.goo.gl/MsyXabR3RVpTdY3aA", "dealer"),
  C("ledlum", "Pune", "Brite Cable Corporation, 753/754 Budhwar Peth, Pune 411002", "https://maps.app.goo.gl/yedWBoA1V769zKgh6", "dealer"),
  C("ledlum", "Hyderabad", "Lumixtra Lighting, Patel Avenue, Road No. 10, Banjara Hills, Hyderabad 500034", "https://maps.app.goo.gl/d2Hhtf8LcmXS6KWq6", "dealer"),
  C("ledlum", "Kolkata", "Crescentlite Emporio, 20/1/1J East Topsia Road, Kolkata 700046", "https://maps.app.goo.gl/CfM9xtkEaM35ddc77", "dealer"),
  C("ledlum", "Mohali", "A K Electrical, SCO 5, Sector 82, JLPL Mohali 160055", "https://maps.app.goo.gl/33AFFEwaeUdMqbtBA", "dealer"),
  C("ledlum", "Vadodara", "Light Box Inc, 34/N Harinagar Soc, Gotri Road, Vadodara 390003", "https://maps.app.goo.gl/aCCCd7t6DiVVeVQc8", "dealer"),
  C("ledlum", "Bhubaneswar", "Chimera Enterprises, Plot 206, Shastri Nagar, Bhubaneswar 751012", "https://maps.app.goo.gl/guAmTxVYPbaWXN6s9", "dealer"),
];

/** Approximate city coordinates, used to fall back to the nearest centre when a city has none. */
export const CITY_COORDS: Record<string, [number, number]> = {
  Mumbai: [19.08, 72.88], Pune: [18.52, 73.86], Delhi: [28.61, 77.21], Gurugram: [28.46, 77.03], Noida: [28.54, 77.39],
  Bengaluru: [12.97, 77.59], Hyderabad: [17.39, 78.49], Chennai: [13.08, 80.27], Kolkata: [22.57, 88.36],
  Jaipur: [26.91, 75.79], Indore: [22.72, 75.86], Coimbatore: [11.02, 76.96], Chandigarh: [30.73, 76.78],
  Mohali: [30.70, 76.72], Raipur: [21.25, 81.63], Tirupur: [11.11, 77.34], Vadodara: [22.31, 73.18],
  Ahmedabad: [23.02, 72.57], Surat: [21.17, 72.83], Bhubaneswar: [20.30, 85.82], Lucknow: [26.85, 80.95],
  Kochi: [9.93, 76.27], Goa: [15.30, 74.12], Nagpur: [21.15, 79.09],
};

const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru", bengaluru: "Bengaluru", bombay: "Mumbai", "new delhi": "Delhi", gurgaon: "Gurugram",
  panchkula: "Chandigarh", baroda: "Vadodara", calcutta: "Kolkata", madras: "Chennai", cochin: "Kochi",
};

/** Normalise free-text location ("Andheri, Mumbai, India") to a known city name. */
export function normalizeCity(location?: string): string | undefined {
  if (!location) return undefined;
  const lower = location.toLowerCase();
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) return city;
  }
  return Object.keys(CITY_COORDS).find((c) => lower.includes(c.toLowerCase()));
}

export const PRIORITY_CITIES = Array.from(new Set(EXPERIENCE_CENTRES.map((c) => c.city))).sort();

function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export interface CentreMatch {
  centre: ExperienceCentre;
  brandName: string;
  distanceKm: number;
  sameCity: boolean;
}

/**
 * Nearest experience centre for a brand (or any brand when brandId is omitted).
 * Prefers proper experience centres over dealer showrooms at similar distance.
 */
/**
 * Best centre to invite a lead to for a set of brands (in priority order):
 * the first brand with a centre in the lead's own city wins; otherwise the
 * nearest centre of the top brand; otherwise the nearest centre of any brand.
 */
export function bestCentreForBrands(city: string | undefined, brandIds: string[]): CentreMatch | null {
  for (const id of brandIds) {
    const m = nearestCentre(city, id);
    if (m?.sameCity) return m;
  }
  const anySame = nearestCentre(city);
  if (anySame?.sameCity && brandIds.length === 0) return anySame;
  return (brandIds[0] ? nearestCentre(city, brandIds[0]) : null) || nearestCentre(city);
}

export function nearestCentre(city: string | undefined, brandId?: string): CentreMatch | null {
  const pool = EXPERIENCE_CENTRES.filter((c) => !brandId || c.brandId === brandId);
  if (pool.length === 0) return null;
  const origin = city ? CITY_COORDS[city] : undefined;

  const scored = pool.map((centre) => {
    const coords = CITY_COORDS[centre.city];
    const d = origin && coords ? distanceKm(origin, coords) : 9999;
    // small penalty for dealer showrooms
    return { centre, distanceKm: Math.round(d), score: d + (centre.kind === "dealer" ? 25 : 0) };
  });
  scored.sort((a, b) => a.score - b.score);
  const best = scored[0];
  return {
    centre: best.centre,
    brandName: getBrand(best.centre.brandId)?.name || best.centre.brandId,
    distanceKm: origin ? best.distanceKm : -1,
    sameCity: !!city && best.centre.city === city,
  };
}
