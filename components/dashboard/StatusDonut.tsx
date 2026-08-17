"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

const STATUS_COLORS: Record<string, string> = {
  "Concluída": "#0F9D58",
  "Em andamento": "#C08A00",
  "Não Iniciado": "#7C8698",
  Atrasado: "#C00000",
};

export function StatusDonut({ counts }: { counts: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const labels = Object.keys(STATUS_COLORS);
    const data = labels.map((l) => counts[l] ?? 0);

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((l) => STATUS_COLORS[l]),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        },
      },
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [counts]);

  return (
    <div className="mx-auto h-[230px] w-[230px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
