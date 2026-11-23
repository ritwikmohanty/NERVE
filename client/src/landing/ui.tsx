import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Landing design system: the page is laid out like a drawing sheet. Hairline rails frame the
 * content, full-width rules separate sections and small registration crosses mark the corners.
 * Heavy borders and hard shadows are kept for things you can press and for the product frames.
 */
export const display = "font-display";
export const headline = "font-headline";
export const RULE = "border-black/[0.12]";

/** Small drafting cross used at the corners of a section. */
function Cross({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 11 11" className={`absolute size-[11px] ${className}`}>
      <path d="M5.5 0v11M0 5.5h11" stroke="#000" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

/** A full-width band with framed content, rules and registration marks. */
export function Section({ id, className = "", inner = "", tone = "", children, marks = true }: { id?: string; className?: string; inner?: string; tone?: string; children: ReactNode; marks?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-16 border-b ${RULE} ${tone} ${className}`}>
      <div className={`relative mx-auto max-w-[1200px] border-x ${RULE} px-5 sm:px-10 ${inner}`}>
        {marks && (
          <>
            <Cross className="-left-[6px] -top-[6px]" />
            <Cross className="-right-[6px] -top-[6px]" />
          </>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * Scroll-highlighted sentence: each word fills from grey to full ink as the heading moves up
 * the viewport. Off for people who prefer reduced motion.
 */
export function ScrollWords({ text, dim = 0.18, range = ["start 0.72", "start 0.32"] }: { text: string; dim?: number; range?: [string, string] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: range as never });
  if (reduced) return <span ref={ref}>{text}</span>;
  const words = text.split(" ");
  return (
    <span ref={ref}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} from={i / words.length} to={(i + 1) / words.length} dim={dim}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </Word>
      ))}
    </span>
  );
}

function Word({ progress, from, to, dim, children }: { progress: MotionValue<number>; from: number; to: number; dim: number; children: ReactNode }) {
  const opacity = useTransform(progress, [from, to], [dim, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

/** Two-tone heading: a statement in black, its continuation in grey, one size. */
export function SectionHead({ title, rest, lead, className = "", center = false }: { title: ReactNode; rest?: ReactNode; lead?: ReactNode; className?: string; center?: boolean }) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-[760px] ${className}`}>
      <h2 className={`${headline} text-[clamp(1.85rem,3.4vw,2.85rem)] font-[650] leading-[1.08] tracking-[-0.025em] text-balance`}>
        {typeof title === "string" ? <ScrollWords text={title} /> : title}
        {rest && <span className="text-black/45"> {rest}</span>}
      </h2>
      {lead && <p className={`mt-5 text-[1.05rem] leading-[1.65] text-black/65 max-w-[60ch] text-pretty ${center ? "mx-auto" : ""}`}>{lead}</p>}
    </div>
  );
}

/** A quiet label that names a block of content (sentence case, no tracking). */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[13px] font-semibold text-black/55 ${className}`}>{children}</p>;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 h-12 px-6 border-2 border-black rounded-[8px] text-[0.95rem] font-bold transition-[transform,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25 disabled:opacity-70";
const btnShadow = "shadow-[3px_3px_0_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#000]";
const tones = { red: "bg-[#EA435F] text-white", white: "bg-white text-black", yellow: "bg-[#FFDA5C] text-black", black: "bg-black text-white" } as const;

export function ButtonLink({ to, href, variant = "white", plain = false, children }: { to?: string; href?: string; variant?: keyof typeof tones; plain?: boolean; children: ReactNode }) {
  const cls = plain
    ? "inline-flex items-center h-12 px-2 text-[0.95rem] font-bold underline-offset-[6px] decoration-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25 rounded-[6px]"
    : `${btnBase} ${btnShadow} ${tones[variant]}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <Link to={to || "/"} className={cls}>{children}</Link>;
}

/** One click into the shared demo workspace. */
export function DemoButton({ variant = "red", label = "Open the live demo", size = "md" }: { variant?: keyof typeof tones; label?: string; size?: "sm" | "md" }) {
  const { session, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    if (session) return navigate("/dashboard");
    setError("");
    setBusy(true);
    try {
      await loginDemo();
      navigate("/dashboard?tour=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the demo. Try again in a few seconds.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button type="button" onClick={open} disabled={busy} className={`${btnBase} ${btnShadow} ${tones[variant]} ${size === "sm" ? "h-10 px-4 text-[0.9rem]" : ""}`}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {session ? "Go to your dashboard" : busy ? "Opening…" : label}
      </button>
      {error && <span role="alert" className="text-[12px] font-bold text-[#C8263E]">{error}</span>}
    </span>
  );
}

/** Small brand swatch used across sections. */
export function Swatch({ color, size = 10 }: { color: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-[2px] border-[1.5px] border-black" style={{ width: size, height: size, background: color }} />;
}

/** macOS-style window controls for the product frames (decorative). */
export function TrafficLights() {
  return (
    <span aria-hidden className="flex items-center gap-2">
      <span className="size-3 rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.25)]" />
      <span className="size-3 rounded-full bg-[#FEBC2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.25)]" />
      <span className="size-3 rounded-full bg-[#28C840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.25)]" />
    </span>
  );
}
