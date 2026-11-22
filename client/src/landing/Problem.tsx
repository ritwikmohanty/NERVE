import { Section, display } from "./ui";

const POINTS = [
  {
    title: "They decide at one stage, and then it's gone",
    body: "Facades and windows are locked while the structure goes up. Bath fittings and lighting are chosen at MEP and fit-out. A pitch one stage late is a pitch for their next project.",
    answer: "NERVE works out the project's stage and pitches the brands whose window is open now, then times the next message to the brand after that.",
  },
  {
    title: "They juggle a vendor for every category",
    body: "Facade, windows, lighting, bath, hardware and finishes usually come from different suppliers, each with its own schedule and after-sales.",
    answer: "Every message leads with one brand but sells the collective: one relationship, one palette, one point of after-sales.",
  },
  {
    title: "They specify what they've seen in person",
    body: "A PDF rarely moves a specifier. Seeing the panel, the finish or the fitting does.",
    answer: "The ask is always a short visit to the nearest experience centre, or a sample kit when the nearest one is in another city.",
  },
];

export function Problem() {
  return (
    <Section className="py-16 sm:py-24 border-t-[3px] border-black">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
        <div>
          <h2 className={`${display} text-[clamp(1.7rem,3.2vw,2.6rem)] font-[850] leading-[1.05] tracking-[-0.02em]`}>
            In home improvement, the person who decides isn't the person who pays.
          </h2>
          <figure className="mt-8 border-l-[6px] border-[#EA435F] pl-5">
            <blockquote className="text-[1.15rem] leading-[1.55] font-semibold">
              Architects, designers and contractors influence most purchase decisions, the way doctors do in healthcare.
            </blockquote>
            <figcaption className="mt-2 text-[13px] font-semibold text-black/60">Paraphrasing AllHome co-founder Hardik Dedhia</figcaption>
          </figure>
        </div>
        <ul className="space-y-4">
          {POINTS.map((p) => (
            <li key={p.title} className="border-[3px] border-black rounded-[10px] bg-white overflow-hidden">
              <div className="p-5">
                <h3 className="text-[1.1rem] font-black leading-snug">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-black/70">{p.body}</p>
              </div>
              <p className="px-5 py-3.5 border-t-2 border-black bg-[#FFF5CC] text-[14.5px] leading-[1.55] font-semibold">{p.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
