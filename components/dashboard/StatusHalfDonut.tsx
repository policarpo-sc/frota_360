"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

const STATUS_ORDER = ["Concluída", "Em andamento", "Atrasado", "Não Iniciado"] as const;
const STATUS_COLORS: Record<string, string> = {
  "Concluída": "#0F9D58",
  "Em andamento": "#C08A00",
  Atrasado: "#C00000",
  "Não Iniciado": "#7C8698",
};

export function StatusHalfDonut({ counts, showLegend = true }: { counts: Record<string, number>; showLegend?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const total = STATUS_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const data = STATUS_ORDER.map((s) => counts[s] ?? 0);

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: STATUS_ORDER as unknown as string[],
        datasets: [
          {
            data,
            backgroundColor: STATUS_ORDER.map((s) => STATUS_COLORS[s]),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        rotation: -90,
        circumference: 180,
        cutout: "65%",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed as number;
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${ctx.label}: ${value} (${pct}%)`;
              },
            },
          },
        },
      },
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [counts, total]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[130px] w-full max-w-[220px]">
        <canvas ref={canvasRef} />
      </div>
      {showLegend && (
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
