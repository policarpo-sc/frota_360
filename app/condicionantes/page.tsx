import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { CondicionantesClient } from "./CondicionantesClient";
import type { UserRole } from "@/lib/types";

export default function CondicionantesPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <CondicionantesClient role={role} />
    </>
  );
}
