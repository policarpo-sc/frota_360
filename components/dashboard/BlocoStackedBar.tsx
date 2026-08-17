"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

const STATUS_ORDER = ["Concluída", "Em andamento", "Não Iniciado", "Atrasado"] as const;
const STATUS_COLORS: Record<string, string> = {
  "Concluída": "#0F9D58",
  "Em andamento": "#C08A00",
  "Não Iniciado": "#7C8698",
  Atrasado: "#C00000",
};

export interface BlocoCounts {
  bloco: string;
  counts: Record<string, number>;
}

export function BlocoStackedBar({ data }: { data: BlocoCounts[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const labels = data.map((d) => d.bloco);

    const config: ChartConfiguration<"bar"> = {
      type: "bar",
      data: {
        labels,
        datasets: STATUS_ORDER.map((status) => ({
          label: status,
          data: data.map((d) => d.counts[status] ?? 0),
          backgroundColor: STATUS_COLORS[status],
          stack: "s",
        })),
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: "#EEF1F5" } },
          y: { stacked: true, grid: { display: false } },
        },
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10.5 } } },
        },
      },
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div className="relative h-[320px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
