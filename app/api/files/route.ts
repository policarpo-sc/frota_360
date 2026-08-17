import { NextRequest, NextResponse } from "next/server";
import { listDriveFiles } from "@/lib/drive";

const TRACKED_FILE_KEYWORDS = ["Ações", "Acoes", "Gente", "Investimento"];

export async function GET(request: NextRequest) {
  try {
    const files = await listDriveFiles();
    const role = request.headers.get("x-user-role");
    if (role === "admin") return NextResponse.json(files);

    const restricted = files.filter((f) =>
      TRACKED_FILE_KEYWORDS.some((keyword) => f.name.includes(keyword))
    );
    return NextResponse.json(restricted);
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os arquivos." }, { status: 500 });
  }
}
