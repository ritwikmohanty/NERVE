import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Cpu, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Segment } from "@/lib/types";

const STEPS = ["Workspace", "Brands", "Segments", "Cities"] as const;

export default function OnboardingPage() {
  const { session, catalog, updateOrg } = useAuth();
  const navigate = useNavigate();
  const s = session!.org.settings;
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState(session!.org.name);
  const [senderName, setSenderName] = useState(s.senderName);
  const [senderTitle, setSenderTitle] = useState(s.senderTitle);
  const [brands, setBrands] = useState<string[]>(s.brands);
  const [segments, setSegments] = useState<Segment[]>(s.segments);
  const [cities, setCities] = useState<string[]>(s.cities);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const canNext = step === 0 ? !!orgName.trim() && !!senderName.trim() : step === 1 ? brands.length > 0 : step === 2 ? segments.length > 0 : cities.length > 0;

  async function finish() {
    setSaving(true);
    setError("");
    try {
      await updateOrg({ name: orgName, settings: { brands, segments, cities, senderName, senderTitle, onboarded: true } });
      navigate("/dashboard?tour=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setSaving(false);
    }
  }

  const centreCount = (city: string) => catalog?.centres.filter((c) => c.city === city).length || 0;

  return (
    <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center">
            <Cpu className="size-5 text-white" />
          </div>
          <div>
            <p className="font-black uppercase">Set up your workspace</p>
            <p className="text-xs font-bold text-muted-foreground">Takes under a minute — you can change all of this later in Settings</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className={`border-2 border-black px-2 py-2 text-[11px] font-black uppercase flex items-center gap-2 ${i === step ? "bg-secondary shadow-[2px_2px_0_0_#000]" : i < step ? "bg-[#599D77] text-white" : "bg-white"}`}>
              <span className="size-5 shrink-0 border-2 border-black bg-white text-black flex items-center justify-center text-[10px]">{i < step ? <Check className="size-3" /> : i + 1}</span>
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        <div className="border-2 border-black bg-white p-5 sm:p-7 shadow-[4px_4px_0_0_#000] min-h-[340px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-black uppercase">Who's reaching out?</h2>
                    <p className="text-sm text-muted-foreground">Messages are signed with this name — specifiers reply to people, not brands.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="org">Company</Label>
                    <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sn">Sender name</Label>
                      <Input id="sn" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="st">Sender title</Label>
                      <Input id="st" value={senderTitle} onChange={(e) => setSenderTitle(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black uppercase">Which brands do you sell?</h2>
                    <p className="text-sm text-muted-foreground">The bundler only recommends brands you pick here.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(catalog?.brands || []).map((b) => {
                      const on = brands.includes(b.id);
                      return (
                        <button key={b.id} type="button" onClick={() => toggle(brands, b.id, setBrands)} className={`text-left border-2 border-black p-3 transition-all ${on ? "bg-accent shadow-[3px_3px_0_0_#000]" : "bg-white opacity-70 hover:opacity-100"}`}>
                          <div className="flex items-center gap-2">
                            <span className="size-3 rounded-full border border-black" style={{ background: b.color }} />
                            <span className="font-black text-sm">{b.name}</span>
                            <span className={`ml-auto size-5 border-2 border-black flex items-center justify-center ${on ? "bg-black text-white" : "bg-white"}`}>{on && <Check className="size-3" />}</span>
                          </div>
                          <p className="text-[11px] font-semibold text-muted-foreground mt-1">{b.tagline}</p>
                          <p className="text-[10px] mt-1.5 line-clamp-1">{b.productLines.join(" · ")}</p>
                        </button>
                      );
                    })}
                    {!catalog && <p className="text-sm flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading catalog…</p>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black uppercase">Who should NERVE target?</h2>
                    <p className="text-sm text-muted-foreground">Specifiers (B2B) drive most premium purchases; homeowners (B2C) are the end buyers.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {catalog &&
                      (Object.entries(catalog.segments) as Array<[Segment, { label: string; market: string; description: string }]>).map(([id, seg]) => {
                        const on = segments.includes(id);
                        return (
                          <button key={id} type="button" onClick={() => toggle(segments, id, setSegments)} className={`text-left border-2 border-black p-3 transition-all ${on ? "bg-accent shadow-[3px_3px_0_0_#000]" : "bg-white opacity-70 hover:opacity-100"}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 border-2 border-black ${seg.market === "B2B" ? "bg-[#CEEBFC]" : "bg-secondary"}`}>{seg.market}</span>
                              <span className="font-black text-sm">{seg.label}</span>
                              <span className={`ml-auto size-5 border-2 border-black flex items-center justify-center ${on ? "bg-black text-white" : "bg-white"}`}>{on && <Check className="size-3" />}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1">{seg.description}</p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-black uppercase">Priority cities</h2>
                    <p className="text-sm text-muted-foreground">Cities with AllHome experience centres convert best — visits are booked at the nearest one.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...(catalog?.cities || []), "Pune", "Bengaluru", "Ahmedabad"])).sort().map((city) => {
                      const on = cities.includes(city);
                      const n = centreCount(city);
                      return (
                        <button key={city} type="button" onClick={() => toggle(cities, city, setCities)} className={`border-2 border-black px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all ${on ? "bg-black text-white shadow-[2px_2px_0_0_#EA435F]" : "bg-white hover:bg-muted"}`}>
                          <MapPin className="size-3" /> {city}
                          {n > 0 && <span className={`text-[9px] px-1 border ${on ? "border-white" : "border-black"}`}>{n} centre{n > 1 ? "s" : ""}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && <p className="text-xs font-bold text-white bg-destructive border-2 border-black px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="h-10 px-4 border-2 border-black bg-white font-black uppercase text-xs flex items-center gap-1 disabled:opacity-30">
            <ChevronLeft className="size-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="h-10 px-5 border-2 border-black bg-primary text-white font-black uppercase text-xs shadow-[3px_3px_0_0_#000] flex items-center gap-1 disabled:opacity-40">
              Next <ChevronRight className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={!canNext || saving} className="h-10 px-5 border-2 border-black bg-[#599D77] text-white font-black uppercase text-xs shadow-[3px_3px_0_0_#000] flex items-center gap-2 disabled:opacity-40">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Launch workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
