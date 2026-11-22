/**
 * Icons for the ten-agent pipeline, drawn for NERVE: 24px grid, 2px black strokes,
 * square joins and one flat accent each, matching the neo-brutalist UI.
 */
type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#000",
  strokeWidth: 2,
  strokeLinejoin: "miter" as const,
  strokeLinecap: "square" as const,
  "aria-hidden": true,
});

/** 1 · Research the firm and its project: a building with a findings tag */
export function IconEnrich({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="6" width="11" height="15" fill="#fff" />
      <path d="M6 10h2M10 10h1M6 14h2M10 14h1M6 18h2M10 18h1" />
      <path d="M14 11h6v10h-6" fill="#CEEBFC" />
      <circle cx="17" cy="5" r="2.6" fill="#FFDA5C" />
    </svg>
  );
}

/** 2 · Project signals: a source broadcasting */
export function IconSignals({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="7" cy="17" r="2.5" fill="#EA435F" />
      <path d="M7 10.5a6.5 6.5 0 0 1 6.5 6.5" />
      <path d="M7 5a12 12 0 0 1 12 12" />
    </svg>
  );
}

/** 3 + 4 · Intent score and persona: a dial */
export function IconIntent({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 17a9 9 0 0 1 18 0z" fill="#fff" />
      <path d="M3 17a9 9 0 0 1 5-8" stroke="#599D77" strokeWidth="3" />
      <path d="M12 17l4.5-6" />
      <circle cx="12" cy="17" r="1.6" fill="#000" />
    </svg>
  );
}

/** 5 · Brand bundle and timing: stacked brand swatches */
export function IconBundle({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="3" width="10" height="10" fill="#0EA5E9" />
      <rect x="7" y="7" width="10" height="10" fill="#F59E0B" />
      <rect x="11" y="11" width="10" height="10" fill="#14B8A6" />
    </svg>
  );
}

/** 6 + 7 · Content and explanation: a drafted message */
export function IconContent({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 4h18v12H10l-5 4v-4H3z" fill="#fff" />
      <path d="M7 8h10M7 12h6" />
      <rect x="15" y="10.5" width="3" height="3" fill="#EA435F" stroke="none" />
    </svg>
  );
}

/** 8 · Delivery on WhatsApp, email and LinkedIn: a paper plane */
export function IconSend({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 11L21 3l-6 18-4-7z" fill="#fff" />
      <path d="M11 14l10-11" />
      <path d="M11 14v6l3-3" fill="#FFDA5C" />
    </svg>
  );
}

/** 9 · Reply classified, visit booked: a pin at the experience centre */
export function IconVisit({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" fill="#EA435F" />
      <circle cx="12" cy="10" r="2.6" fill="#fff" />
    </svg>
  );
}

/** 10 · Learning loop: scoring weights rising with every outcome */
export function IconLearn({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="15" width="4.5" height="6" fill="#fff" />
      <rect x="9.75" y="11" width="4.5" height="10" fill="#FFDA5C" />
      <rect x="16.5" y="7" width="4.5" height="14" fill="#599D77" />
      <path d="M3 10l6-5 3 2.5L19 2" />
      <path d="M15 2h4v4" />
    </svg>
  );
}
