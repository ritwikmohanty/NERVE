import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, Loader2, Search, Building2, Home, ClipboardPaste, Wand2, Sparkles, AlertTriangle, Radar, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BundlePanel, StageRadar } from "@/components/bundle-panel";
import { SendingBanner } from "@/components/sending-notice";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BundlePreview, CapturedLead, ProjectStage, ProjectType, Segment, BudgetTier } from "@/lib/types";

type Tab = "b2b" | "b2c" | "discover" | "capture";

const TABS: Array<{ id: Tab; label: string; icon: typeof Building2; hint: string }> = [
  { id: "b2b", label: "B2B Specifier", icon: Building2, hint: "Architect, ID firm, developer or contractor" },
  { id: "b2c", label: "B2C Homeowner", icon: Home, hint: "Premium homeowner building or renovating" },
  { id: "discover", label: "Discover", icon: Search, hint: "Find specifier firms by segment & city" },
  { id: "capture", label: "Quick Capture", icon: ClipboardPaste, hint: "Paste a WhatsApp chat or business card" },
];

const SAMPLE_CAPTURE = `14/11/26, 11:05 - Kabir Malhotra: Hi! This is Kabir from Lumen Row Architects, Hyderabad.
14/11/26, 11:06 - Kabir Malhotra: We're designing a 6,000 sq ft villa in Jubilee Hills. Structure is going up now and facade drawings are being finalised.
14/11/26, 11:07 - Kabir Malhotra: Looking at metal facade screens, large sliding windows and architectural lighting. Budget ~12 Cr.
14/11/26, 11:08 - Kabir Malhotra: kabir@lumenrow.example | +91 00000 22110`;

const selectCls = "h-9 w-full border-2 border-black bg-white px-2 text-sm font-semibold rounded-md";

interface FormState {
  companyName: string;
  segment: Segment;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  projectCity: string;
  projectName: string;
  projectType: ProjectType;
  projectStage: ProjectStage;
  projectValue: string;
  budgetTier: BudgetTier;
  additionalContext: string;
}

const EMPTY: FormState = {
  companyName: "", segment: "architect", contactName: "", contactTitle: "", contactEmail: "", contactPhone: "",
  projectCity: "Mumbai", projectName: "", projectType: "villa", projectStage: "structure", projectValue: "", budgetTier: "premium", additionalContext: "",
};

export default function NewLeadPage() {
  const navigate = useNavigate();
  const { catalog, session } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "b2b";
  const setTab = (t: Tab) => setParams(t === "b2b" ? {} : { tab: t }, { replace: true });

  const [form, setForm] = useState<FormState>({ ...EMPTY, projectCity: session?.org.settings.cities[0] || "Mumbai" });
  const [origin, setOrigin] = useState<"form" | "capture">("form");
  const [preview, setPreview] = useState<BundlePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Discovery
  const [discSegment, setDiscSegment] = useState<Segment>("architect");
  const [discCities, setDiscCities] = useState<string[]>(session?.org.settings.cities.slice(0, 2) || ["Mumbai"]);
  const [discCount, setDiscCount] = useState(3);

  // Capture
  const [captureText, setCaptureText] = useState("");
  const [captured, setCaptured] = useState<CapturedLead | null>(null);

  const isB2C = tab === "b2c";
  const segment: Segment = isB2C ? "homeowner" : form.segment;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const cities = useMemo(() => Array.from(new Set([...(catalog?.cities || []), "Pune", "Bengaluru", "Ahmedabad", "Gurugram", ...(session?.org.settings.cities || [])])).sort(), [catalog, session]);

  // Live bundle preview (debounced)
  useEffect(() => {
    if (tab !== "b2b" && tab !== "b2c") return;
    const t = setTimeout(() => {
      api.bundlePreview({ segment, projectType: form.projectType, projectStage: form.projectStage, city: form.projectCity, budgetTier: form.budgetTier }).then(setPreview).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tab, segment, form.projectType, form.projectStage, form.projectCity, form.budgetTier]);

  async function launch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) return setError(isB2C ? "Homeowner / household name is required" : "Firm name is required");
    setLoading(true);
    setError("");
    try {
      const v = (s: string) => s.trim() || undefined;
      const res = await api.executeTargeted({
        companyName: form.companyName.trim(),
        segment,
        contactName: v(form.contactName),
        contactTitle: isB2C ? "Homeowner" : v(form.contactTitle),
        contactEmail: v(form.contactEmail),
        contactPhone: v(form.contactPhone),
        projectCity: v(form.projectCity),
        projectName: v(form.projectName),
        projectType: form.projectType,
        projectStage: form.projectStage,
        projectValue: v(form.projectValue),
        budgetTier: form.budgetTier,
        additionalContext: v(form.additionalContext),
        origin,
      });
      navigate(`/dashboard/pipeline/${res.pipelineId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && typeof err.body.leadId === "string") {
        navigate(`/dashboard/pipeline/${err.body.leadId}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to start pipeline");
    } finally {
      setLoading(false);
    }
  }

  async function discover(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.discover({ segment: discSegment, cities: discCities, maxResults: discCount });
      navigate(`/dashboard/pipeline/${res.pipelineId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start discovery");
    } finally {
      setLoading(false);
    }
  }

  async function extract() {
    setLoading(true);
    setError("");
    try {
      const { lead } = await api.capture(captureText);
      setCaptured(lead);
      const isHome = lead.segment === "homeowner";
      setForm((f) => ({
        ...f,
        companyName: lead.companyName || (isHome && lead.contactName ? `The ${lead.contactName.split(" ").slice(-1)[0]} Residence` : f.companyName),
        segment: lead.segment && lead.segment !== "homeowner" ? lead.segment : f.segment,
        contactName: lead.contactName || "",
        contactTitle: lead.contactTitle || "",
        contactEmail: lead.contactEmail || "",
        contactPhone: lead.contactPhone || "",
        projectCity: lead.projectCity || f.projectCity,
        projectName: lead.projectName || "",
        projectType: lead.projectType || f.projectType,
        projectStage: lead.projectStage || f.projectStage,
        projectValue: lead.projectValue || "",
        additionalContext: lead.notes || "",
      }));
      setOrigin("capture");
      setTab(isHome ? "b2c" : "b2b");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't extract a lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">New Mission</h1>
          <p className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Launch the 10-agent pipeline on a specifier, homeowner or a whole segment</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" data-tour="mission-tabs">
          {TABS.map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setError(""); }}
              className={`text-left border-2 border-black p-3 transition-all ${tab === id ? "bg-secondary shadow-[3px_3px_0_0_#000]" : "bg-white hover:bg-muted/40"}`}
            >
              <span className="flex items-center gap-2 font-black text-xs uppercase"><Icon className="size-4" /> {label}</span>
              <span className="block text-[10px] font-semibold text-muted-foreground mt-1">{hint}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs font-bold text-white bg-destructive border-2 border-black px-3 py-2">
            <AlertTriangle className="size-4" /> {error}
          </div>
        )}

        {/* ── B2B / B2C form with live bundle preview ── */}
        {(tab === "b2b" || tab === "b2c") && (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-5 items-start">
            <form onSubmit={launch} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] space-y-4" data-tour="mission-form">
              <p className="text-[11px] font-semibold border-2 border-black bg-[#CEEBFC] px-3 py-2">
                <span className="font-black">Real firm names are researched live</span> (web and news via Tavily, profile extracted by AI). This is read-only; nothing is sent. Contact details are never guessed: add the principal's name, email or WhatsApp if you have them. Leave project fields blank and the drafts won't mention a specific project.
              </p>
              {origin === "capture" && captured && (
                <div className="text-[11px] font-bold border-2 border-black bg-[#CEEBFC] px-3 py-2 flex items-center gap-2">
                  <Wand2 className="size-3.5" /> Prefilled from Quick Capture ({captured.method === "llm" ? "AI" : "pattern"} extraction, {Math.round(captured.confidence * 100)}% confidence). Review and launch
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{isB2C ? "Household / homeowner name" : "Firm name"} *</Label>
                  <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder={isB2C ? "e.g. The Rao Residence" : "e.g. Studio Kaarva Architects"} />
                </div>
                {!isB2C && (
                  <div className="space-y-1.5">
                    <Label>Segment</Label>
                    <select className={selectCls} value={form.segment} onChange={(e) => set("segment", e.target.value as Segment)}>
                      <option value="architect">Architect</option>
                      <option value="id_firm">Interior Design Firm</option>
                      <option value="developer">Real-Estate Developer</option>
                      <option value="contractor">Contractor / PMC</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Project city</Label>
                  <select className={selectCls} value={form.projectCity} onChange={(e) => set("projectCity", e.target.value)}>
                    {cities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact name</Label>
                  <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Auto-enriched if blank" />
                </div>
                {!isB2C && (
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={form.contactTitle} onChange={(e) => set("contactTitle", e.target.value)} placeholder="e.g. Principal Architect" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp / phone</Label>
                  <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="optional" />
                </div>
              </div>

              <div className="border-t-2 border-black pt-4 grid sm:grid-cols-2 gap-3">
                <p className="sm:col-span-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Project context: drives the bundle & timing</p>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Project name</Label>
                  <Input value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="e.g. Kaarva Villa, Alibaug (optional)" />
                </div>
                <div className="space-y-1.5">
                  <Label>Project type</Label>
                  <select className={selectCls} value={form.projectType} onChange={(e) => set("projectType", e.target.value as ProjectType)}>
                    {Object.entries(catalog?.projectTypes || { villa: "Luxury Villa" })
                      .filter(([id]) => !isB2C || ["villa", "premium_apartment"].includes(id))
                      .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Construction stage</Label>
                  <select className={selectCls} value={form.projectStage} onChange={(e) => set("projectStage", e.target.value as ProjectStage)}>
                    {(catalog?.stages || []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Project value</Label>
                  <Input value={form.projectValue} onChange={(e) => set("projectValue", e.target.value)} placeholder="e.g. ₹12 Cr" />
                </div>
                <div className="space-y-1.5">
                  <Label>Budget tier</Label>
                  <select className={selectCls} value={form.budgetTier} onChange={(e) => set("budgetTier", e.target.value as BudgetTier)}>
                    <option value="premium">Premium</option>
                    <option value="luxury">Luxury</option>
                    <option value="value">Value-conscious</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.additionalContext} onChange={(e) => set("additionalContext", e.target.value)} placeholder="Anything the agents should know (optional)" />
                </div>
              </div>

              <SendingBanner compact context="messages" />
              <button type="submit" disabled={loading} className="w-full h-11 bg-primary text-white font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Launch 10-agent pipeline
              </button>
            </form>

            <div className="space-y-5 lg:sticky lg:top-4" data-tour="mission-preview">
              {preview ? (
                <motion.div key={`${segment}-${form.projectStage}-${form.projectType}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="size-3" /> Live preview: updates as you edit</p>
                  <BundlePanel bundle={preview.bundle} brands={catalog?.brands} compact />
                  <StageRadar radar={preview.radar} brands={catalog?.brands} />
                </motion.div>
              ) : (
                <div className="border-2 border-dashed border-black p-8 text-center text-sm font-bold"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Building bundle preview…</div>
              )}
            </div>
          </div>
        )}

        {/* ── Discovery ── */}
        {tab === "discover" && (
          <form onSubmit={discover} className="max-w-2xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] space-y-4">
            <div>
              <h2 className="text-lg font-black uppercase">Find specifiers</h2>
              <p className="text-xs font-semibold text-muted-foreground">NERVE searches the web for real firms in this segment and city (read-only, about 20 seconds), researches each one and runs the full pipeline on it. If live research is off, it uses fictional sample firms instead.</p>
            </div>
            <Link to="/dashboard/autopilot" className="flex items-center gap-2 border-2 border-black bg-[#FFDA5C] px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]">
              <Radar className="size-4 shrink-0" />
              <span>Want NERVE to find firms from live news (project launches, hotel signings, fit-outs) on a schedule, with cost limits? Use <b>Autopilot</b>.</span>
              <ArrowRight className="size-4 ml-auto shrink-0" />
            </Link>
            <div className="space-y-1.5">
              <Label>Segment</Label>
              <select className={selectCls} value={discSegment} onChange={(e) => setDiscSegment(e.target.value as Segment)}>
                {Object.entries(catalog?.segments || {}).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Cities</Label>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => {
                  const on = discCities.includes(c);
                  return (
                    <button type="button" key={c} onClick={() => setDiscCities(on ? discCities.filter((x) => x !== c) : [...discCities, c])} className={`border-2 border-black px-2.5 py-1 text-xs font-bold ${on ? "bg-black text-white" : "bg-white"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>How many firms</Label>
              <input type="range" min={1} max={6} value={discCount} onChange={(e) => setDiscCount(Number(e.target.value))} className="w-full accent-[#EA435F]" />
              <p className="text-xs font-black">{discCount} firm{discCount > 1 ? "s" : ""}</p>
            </div>
            <SendingBanner compact context="messages" />
            <button type="submit" disabled={loading || discCities.length === 0} className="w-full h-11 bg-primary text-white font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0_0_#000] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Discover & launch
            </button>
          </form>
        )}

        {/* ── Quick Capture (F4) ── */}
        {tab === "capture" && (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5 items-start">
            <div className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] space-y-4" data-tour="capture">
              <div>
                <h2 className="text-lg font-black uppercase flex items-center gap-2"><ClipboardPaste className="size-5" /> Quick Capture</h2>
                <p className="text-xs font-semibold text-muted-foreground">Paste a WhatsApp chat export, business-card text or meeting notes from a site visit or exhibition. NERVE extracts the lead, you review it, then launch.</p>
              </div>
              <Textarea rows={10} value={captureText} onChange={(e) => setCaptureText(e.target.value)} placeholder="Paste text here…" className="font-mono text-xs" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={extract} disabled={loading || captureText.trim().length < 15} className="h-10 px-5 bg-primary text-white font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0_0_#000] disabled:opacity-50 flex items-center gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Extract lead
                </button>
                <button type="button" onClick={() => setCaptureText(SAMPLE_CAPTURE)} className="h-10 px-4 bg-white font-black uppercase text-xs border-2 border-black">
                  Use sample chat
                </button>
              </div>
            </div>
            <div className="border-2 border-black bg-[#1A1A18] text-white p-5 shadow-[4px_4px_0_0_#000] space-y-2 text-sm">
              <p className="font-black uppercase text-xs tracking-widest text-secondary">Pairs with HoloCron</p>
              <p className="text-white/80 text-xs leading-relaxed">Inbound capture tools turn exhibition chats into leads. Quick Capture takes the same raw text one step further: straight into enrichment, scoring, a brand bundle and a stage-timed outreach cadence.</p>
              <ul className="text-xs text-white/70 list-disc pl-4 space-y-1">
                <li>Detects firm, contact, city, segment, project type & stage</li>
                <li>Maps product mentions ("facade screens", "bath fittings") to AllHome brands</li>
                <li>Only keeps emails/phones that literally appear in the text</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
