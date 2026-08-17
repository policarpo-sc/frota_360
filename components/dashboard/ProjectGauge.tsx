"use client";

const PROJECT_START = new Date(2026, 5, 1); // 01/06/2026
const PROJECT_END = new Date(2027, 0, 31); // 31/01/2027
const RADIUS = 100;
const CENTER_X = 120;
const CENTER_Y = 130;

function describeArc(): string {
  return `M 20 130 A ${RADIUS} ${RADIUS} 0 0 1 220 130`;
}

export function ProjectGauge() {
  const now = new Date();
  const totalMs = PROJECT_END.getTime() - PROJECT_START.getTime();
  const elapsedMs = now.getTime() - PROJECT_START.getTime();
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pct));

  const circumference = Math.PI * RADIUS;
  const dashOffset = circumference * (1 - pctClamped / 100);

  let color = "#4472C4";
  if (pct >= 100) color = "#0F9D58";
  else if (pct >= 85) color = "#C08A00";

  const needleRotation = (pctClamped / 100) * 180 - 90;

  const totalDays = Math.round(totalMs / 86400000);
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round(elapsedMs / 86400000)));
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[260px]">
        <svg viewBox="0 0 240 150" className="block w-full">
          <path d={describeArc()} fill="none" stroke="#EEF0F3" strokeWidth="18" strokeLinecap="round" />
          <path
            d={describeArc()}
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
          <line
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={CENTER_X}
            y2="45"
            stroke="#1F2937"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${needleRotation} ${CENTER_X} ${CENTER_Y})`}
            style={{ transformOrigin: `${CENTER_X}px ${CENTER_Y}px`, transition: "transform 0.6s ease" }}
          />
          <circle cx={CENTER_X} cy={CENTER_Y} r="7" fill="#1F2937" />
          <text x="20" y="146" fontSize="9" fill="#7C8698">
            Início
          </text>
          <text x="220" y="146" fontSize="9" fill="#7C8698" textAnchor="end">
            Previsão fim
          </text>
        </svg>
        <div className="absolute left-1/2 top-[66%] -translate-x-1/2 -translate-y-[30%] text-center">
          <div className="text-2xl font-bold text-slate-900">{Math.round(pct)}%</div>
          <div className="text-[10.5px] uppercase tracking-wide text-slate-500">tempo decorrido</div>
        </div>
      </div>
      <p className="mt-1 text-center text-[11.5px] leading-relaxed text-slate-500">
        Dia <b className="text-slate-900">{elapsedDays}</b> de <b className="text-slate-900">{totalDays}</b> · faltam{" "}
        <b className="text-slate-900">{remainingDays} dias</b>
        <br />
        Início: <b className="text-slate-900">{fmt(PROJECT_START)}</b> · Previsão fim:{" "}
        <b className="text-slate-900">{fmt(PROJECT_END)}</b>
      </p>
    </div>
  );
}
