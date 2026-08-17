import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { AcoesClient } from "./AcoesClient";
import type { UserRole } from "@/lib/types";

export default function AcoesPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <AcoesClient />
    </>
  );
}
