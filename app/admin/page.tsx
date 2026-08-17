import { NavBar } from "@/components/NavBar";
import { AdminClient } from "./AdminClient";

export default function AdminPage() {
  return (
    <>
      <NavBar role="admin" />
      <AdminClient />
    </>
  );
}
