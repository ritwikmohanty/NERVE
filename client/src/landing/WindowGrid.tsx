import { useState } from "react";
import { BRANDS, STAGES, type StageId } from "./data";
import { Section, SectionHead, Swatch } from "./ui";

export function WindowGrid() {
  const [focus, setFocus] = useState<StageId | null>("structure");
  const pitched = focus ? BRANDS.filter((b) => b.specifyAt.includes(focus)) : [];
  return (
    <Section id="windows" className="py-16 sm:py-24">
      <SectionHead
        title="Every brand has a window. NERVE pitches inside it."
        lead="Each AllHome brand is specified at particular construction stages. NERVE reads the project's stage, leads with the brands whose window is open, and times the next touch to the brand that comes after."
      />

      <div className="mt-10 border-[3px] border-black rounded-[10px] bg-white shadow-[8px_8px_0_0_#000] overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse table-fixed">
          <caption className="sr-only">Construction stages at which each AllHome brand is usually specified</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left px-4 py-3 text-[13px] font-black border-b-[3px] border-black w-[230px]">Brand</th>
              {STAGES.map((st) => (
                <th key={st.id} scope="col" className="border-b-[3px] border-l-2 border-black p-0">
                  <button
                    type="button"
                    onClick={() => setFocus(focus === st.id ? null : st.id)}
                    aria-pressed={focus === st.id}
                    className={`w-full px-2 py-3 text-[12.5px] font-extrabold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-black/30 ${
                      focus === st.id ? "bg-black text-white" : "hover:bg-[#FFF5CC]"
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
                <th scope="row" className="text-left px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[14px] font-black">
                    <Swatch color={b.color} size={12} /> {b.name}
                  </span>
                  <span className="block text-[12px] font-semibold text-black/55 mt-0.5">{b.category}</span>
                </th>
                {STAGES.map((st) => {
                  const on = b.specifyAt.includes(st.id);
                  const lit = focus === st.id;
                  return (
                    <td key={st.id} className={`relative border-l-2 border-black p-1.5 ${lit ? "bg-[#FFF5CC]" : ""}`}>
                      {on ? (
                        <span
                          className={`block h-9 rounded-[5px] border-2 border-black transition-transform ${lit ? "shadow-[3px_3px_0_0_#000] -translate-y-[1px]" : ""}`}
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

      <p className="mt-6 text-[15px] font-semibold max-w-[70ch]" aria-live="polite">
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
