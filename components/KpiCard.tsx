const TONE_BORDER: Record<string, string> = {
  default: "border-t-[#1F2937]",
  success: "border-t-[#0F9D58]",
  warning: "border-t-[#C08A00]",
  muted: "border-t-[#7C8698]",
  danger: "border-t-[#C00000]",
};

const TONE_VALUE_COLOR: Record<string, string> = {
  default: "text-[#1F2937]",
  success: "text-[#0F9D58]",
  warning: "text-[#C08A00]",
  muted: "text-[#7C8698]",
  danger: "text-[#C00000]",
};

export function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "muted" | "danger";
}) {
  return (
    <div className={`rounded-lg border border-[#E2E6ED] border-t-4 bg-white p-4 ${TONE_BORDER[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748A]">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${TONE_VALUE_COLOR[tone]}`}>{value}</p>
    </div>
  );
}
