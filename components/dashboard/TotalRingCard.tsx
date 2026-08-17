export interface RingBadge {
  label: string;
  value: number;
  color: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const POSITION_CLASS: Record<RingBadge["position"], string> = {
  "top-left": "left-0 top-0 -translate-x-1/3 -translate-y-1/3",
  "top-right": "right-0 top-0 translate-x-1/3 -translate-y-1/3",
  "bottom-left": "left-0 bottom-0 -translate-x-1/3 translate-y-1/3",
  "bottom-right": "right-0 bottom-0 translate-x-1/3 translate-y-1/3",
};

export function TotalRingCard({ total, badges }: { total: number; badges: RingBadge[] }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[170px] w-[170px]">
        <svg viewBox="0 0 170 170" className="h-full w-full">
          <circle cx="85" cy="85" r="70" fill="none" stroke="#EEF0F3" strokeWidth="14" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-slate-700">{total}</span>
        </div>
        {badges.map((b) => (
          <div
            key={b.position}
            className={`absolute flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow ${POSITION_CLASS[b.position]}`}
            style={{ backgroundColor: b.color }}
          >
            {b.value}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] text-slate-600">
        {badges.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
