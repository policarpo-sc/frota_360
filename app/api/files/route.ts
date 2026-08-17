import { NextRequest, NextResponse } from "next/server";
import { listFolderContents } from "@/lib/drive";

function requireDocsFolderId(): string {
  const folderId = process.env.GOOGLE_DOCS_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DOCS_FOLDER_ID environment variable is not set");
  return folderId;
}

export async function GET(request: NextRequest) {
  try {
    const folderId = request.nextUrl.searchParams.get("folderId") ?? requireDocsFolderId();
    const files = await listFolderContents(folderId);
    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os arquivos." }, { status: 500 });
  }
}
