import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Loader2, PlayCircle, Sparkles, Building2, Ruler, Lightbulb, Bath, PaintBucket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BRANDS = [
  { name: "Metalia", c: "#6B7280" },
  { name: "The Window Factory", c: "#0EA5E9" },
  { name: "Ledlum", c: "#F59E0B" },
  { name: "House of W", c: "#14B8A6" },
  { name: "Fiamarc", c: "#8B5CF6" },
  { name: "Shapes", c: "#EC4899" },
  { name: "Colour Coats", c: "#EF4444" },
];

const POINTS = [
  { icon: Building2, text: "Finds the architects, designers & developers who decide what gets specified" },
  { icon: Ruler, text: "Pitches the right AllHome brands at the right construction stage" },
  { icon: Lightbulb, text: "Invites them to the nearest experience centre and books the visit" },
  { icon: Bath, text: "10 AI agents: enrich → signals → score → persona → strategy → content → deliver → learn" },
  { icon: PaintBucket, text: "Hands warm leads to Zoho CRM with full context" },
];

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { login, signup, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [name, setName] = useState("");
  const [company, setCompany] = useState("AllHome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("form");
    try {
      const s = mode === "login" ? await login(email, password) : await signup({ name, email, password, company });
      navigate(s.org.settings.onboarded ? next : "/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function demo() {
    setError("");
    setBusy("demo");
    try {
      await loginDemo();
      navigate("/dashboard?tour=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the demo workspace");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_1fr]">
      {/* ── Pitch panel ── */}
      <div className="hidden lg:flex flex-col justify-between border-r-2 border-black bg-[#1A1A18] text-white p-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-11 rounded-md bg-primary border-2 border-white flex items-center justify-center">
            <Cpu className="size-5" />
          </div>
          <div>
            <p className="font-black text-xl tracking-tight">NERVE</p>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">AllHome Edition</p>
          </div>
        </Link>

        <div className="space-y-7 max-w-lg">
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black leading-[1.1]">
            Hermes catches inbound enquiries.
            <span className="block text-secondary">NERVE goes out and creates them.</span>
          </motion.h1>
          <p className="text-white/70 text-sm leading-relaxed">
            In home improvement, architects, designers and contractors influence what gets bought, the way doctors do in pharma.
            NERVE is an autonomous outreach engine built for AllHome's collective of brands.
          </p>
          <ul className="space-y-3">
            {POINTS.map(({ icon: Icon, text }, i) => (
              <motion.li key={text} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 size-6 shrink-0 rounded border border-white/30 flex items-center justify-center">
                  <Icon className="size-3.5" />
                </span>
                {text}
              </motion.li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map((b) => (
              <span key={b.name} className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/25 flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: b.c }} /> {b.name}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-white/45">Prototype built for AllHome as part of an SDE interview. Not an official AllHome product. All prospect data in the demo is fictional.</p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <Cpu className="size-5" />
            <span className="font-black">NERVE · AllHome Edition</span>
          </div>

          {/* Demo first — the fastest way to see it working */}
          <button
            onClick={demo}
            disabled={!!busy}
            className="w-full text-left border-2 border-black bg-secondary p-5 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="size-11 border-2 border-black bg-white flex items-center justify-center shrink-0">
                {busy === "demo" ? <Loader2 className="size-5 animate-spin" /> : <PlayCircle className="size-5" />}
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-sm">Continue as AllHome demo</p>
                <p className="text-xs font-semibold text-black/70">One click. Eleven missions already run, with a guided tour.</p>
              </div>
              <ArrowRight className="size-5" />
            </div>
          </button>

          <div className="flex items-center gap-3 text-[11px] font-bold uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-black/20" /> or {mode === "login" ? "sign in" : "create your workspace"} <span className="h-px flex-1 bg-black/20" />
          </div>

          <form onSubmit={submit} className="space-y-4 border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-2xl font-black uppercase">{mode === "login" ? "Sign in" : "Create account"}</h2>
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : ""}
              />
            </div>
            {error && <p className="text-xs font-bold text-white bg-destructive border-2 border-black px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={!!busy}
              className="w-full h-11 bg-primary text-white font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy === "form" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {mode === "login" ? "Sign in" : "Create workspace"}
            </button>
            <p className="text-xs font-semibold text-center">
              {mode === "login" ? (
                <>New here? <Link className="underline font-black" to={`/signup${params.toString() ? `?${params}` : ""}`}>Create an account</Link></>
              ) : (
                <>Already have an account? <Link className="underline font-black" to="/login">Sign in</Link></>
              )}
            </p>
          </form>
          <p className="lg:hidden text-[11px] text-muted-foreground">Prototype built for AllHome. Not an official AllHome product. Demo data is fictional.</p>
        </motion.div>
      </div>
    </div>
  );
}
