"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

export function MonthBarChart({ counts }: { counts: { label: string; count: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config: ChartConfiguration<"bar"> = {
      type: "bar",
      data: {
        labels: counts.map((c) => c.label),
        datasets: [
          {
            data: counts.map((c) => c.count),
            backgroundColor: "#4472C4",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#EEF1F5" } },
          x: { grid: { display: false } },
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
    <div className="relative h-[260px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
