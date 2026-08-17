import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { ArquivosClient } from "./ArquivosClient";
import type { UserRole } from "@/lib/types";

export default function ArquivosPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <ArquivosClient />
    </>
  );
}
