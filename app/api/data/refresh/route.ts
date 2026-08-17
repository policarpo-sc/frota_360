import { NextResponse } from "next/server";
import { getProjectData } from "@/lib/projectData";

export async function POST() {
  const data = await getProjectData({ forceRefresh: true });
  return NextResponse.json(data);
}
