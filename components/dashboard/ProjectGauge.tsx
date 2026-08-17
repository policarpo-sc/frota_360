"use client";

const PROJECT_START = new Date(2026, 5, 1); // 01/06/2026
const RADIUS = 100;
const CENTER_X = 120;
const CENTER_Y = 130;

const PHASES = [
  { name: "Diagnóstico", days: 30, color: "#C00000" },
  { name: "Construção", days: 123, color: "#E8833A" },
  { name: "Treinamento", days: 61, color: "#F0C240" },
  { name: "Monitoramento", days: 31, color: "#4CAF6D" },
] as const;

const TOTAL_DAYS = PHASES.reduce((sum, p) => sum + p.days, 0);
const PROJECT_END = new Date(PROJECT_START.getTime() + TOTAL_DAYS * 86400000);

function polarToCartesian(angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + RADIUS * Math.cos(angleRad),
    y: CENTER_Y + RADIUS * Math.sin(angleRad),
  };
}

function arcPath(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function ProjectGauge() {
  const now = new Date();
  const elapsedMs = now.getTime() - PROJECT_START.getTime();
  const pct = TOTAL_DAYS > 0 ? (elapsedMs / (TOTAL_DAYS * 86400000)) * 100 : 0;
  const pctClamped = Math.max(0, Math.min(100, pct));
  const needleRotation = (pctClamped / 100) * 180 - 90;

  const elapsedDays = Math.max(0, Math.min(TOTAL_DAYS, Math.round(elapsedMs / 86400000)));

  let cumulative = 0;
  const segments = PHASES.map((phase) => {
    const startAngle = 180 + (cumulative / TOTAL_DAYS) * 180;
    cumulative += phase.days;
    const endAngle = 180 + (cumulative / TOTAL_DAYS) * 180;
    return { ...phase, startAngle, endAngle };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[260px]">
        <svg viewBox="0 0 240 150" className="block w-full">
          {segments.map((seg) => (
            <path
              key={seg.name}
              d={arcPath(seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
            />
          ))}
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
        </svg>
        <div className="absolute left-1/2 top-[66%] -translate-x-1/2 -translate-y-[30%] text-center">
          <div className="text-2xl font-bold text-slate-900">{Math.round(pctClamped)}%</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] text-slate-600">
        {PHASES.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </div>
        ))}
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        Dia {elapsedDays} de {TOTAL_DAYS} · {PROJECT_START.toLocaleDateString("pt-BR")} a{" "}
        {PROJECT_END.toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
