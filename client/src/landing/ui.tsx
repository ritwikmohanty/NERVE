import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Display face: Archivo at its widest, like lettering on a site hoarding. */
export const display = "font-display";

/** Section shell: consistent gutters and max width. */
export function Section({ id, className = "", children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 sm:px-8 ${className}`}>
      <div className="mx-auto max-w-[1180px]">{children}</div>
    </section>
  );
}

export function SectionHead({ title, lead, className = "" }: { title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={`max-w-[720px] ${className}`}>
      <h2 className={`${display} text-[clamp(1.9rem,4vw,3.1rem)] font-[850] leading-[1.02] tracking-[-0.02em]`}>{title}</h2>
      {lead && <p className="mt-4 text-[1.05rem] leading-[1.6] text-black/70 max-w-[62ch]">{lead}</p>}
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 h-12 px-6 border-[3px] border-black rounded-[6px] text-[0.95rem] font-extrabold transition-[transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30 disabled:opacity-70";
const btnShadow = "shadow-[4px_4px_0_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#000]";

export function ButtonLink({ to, href, variant = "white", children }: { to?: string; href?: string; variant?: "red" | "white" | "yellow"; children: ReactNode }) {
  const color = variant === "red" ? "bg-[#EA435F] text-white" : variant === "yellow" ? "bg-[#FFDA5C] text-black" : "bg-white text-black";
  const cls = `${btnBase} ${btnShadow} ${color}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <Link to={to || "/"} className={cls}>{children}</Link>;
}

/**
 * One click into the shared demo workspace. The API runs on a free tier that sleeps,
 * so the first request can take up to a minute: the button says so instead of looking stuck.
 */
export function DemoButton({ variant = "red", label = "Open the live demo" }: { variant?: "red" | "white" | "yellow"; label?: string }) {
  const { session, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const color = variant === "red" ? "bg-[#EA435F] text-white" : variant === "yellow" ? "bg-[#FFDA5C] text-black" : "bg-white text-black";

  async function open() {
    if (session) return navigate("/dashboard");
    setError("");
    setBusy(true);
    const t = setTimeout(() => setSlow(true), 4000);
    try {
      await loginDemo();
      navigate("/dashboard?tour=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the demo. Try again in a few seconds.");
    } finally {
      clearTimeout(t);
      setBusy(false);
      setSlow(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button type="button" onClick={open} disabled={busy} className={`${btnBase} ${btnShadow} ${color}`}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {session ? "Go to your dashboard" : busy ? (slow ? "Waking the server…" : "Opening the demo…") : label}
      </button>
      {slow && <span className="text-[12px] font-semibold text-black/60">The free server sleeps when idle. This can take up to a minute.</span>}
      {error && <span role="alert" className="text-[12px] font-bold text-[#C8263E]">{error}</span>}
    </span>
  );
}

/** Small brand swatch used across sections. */
export function Swatch({ color, size = 10 }: { color: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 border-2 border-black" style={{ width: size, height: size, background: color }} />;
}
