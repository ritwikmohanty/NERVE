import { motion, type TargetAndTransition, type Transition } from "framer-motion";

/**
 * A building drawn stage by stage: blueprint, structure, services, fit-out, finishes.
 * Each layer draws itself in when the project reaches its stage, so the picture always
 * matches the stage whose brands are lit up beside it.
 */
const draw = (on: boolean, delay = 0, reduced = false): { initial: false; animate: TargetAndTransition; transition: Transition } => ({
  initial: false,
  animate: on ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
  transition: reduced ? { duration: 0 } : { pathLength: { duration: on ? 0.9 : 0.25, delay: on ? delay : 0, ease: "easeInOut" }, opacity: { duration: 0.2, delay: on ? delay : 0 } },
});

const fade = (on: boolean, delay = 0, reduced = false): { initial: false; animate: TargetAndTransition; transition: Transition } => ({
  initial: false,
  animate: on ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.2 },
  transition: reduced ? { duration: 0 } : { duration: on ? 0.45 : 0.2, delay: on ? delay : 0, ease: "easeOut" },
});

const FLOORS = [290, 220, 150, 80]; // slab tops, ground to roof
const BAYS: Array<[number, number]> = [[90, 156], [170, 236], [250, 316]];
const COLS = [72, 156, 236, 320];

export function BuildingSvg({ stage, reduced = false }: { stage: number; reduced?: boolean }) {
  const s = (n: number) => stage >= n;
  return (
    <svg viewBox="0 0 400 320" role="img" aria-label="A building shown at the current construction stage" className="w-full h-auto">
      {/* site grid */}
      <defs>
        <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#000" opacity="0.12" />
        </pattern>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#EF4444" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#000" strokeWidth="1.5" opacity="0.35" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="400" height="320" fill="url(#grid)" />

      {/* 0 · Concept & design: the blueprint */}
      <g stroke="#000" strokeWidth="1.6" strokeDasharray="5 5" fill="none" opacity={s(1) ? 0.25 : 1}>
        <motion.path d="M68 290 V76 H324 V290" {...draw(s(0), 0, reduced)} />
        <motion.path d="M68 220 H324 M68 150 H324" {...draw(s(0), 0.3, reduced)} />
        <motion.path d="M156 290 V76 M236 290 V76" {...draw(s(0), 0.5, reduced)} />
      </g>
      <g stroke="#000" strokeWidth="1.5" fill="none" opacity={s(1) ? 0.3 : 1}>
        <motion.path d="M68 58 H324 M68 52 V64 M324 52 V64" {...draw(s(0), 0.7, reduced)} />
      </g>
      <motion.text x="196" y="48" textAnchor="middle" fontSize="11" fontWeight="800" fill="#000" initial={false} animate={{ opacity: s(0) && !s(1) ? 1 : 0 }}>
        26 m
      </motion.text>

      {/* 1 · Structure: columns and slabs */}
      <g fill="#000">
        {FLOORS.slice(1).map((y, i) => (
          <motion.rect key={y} x="64" y={y - 8} width="264" height="8" style={{ originY: 1, originX: 0.5 }} {...fade(s(1), 0.1 + i * 0.15, reduced)} />
        ))}
        {COLS.map((x, i) => (
          <motion.rect key={x} x={x} y="80" width="8" height="210" style={{ originY: 1 }} {...fade(s(1), i * 0.08, reduced)} />
        ))}
      </g>

      {/* 2 · MEP: water riser, conduit and light points */}
      <g fill="none" strokeLinecap="round">
        <motion.path d="M300 290 V88 M300 268 H262 M300 198 H262 M300 128 H262" stroke="#14B8A6" strokeWidth="4" {...draw(s(2), 0, reduced)} />
        <motion.path d="M88 86 H232 M88 156 H232 M88 226 H232" stroke="#F59E0B" strokeWidth="3" strokeDasharray="1 7" {...draw(s(2), 0.35, reduced)} />
      </g>
      {[86, 156, 226]
        .flatMap((y) => [118, 200].map((x) => ({ x, y })))
        .map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.y + 10} r="5.5" fill="#F59E0B" stroke="#000" strokeWidth="2" {...fade(s(2), 0.6 + i * 0.05, reduced)} />
        ))}

      {/* 3 · Interiors & fit-out: glazing, partitions, door hardware */}
      {FLOORS.slice(0, 3).map((yBottom, f) => {
        const yTop = FLOORS[f + 1];
        return BAYS.map(([x1, x2], b) =>
          f === 0 && b === 1 ? null : (
            <motion.g key={`${f}-${b}`} style={{ originY: 1 }} {...fade(s(3), 0.05 * (f * 3 + b), reduced)}>
              <rect x={x1} y={yTop + 22} width={x2 - x1} height={yBottom - yTop - 34} fill="#CEEBFC" stroke="#000" strokeWidth="2.5" />
              <line x1={(x1 + x2) / 2} y1={yTop + 22} x2={(x1 + x2) / 2} y2={yBottom - 12} stroke="#000" strokeWidth="2" />
            </motion.g>
          )
        );
      })}
      <motion.g style={{ originY: 1 }} {...fade(s(3), 0.4, reduced)}>
        <rect x="178" y="236" width="50" height="54" fill="#fff" stroke="#000" strokeWidth="2.5" />
        <rect x="216" y="258" width="5" height="14" fill="#8B5CF6" stroke="#000" strokeWidth="1.5" />
        <circle cx="191" cy="265" r="3.5" fill="#EC4899" stroke="#000" strokeWidth="1.5" />
      </motion.g>

      {/* 4 · Finishing: metal fins on the facade, a feature wall, the finished parapet */}
      <g>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.rect key={i} x={334 + i * 6} y="80" width="3.5" height="210" fill="#6B7280" stroke="#000" strokeWidth="1" style={{ originY: 1 }} {...fade(s(4), i * 0.06, reduced)} />
        ))}
        <motion.rect x="40" y="152" width="24" height="138" fill="url(#hatch)" stroke="#000" strokeWidth="2" style={{ originY: 1 }} {...fade(s(4), 0.3, reduced)} />
        <motion.rect x="64" y="62" width="264" height="10" fill="#FFDA5C" stroke="#000" strokeWidth="2" style={{ originY: 1 }} {...fade(s(4), 0.5, reduced)} />
      </g>

      {/* ground */}
      <line x1="14" y1="291" x2="386" y2="291" stroke="#000" strokeWidth="4" />
      <path d="M14 300 H386" stroke="#000" strokeWidth="1.5" strokeDasharray="2 6" />
    </svg>
  );
}
