import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { NerveLogo } from "@/components/brand/logo";
import { IconBundle, IconContent, IconVisit } from "@/components/brand/pipeline-icons";
import { useAuth } from "@/lib/auth";

const BRANDS = [
  { name: "Metalia", c: "#6B7280" },
  { name: "The Window Factory", c: "#0EA5E9" },
  { name: "Ledlum", c: "#F59E0B" },
  { name: "House of W", c: "#14B8A6" },
  { name: "Fiamarc", c: "#8B5CF6" },
  { name: "Shapes", c: "#EC4899" },
  { name: "Colour Coats", c: "#EF4444" },
];

const field =
  "h-12 w-full border-[3px] border-black rounded-[6px] bg-white px-3.5 text-[15px] font-semibold outline-none transition-shadow placeholder:text-black/35 focus:shadow-[3px_3px_0_0_#000] focus-visible:ring-0";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { login, signup, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [name, setName] = useState("");
  const [company, setCompany] = useState("AllHome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("form");
    try {
      const s = isLogin ? await login(email, password) : await signup({ name, email, password, company });
      navigate(s.org.settings.onboarded ? next : "/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
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
      setError(err instanceof Error ? err.message : "Couldn't open the demo. Try again in a few seconds.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F5F2] text-black flex flex-col">
      <header className="h-[68px] px-4 sm:px-8 flex items-center border-b-[3px] border-black bg-[#F9F5F2]">
        <Link to="/" className="rounded-[4px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30">
          <NerveLogo size={38} />
        </Link>
        <Link to="/" className="ml-auto text-[14px] font-bold underline-offset-4 hover:underline">
          Back to the site
        </Link>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_1fr]">
        {/* ── Actions ── */}
        <main className="flex justify-center px-4 sm:px-8 py-10 sm:py-14">
          <div className="w-full max-w-[460px]">
            <h1 className="font-display text-[clamp(2rem,4vw,2.7rem)] font-[900] leading-[1] tracking-[-0.03em]">
              {isLogin ? "Sign in to NERVE." : "Create your workspace."}
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.55] text-black/70">
              {isLogin
                ? "Use your workspace account, or open the shared AllHome demo with no account at all."
                : "It takes a minute. Next you'll pick the brands you sell, your cities and what Autopilot should watch for."}
            </p>

            {/* Demo first: the quickest way to see NERVE working */}
            <div className="mt-7 border-[3px] border-black rounded-[10px] bg-[#FFDA5C] shadow-[6px_6px_0_0_#000] p-5">
              <h2 className="text-[1.15rem] font-black leading-tight">Open the AllHome demo</h2>
              <p className="mt-1.5 text-[14px] leading-[1.55] font-medium">
                Eleven missions already run, a finished Autopilot scan and a guide on every page. Nothing is ever sent from it.
              </p>
              <button
                type="button"
                onClick={demo}
                disabled={!!busy}
                className="mt-4 w-full h-12 inline-flex items-center justify-center gap-2 border-[3px] border-black rounded-[6px] bg-black text-white text-[15px] font-extrabold shadow-[3px_3px_0_0_#fff] hover:-translate-y-[1px] active:translate-y-[1px] transition-transform disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30"
              >
                {busy === "demo" && <Loader2 className="size-4 animate-spin" />}
                {busy === "demo" ? "Opening the demo…" : "Open the demo"}
              </button>
            </div>

            <div className="my-7 flex items-center gap-3 text-[13px] font-bold text-black/55">
              <span className="h-[2px] flex-1 bg-black/15" />
              {isLogin ? "or sign in with your account" : "or create your own workspace"}
              <span className="h-[2px] flex-1 bg-black/15" />
            </div>

            <form onSubmit={submit} className="border-[3px] border-black rounded-[10px] bg-white shadow-[6px_6px_0_0_#000] p-5 sm:p-6 space-y-4" noValidate={false}>
              {!isLogin && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-[13.5px] font-extrabold mb-1.5">Your name</span>
                    <input className={field} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                  </label>
                  <label className="block">
                    <span className="block text-[13.5px] font-extrabold mb-1.5">Company</span>
                    <input className={field} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
                  </label>
                </div>
              )}
              <label className="block">
                <span className="block text-[13.5px] font-extrabold mb-1.5">Work email</span>
                <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
              </label>
              <label className="block">
                <span className="block text-[13.5px] font-extrabold mb-1.5">Password</span>
                <span className="relative block">
                  <input
                    className={`${field} pr-12`}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? undefined : 8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder={isLogin ? "" : "At least 8 characters"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 grid place-items-center rounded-[4px] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              {error && (
                <p role="alert" className="text-[13.5px] font-bold border-[3px] border-black rounded-[6px] bg-[#FDE2E7] px-3 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!!busy}
                className="w-full h-12 inline-flex items-center justify-center gap-2 border-[3px] border-black rounded-[6px] bg-[#EA435F] text-white text-[15px] font-extrabold shadow-[4px_4px_0_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#000] transition-[transform,box-shadow] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30"
              >
                {busy === "form" && <Loader2 className="size-4 animate-spin" />}
                {isLogin ? "Sign in" : "Create workspace"}
              </button>

              <p className="text-[14px] font-semibold text-center pt-1">
                {isLogin ? (
                  <>
                    New here?{" "}
                    <Link className="font-extrabold underline underline-offset-4 decoration-2" to={`/signup${params.toString() ? `?${params}` : ""}`}>
                      Create a workspace
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Link className="font-extrabold underline underline-offset-4 decoration-2" to="/login">
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            </form>

            <p className="mt-6 text-[12.5px] font-medium text-black/55">
              A prototype built for AllHome. Not an official AllHome product. Demo firms and contacts are fictional.
            </p>
          </div>
        </main>

        {/* ── What's waiting inside: real items from the demo workspace ── */}
        <aside aria-label="What's in the demo" className="hidden lg:flex flex-col border-l-[3px] border-black bg-[#CEEBFC] relative overflow-hidden">
          <div className="flex h-3 border-b-[3px] border-black" aria-hidden>
            {BRANDS.map((b) => (
              <span key={b.name} className="flex-1" style={{ background: b.c }} />
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-center px-10 xl:px-16 py-12">
            <p className="text-[15px] font-extrabold">Waiting for you in the demo</p>
            <div className="mt-6 space-y-5 max-w-[460px]">
              <article className="border-[3px] border-black rounded-[10px] bg-[#E7F6EC] shadow-[6px_6px_0_0_#000] p-4 -rotate-[1.2deg]">
                <div className="flex items-center gap-2.5">
                  <span className="size-9 grid place-items-center border-2 border-black rounded-[5px] bg-white"><IconVisit /></span>
                  <p className="text-[15px] font-black">Visit booked</p>
                  <CalendarCheck className="ml-auto size-5" />
                </div>
                <p className="mt-2.5 text-[14px] leading-[1.5]">
                  Ishita Khanna from Studio Kaarva Architects asked to see the facade panels in person. NERVE booked her into the Window Factory experience centre in Mumbai.
                </p>
              </article>

              <article className="border-[3px] border-black rounded-[10px] rounded-tl-[2px] bg-white shadow-[6px_6px_0_0_#000] p-4 ml-8 rotate-[0.8deg]">
                <div className="flex items-center gap-2.5">
                  <span className="size-9 grid place-items-center border-2 border-black rounded-[5px] bg-[#F9F5F2]"><IconContent /></span>
                  <p className="text-[15px] font-black">WhatsApp draft for Arjun Reddy</p>
                </div>
                <p className="mt-2.5 text-[14px] leading-[1.5]">
                  “Congratulations on Meridian Skyline in Kokapet. While the design is still being finalised, this is when Metalia and The Window Factory are usually specified.”
                </p>
              </article>

              <article className="border-[3px] border-black rounded-[10px] bg-[#FFDA5C] shadow-[6px_6px_0_0_#000] p-4 -rotate-[0.6deg]">
                <div className="flex items-center gap-2.5">
                  <span className="size-9 grid place-items-center border-2 border-black rounded-[5px] bg-white"><IconBundle /></span>
                  <p className="text-[15px] font-black">Autopilot scan finished</p>
                </div>
                <p className="mt-2.5 text-[14px] leading-[1.5]">
                  Found 12 firms in the news and ranked them. The full pipeline ran on the top 3. The other 9 are shortlisted, one click away.
                </p>
              </article>
            </div>
          </div>

          <p className="px-10 xl:px-16 pb-8 text-[13px] font-semibold text-black/65">
            One collective, seven brands: {BRANDS.map((b) => b.name).join(", ").replace(/, ([^,]*)$/, " and $1")}.
          </p>
        </aside>
      </div>
    </div>
  );
}
