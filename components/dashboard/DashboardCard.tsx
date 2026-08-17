export function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E2E6ED] bg-white">
      <div className="bg-[#1F2937] px-4 py-2 text-[12.5px] font-semibold uppercase tracking-wide text-white">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
