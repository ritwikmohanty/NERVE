import { useState } from "react";
import { BRANDS, STAGES, type StageId } from "./data";
import { Section, SectionHead, Swatch } from "./ui";

export function WindowGrid() {
  const [focus, setFocus] = useState<StageId | null>("structure");
  const pitched = focus ? BRANDS.filter((b) => b.specifyAt.includes(focus)) : [];
  return (
    <Section id="windows" inner="py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 dots fade-corner opacity-80" />
      <SectionHead
        className="relative"
        title="Every brand has a window. NERVE pitches inside it."
        lead="Each brand is specified at particular construction stages. NERVE reads the project's stage, leads with the brands whose window is open, and times the next touch to the brand that comes after."
      />

      {/* Phones: stage buttons, then one six-cell bar per brand (the table below is for wider screens) */}
      <div className="relative mt-10 md:hidden">
        <div role="group" aria-label="Choose a stage" className="flex flex-wrap gap-2">
          {STAGES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFocus(focus === st.id ? null : st.id)}
              aria-pressed={focus === st.id}
              className={`rounded-full border-2 border-black px-3 py-1.5 text-[12.5px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25 ${focus === st.id ? "bg-black text-white" : "bg-white"}`}
            >
              {st.short}
            </button>
          ))}
        </div>
        <ul className="mt-5 rounded-[12px] border-2 border-black bg-white shadow-[5px_5px_0_0_#000] divide-y-2 divide-black">
          {BRANDS.map((b) => {
            const on = !!focus && b.specifyAt.includes(focus);
            return (
              <li key={b.id} className={`px-4 py-3 ${on ? "bg-[#FFF5CC]" : ""}`}>
                <div className="flex items-baseline gap-2">
                  <span className="flex items-center gap-2 text-[14px] font-bold">
                    <Swatch color={b.color} size={11} /> {b.name}
                  </span>
                  {on && <span className="ml-auto text-[11px] font-bold text-[#2F7A50]">Pitch now</span>}
                </div>
                <div className="mt-2.5 grid grid-cols-6 gap-1" aria-label={`${b.name} is usually specified at ${STAGES.filter((st) => b.specifyAt.includes(st.id)).map((st) => st.label.toLowerCase()).join(" and ")}`}>
                  {STAGES.map((st) => (
                    <span
                      key={st.id}
                      className={`h-3.5 rounded-[3px] ${b.specifyAt.includes(st.id) ? "border-2 border-black" : "border border-black/15"} ${focus === st.id ? "ring-2 ring-black ring-offset-1" : ""}`}
                      style={{ background: b.specifyAt.includes(st.id) ? b.color : "transparent" }}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11.5px] text-black/45">Bars run from concept and design (left) to handover (right).</p>
      </div>

      <div className="relative mt-12 hidden md:block rounded-[12px] border-2 border-black bg-white shadow-[6px_6px_0_0_#000] overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse table-fixed">
          <caption className="sr-only">Construction stages at which each AllHome brand is usually specified</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left px-5 py-3.5 text-[13px] font-bold border-b-2 border-black w-[200px] lg:w-[240px]">Brand</th>
              {STAGES.map((st) => (
                <th key={st.id} scope="col" className="border-b-2 border-l-2 border-black p-0">
                  <button
                    type="button"
                    onClick={() => setFocus(focus === st.id ? null : st.id)}
                    aria-pressed={focus === st.id}
                    className={`w-full px-2 py-3.5 text-[13px] font-bold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black ${
                      focus === st.id ? "bg-black text-white" : "text-black hover:bg-[#FFF5CC]"
                    }`}
                  >
                    {st.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BRANDS.map((b) => (
              <tr key={b.id} className="border-b-2 border-black last:border-b-0">
                <th scope="row" className="text-left px-5 py-3">
                  <span className="flex items-center gap-2 text-[14.5px] font-bold">
                    <Swatch color={b.color} size={12} /> {b.name}
                  </span>
                  <span className="block text-[12px] font-semibold text-black/55 mt-0.5">{b.category}</span>
                </th>
                {STAGES.map((st) => {
                  const on = b.specifyAt.includes(st.id);
                  const lit = focus === st.id;
                  return (
                    <td key={st.id} className={`relative border-l-2 border-black p-2 ${lit ? "bg-[#FFF5CC]/80 bg-[repeating-linear-gradient(135deg,rgb(0_0_0/0.05)_0_1px,transparent_1px_7px)]" : ""}`}>
                      {on ? (
                        <span
                          className={`block h-9 rounded-[6px] border-2 border-black transition-[box-shadow,transform] ${lit ? "shadow-[3px_3px_0_0_#000] -translate-x-[1px] -translate-y-[1px]" : ""}`}
                          style={{ background: b.color }}
                          title={`${b.name} is usually specified at ${st.label.toLowerCase()}`}
                        />
                      ) : (
                        <span className="block h-9" aria-hidden />
                      )}
                      <span className="sr-only">{on ? "Specified at this stage" : "Not at this stage"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative mt-5 hidden md:flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-medium text-black/55">
        <span className="flex items-center gap-2"><span className="h-3 w-6 rounded-[3px] border-2 border-black bg-[#6B7280]" /> Usually specified at this stage</span>
        <span className="flex items-center gap-2"><span className="h-3 w-6 rounded-[3px] border-2 border-black bg-[#FFF5CC] bg-[repeating-linear-gradient(135deg,rgb(0_0_0/0.08)_0_1px,transparent_1px_5px)]" /> The stage you selected</span>
      </div>
      <p className="relative mt-4 text-[15px] font-medium max-w-[72ch]" aria-live="polite">
        {focus
          ? pitched.length
            ? `At ${STAGES.find((s) => s.id === focus)!.label.toLowerCase()}, NERVE leads with ${pitched.map((b) => b.name).join(", ").replace(/, ([^,]*)$/, " and $1")}.`
            : "No brand is usually specified at this stage."
          : "Click a stage to see which brands NERVE leads with."}{" "}
        <span className="text-black/60 font-medium">Stages and lead times are planning estimates, and every spec sheet says so.</span>
      </p>
    </Section>
  );
}
