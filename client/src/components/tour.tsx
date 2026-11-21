import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

export interface TourStep {
  target: string; // CSS selector, usually [data-tour="…"]
  title: string;
  body: string;
}

const doneKey = (tourId: string) => `nerve.tour.${tourId}.done`;
export const TOUR_EVENT = "nerve:start-tour";

// eslint-disable-next-line react-refresh/only-export-components
export function startTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

function readDone(tourId: string): boolean {
  try {
    return localStorage.getItem(doneKey(tourId)) === "1";
  } catch {
    return false;
  }
}
function writeDone(tourId: string) {
  try {
    localStorage.setItem(doneKey(tourId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * Lightweight spotlight tour — highlights an element and explains it.
 * Each page has its own `tourId`; it auto-opens on the first visit (or when `force`).
 */
export function Tour({ steps, tourId, autoStart = true, force = false }: { steps: TourStep[]; tourId: string; autoStart?: boolean; force?: boolean }) {
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (force || (autoStart && !readDone(tourId))) {
      const t = setTimeout(() => setIndex(0), 900); // let lazy pages render first
      return () => clearTimeout(t);
    }
  }, [autoStart, force, tourId]);

  useEffect(() => {
    const start = () => setIndex(0);
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, []);

  const step = index !== null ? steps[index] : null;

  const measure = useCallback(() => {
    if (!step) return;
    // First *visible* match (desktop nav is display:none on mobile)
    const el = Array.from(document.querySelectorAll(step.target)).find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure]);

  useEffect(() => {
    if (!step) return;
    window.addEventListener("resize", measure);
    const t = setInterval(measure, 400); // follow layout shifts / animations
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(t);
    };
  }, [step, measure]);

  const close = useCallback(() => {
    writeDone(tourId);
    setIndex(null);
  }, [tourId]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      // The guide owns these keys while open (the pipeline page also uses ← → for phases)
      if (["Escape", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => (i !== null && i < steps.length - 1 ? i + 1 : i));
      if (e.key === "ArrowLeft") setIndex((i) => (i ? i - 1 : i));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, steps.length, close]);

  if (!step || index === null) return null;

  const pad = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 32);
  let top = vh / 2 - 90;
  let left = vw / 2 - cardW / 2;
  if (rect) {
    const below = rect.bottom + 14;
    top = below + 190 < vh ? below : Math.max(16, rect.top - 204);
    left = Math.min(Math.max(16, rect.left), vw - cardW - 16);
    if (rect.right + cardW + 24 < vw && rect.width < 300) {
      left = rect.right + 16;
      top = Math.min(Math.max(16, rect.top), vh - 220);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Spotlight */}
      <div
        className="absolute transition-all duration-300 rounded-md pointer-events-none"
        style={
          rect
            ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", outline: "3px solid #FFDA5C" }
            : { inset: 0, background: "rgba(0,0,0,0.55)" }
        }
      />
      <div className="absolute inset-0" onClick={close} />
      <div className="absolute border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] transition-all duration-300" style={{ top, left, width: cardW }}>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-black uppercase border-2 border-black bg-secondary px-1.5">{index + 1}/{steps.length}</span>
          <p className="font-black text-sm uppercase flex-1">{step.title}</p>
          <button onClick={close} aria-label="Close tour"><X className="size-4" /></button>
        </div>
        <p className="text-xs font-semibold mt-2 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-3">
          <button onClick={close} className="text-[11px] font-black underline">Skip tour</button>
          <div className="flex gap-1.5">
            <button disabled={index === 0} onClick={() => setIndex(index - 1)} className="size-8 border-2 border-black flex items-center justify-center disabled:opacity-30" aria-label="Previous">
              <ArrowLeft className="size-4" />
            </button>
            {index < steps.length - 1 ? (
              <button onClick={() => setIndex(index + 1)} className="h-8 px-3 border-2 border-black bg-primary text-white text-xs font-black uppercase flex items-center gap-1">
                Next <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button onClick={close} className="h-8 px-3 border-2 border-black bg-[#599D77] text-white text-xs font-black uppercase">Got it</button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

