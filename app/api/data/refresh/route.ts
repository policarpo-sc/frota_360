import { NextResponse } from "next/server";
import { getProjectData } from "@/lib/projectData";

export async function POST() {
  try {
    const data = await getProjectData({ forceRefresh: true });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os dados." }, { status: 500 });
  }
}
