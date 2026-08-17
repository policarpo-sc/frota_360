import { NextRequest, NextResponse } from "next/server";
import { getProjectData } from "@/lib/projectData";
import type { ProjectData } from "@/lib/types";

function redactForViewer(data: ProjectData): ProjectData {
  return {
    ...data,
    gente: data.gente.map((row) => ({ ...row, justificativa: "", comentarios: "" })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const data = await getProjectData();
    const role = request.headers.get("x-user-role");
    return NextResponse.json(role === "admin" ? data : redactForViewer(data));
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os dados." }, { status: 500 });
  }
}
