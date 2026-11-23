import { motion, type TargetAndTransition, type Transition } from "framer-motion";

/**
 * An architect's elevation, drawn stage by stage: setting-out lines, structure, services,
 * glazing and finishes. It is a representation of the project's stage, so it stays quiet:
 * thin line weights, drafting conventions (grid bubbles, levels, dimensions) and flat fills.
 */
type Anim = { initial: false; animate: TargetAndTransition; transition: Transition };

const draw = (on: boolean, delay = 0, reduced = false): Anim => ({
  initial: false,
  animate: on ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
  transition: reduced ? { duration: 0 } : { pathLength: { duration: on ? 0.8 : 0.2, delay: on ? delay : 0, ease: "easeInOut" }, opacity: { duration: 0.2, delay: on ? delay : 0 } },
});

const rise = (on: boolean, delay = 0, reduced = false): Anim => ({
  initial: false,
  animate: on ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.15 },
  transition: reduced ? { duration: 0 } : { duration: on ? 0.4 : 0.15, delay: on ? delay : 0, ease: "easeOut" },
});

const LEVELS = [250, 190, 130, 70]; // ground, L1, L2, roof (y)
const LEVEL_LABELS = ["+0.00", "+3.60", "+7.20", "+10.80"];
const COLS = [70, 156, 244, 330];
const BAYS: Array<[number, number]> = [[76, 150], [162, 238], [250, 324]];
const INK = "#1a1a1a";

export function BuildingSvg({ stage, reduced = false }: { stage: number; reduced?: boolean }) {
  const s = (n: number) => stage >= n;
  return (
    <svg viewBox="0 0 420 300" role="img" aria-label="Elevation of the building at the current construction stage" className="w-full h-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <defs>
        <pattern id="earth" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth="0.8" opacity="0.35" />
        </pattern>
        <pattern id="feature" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#EF4444" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="#000" strokeWidth="1" opacity="0.25" />
        </pattern>
      </defs>

      {/* Column grid bubbles and the overall dimension: always present, they set the drawing out */}
      <g fill="none" stroke={INK} strokeWidth="0.8" opacity="0.55">
        {COLS.map((x, i) => (
          <g key={x}>
            <line x1={x} y1="30" x2={x} y2="62" strokeDasharray="2 3" />
            <circle cx={x} cy="20" r="8" fill="#fff" />
            <text x={x} y="23.5" textAnchor="middle" fontSize="9" fontWeight="600" fill={INK} stroke="none">{"ABCD"[i]}</text>
          </g>
        ))}
      </g>

      {/* Levels on the right */}
      <g opacity="0.6">
        {LEVELS.map((y, i) => (
          <g key={y}>
            <line x1="336" y1={y} x2="372" y2={y} stroke={INK} strokeWidth="0.7" strokeDasharray="3 3" />
            <path d={`M372 ${y} l5 -5 h-10 z`} fill={INK} />
            <text x="383" y={y + 3} fontSize="8.5" fontWeight="600" fill={INK}>{LEVEL_LABELS[i]}</text>
          </g>
        ))}
      </g>

      {/* 0 · Concept & design: setting-out outline and dimensions */}
      <g fill="none" stroke={INK} strokeWidth="1.1" strokeDasharray="4 4" opacity={s(1) ? 0.22 : 0.85}>
        <motion.path d="M70 250 V70 H330 V250" {...draw(s(0), 0, reduced)} />
        <motion.path d="M70 190 H330 M70 130 H330" {...draw(s(0), 0.25, reduced)} />
      </g>
      <g stroke={INK} strokeWidth="0.8" fill="none" opacity={s(1) ? 0.35 : 0.8}>
        <motion.path d="M40 70 V250 M36 70 h8 M36 250 h8" {...draw(s(0), 0.45, reduced)} />
      </g>
      <motion.text x="31" y="160" fontSize="8.5" fontWeight="600" fill={INK} textAnchor="middle" transform="rotate(-90 31 160)" initial={false} animate={{ opacity: s(0) ? (s(1) ? 0.4 : 0.8) : 0 }}>
        10.8 m
      </motion.text>

      {/* 1 · Structure: slabs and columns */}
      <g fill={INK}>
        {LEVELS.slice(1).map((y, i) => (
          <motion.rect key={y} x="66" y={y - 4} width="268" height="5" style={{ originY: 1, originX: 0.5 }} {...rise(s(1), 0.1 + i * 0.12, reduced)} />
        ))}
        {COLS.map((x, i) => (
          <motion.rect key={x} x={x - 2.5} y="70" width="5" height="180" style={{ originY: 1 }} {...rise(s(1), i * 0.07, reduced)} />
        ))}
      </g>

      {/* 2 · MEP: riser, conduit and light points */}
      <g fill="none" strokeLinecap="round">
        <motion.path d="M318 250 V78 M318 232 H292 M318 172 H292 M318 112 H292" stroke="#14B8A6" strokeWidth="2.4" {...draw(s(2), 0, reduced)} />
        <motion.path d="M80 80 H240 M80 140 H240 M80 200 H240" stroke="#F59E0B" strokeWidth="1.6" strokeDasharray="1 5" {...draw(s(2), 0.3, reduced)} />
      </g>
      {[80, 140, 200]
        .flatMap((y) => [113, 200].map((x) => ({ x, y })))
        .map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.y + 7} r="3.6" fill="#F59E0B" stroke={INK} strokeWidth="1.2" {...rise(s(2), 0.5 + i * 0.04, reduced)} />
        ))}

      {/* 3 · Interiors & fit-out: glazing and the entrance */}
      {LEVELS.slice(0, 3).map((yBottom, f) => {
        const yTop = LEVELS[f + 1];
        return BAYS.map(([x1, x2], b) =>
          f === 0 && b === 1 ? null : (
            <motion.g key={`${f}-${b}`} style={{ originY: 1 }} {...rise(s(3), 0.04 * (f * 3 + b), reduced)}>
              <rect x={x1} y={yTop + 18} width={x2 - x1} height={yBottom - yTop - 26} fill="#CEEBFC" stroke={INK} strokeWidth="1.4" />
              <line x1={(x1 + x2) / 2} y1={yTop + 18} x2={(x1 + x2) / 2} y2={yBottom - 8} stroke={INK} strokeWidth="1.1" />
              <line x1={x1} y1={yTop + 30} x2={x2} y2={yTop + 30} stroke={INK} strokeWidth="0.7" opacity="0.5" />
            </motion.g>
          )
        );
      })}
      <motion.g style={{ originY: 1 }} {...rise(s(3), 0.35, reduced)}>
        <rect x="180" y="206" width="40" height="44" fill="#fff" stroke={INK} strokeWidth="1.4" />
        <line x1="200" y1="206" x2="200" y2="250" stroke={INK} strokeWidth="1" />
        <rect x="193" y="226" width="3" height="10" fill="#8B5CF6" />
        <rect x="204" y="226" width="3" height="10" fill="#EC4899" />
      </motion.g>

      {/* 4 · Finishing: metal fins, a feature wall and the parapet */}
      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.rect key={i} x={338 + i * 5} y="70" width="2.4" height="180" fill="#6B7280" style={{ originY: 1 }} {...rise(s(4), i * 0.05, reduced)} />
        ))}
        <motion.rect x="76" y="198" width="38" height="52" fill="url(#feature)" stroke={INK} strokeWidth="1" style={{ originY: 1 }} {...rise(s(4), 0.25, reduced)} />
        <motion.rect x="66" y="60" width="268" height="7" fill="#FFDA5C" stroke={INK} strokeWidth="1" style={{ originY: 1 }} {...rise(s(4), 0.45, reduced)} />
      </g>

      {/* Ground and earth hatch */}
      <rect x="22" y="250" width="376" height="20" fill="url(#earth)" />
      <line x1="22" y1="250" x2="398" y2="250" stroke={INK} strokeWidth="2" />
      <text x="22" y="290" fontSize="8.5" fontWeight="600" fill={INK} opacity="0.5">Front elevation, not to scale</text>
    </svg>
  );
}
