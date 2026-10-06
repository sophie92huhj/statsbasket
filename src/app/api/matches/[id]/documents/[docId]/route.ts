import { NextResponse } from "next/server";
import { deleteMatchDocument, getMatchDocument } from "@/lib/repositories/matchDocument";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { docId } = await params;
  const document = await getMatchDocument(docId);
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  return new NextResponse(new Uint8Array(document.data), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { docId } = await params;
  await deleteMatchDocument(docId);
  return new NextResponse(null, { status: 204 });
}
