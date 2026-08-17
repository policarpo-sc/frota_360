import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { DashboardClient } from "./DashboardClient";
import type { UserRole } from "@/lib/types";

export default function DashboardPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <DashboardClient role={role} />
    </>
  );
}
