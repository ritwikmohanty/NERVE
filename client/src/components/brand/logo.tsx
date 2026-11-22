/**
 * The NERVE mark: an "N" built like a structure (two columns and a diagonal brace) on the
 * app's red tile, with a yellow node where the brace lands: the signal NERVE acts on.
 * Same geometry as public/favicon.svg, so the browser tab and the app always match.
 */
export function NerveMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="NERVE" className={`shrink-0 ${className}`}>
      <rect x="4" y="4" width="26" height="26" rx="5" fill="#000" />
      <rect x="1.5" y="1.5" width="26" height="26" rx="5" fill="#EA435F" stroke="#000" strokeWidth="2.5" />
      <path d="M9 21.5V8.5L19.5 21.5V8.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="square" strokeLinejoin="miter" />
      <circle cx="19.5" cy="8.5" r="3.3" fill="#FFDA5C" stroke="#000" strokeWidth="1.8" />
    </svg>
  );
}

/** Mark plus wordmark. `tone="dark"` is for use on black backgrounds. */
export function NerveLogo({ size = 36, sub = "for AllHome", tone = "light" }: { size?: number; sub?: string | null; tone?: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2.5">
      <NerveMark size={size} />
      <span className="leading-none">
        <span className={`font-display block font-[900] tracking-[-0.02em] ${tone === "dark" ? "text-white" : "text-black"}`} style={{ fontSize: Math.round(size * 0.55) }}>
          NERVE
        </span>
        {sub && <span className={`block text-[10.5px] font-bold mt-1 ${tone === "dark" ? "text-white/60" : "text-black/60"}`}>{sub}</span>}
      </span>
    </span>
  );
}
