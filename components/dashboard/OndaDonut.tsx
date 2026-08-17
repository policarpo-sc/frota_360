"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

const ONDA_PALETTE = ["#1F2937", "#6699CC", "#94A3B8", "#8B5CF6", "#0EA5E9", "#F59E0B"];

export function OndaDonut({ counts }: { counts: { label: string; value: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: counts.map((c) => c.label),
        datasets: [
          {
            data: counts.map((c) => c.value),
            backgroundColor: counts.map((_, i) => ONDA_PALETTE[i % ONDA_PALETTE.length]),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        cutout: "55%",
        responsive: true,
        maintainAspectRatio: false,
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
    <div className="relative mx-auto h-[220px] w-full max-w-[230px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
